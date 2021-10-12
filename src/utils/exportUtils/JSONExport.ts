/*
Copyright 2021 FM Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import Exporter from "./Exporter";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { formatFullDateNoDay, formatFullDateNoDayNoTime } from "../../DateUtils";
import { haveTileForEvent } from "../../components/views/rooms/EventTile";
import { ExportType } from "./exportUtils";
import { IExportOptions } from "./exportUtils";
import { EventType } from "matrix-js-sdk/src/@types/event";

export default class JSONExporter extends Exporter {
    protected totalSize = 0;
    protected messages: Record<string, any>[] = [];

    constructor(
        room: Room,
        exportType: ExportType,
        exportOptions: IExportOptions,
        setProgressText: React.Dispatch<React.SetStateAction<string>>,
    ) {
        super(room, exportType, exportOptions, setProgressText);
    }

    protected createJSONString(): string {
        const exportDate = formatFullDateNoDayNoTime(new Date());
        const creator = this.room.currentState.getStateEvents(EventType.RoomCreate, "")?.getSender();
        const creatorName = this.room?.getMember(creator)?.rawDisplayName || creator;
        const topic = this.room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent()?.topic || "";
        const exporter = this.client.getUserId();
        const exporterName = this.room?.getMember(exporter)?.rawDisplayName || exporter;
        const jsonObject = {
            room_name: this.room.name,
            room_creator: creatorName,
            topic,
            export_date: exportDate,
            exported_by: exporterName,
            messages: this.messages,
        };
        return JSON.stringify(jsonObject, null, 2);
    }

    protected async getJSONString(mxEv: MatrixEvent) {
        if (this.exportOptions.attachmentsIncluded && this.isAttachment(mxEv)) {
            try {
                const blob = await this.getMediaBlob(mxEv);
                if (this.totalSize + blob.size < this.exportOptions.maxSize) {
                    this.totalSize += blob.size;
                    const filePath = this.getFilePath(mxEv);
                    if (this.totalSize == this.exportOptions.maxSize) {
                        this.exportOptions.attachmentsIncluded = false;
                    }
                    this.addFile(filePath, blob);
                }
            } catch (err) {
                console.log("Error fetching file: " + err);
            }
        }
        const jsonEvent: any = mxEv.toJSON();
        const clearEvent = mxEv.isEncrypted() ? jsonEvent.decrypted : jsonEvent;
        return clearEvent;
    }

    protected async createOutput(events: MatrixEvent[]) {
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            this.updateProgress(`Processing event ${i + 1} out of ${events.length}`, false, true);
            if (this.cancelled) return this.cleanUp();
            if (!haveTileForEvent(event)) continue;
            this.messages.push(await this.getJSONString(event));
        }
        return this.createJSONString();
    }

    public async export() {
        console.info("Starting export process...");
        console.info("Fetching events...");

        const fetchStart = performance.now();
        const res = await this.getRequiredEvents();
        const fetchEnd = performance.now();

        console.log(`Fetched ${res.length} events in ${(fetchEnd - fetchStart)/1000}s`);

        console.info("Creating output...");
        const text = await this.createOutput(res);

        if (this.files.length) {
            this.addFile("export.json", new Blob([text]));
            await this.downloadZIP();
        } else {
            const fileName = `matrix-export-${formatFullDateNoDay(new Date())}.json`;
            this.downloadPlainText(fileName, text);
        }

        const exportEnd = performance.now();

        if (this.cancelled) {
            console.info("Export cancelled successfully");
        } else {
            console.info("Export successful!");
            console.log(`Exported ${res.length} events in ${(exportEnd - fetchStart)/1000} seconds`);
        }

        this.cleanUp();
    }
}
