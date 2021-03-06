/*
Copyright 2016 OpenMarket Ltd
Copyright 2017 Travis Ralston
Copyright 2018, 2019 New FM Foundation
Copyright 2019 FM Foundation

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

import React from 'react';
import { _t, _td } from '../../../languageHandler';
import SettingsStore from "../../../settings/SettingsStore";
import dis from "../../../dispatcher/dispatcher";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { Action } from "../../../dispatcher/actions";
import { SettingLevel } from "../../../settings/SettingLevel";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { Room } from "matrix-js-sdk/src/models/room";
import SettingsFlag from "../elements/SettingsFlag";

interface IProps {
    room: Room;
}

@replaceableComponent("views.room_settings.UrlPreviewSettings")
export default class UrlPreviewSettings extends React.Component<IProps> {
    private onClickUserSettings = (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        dis.fire(Action.ViewUserSettings);
    };

    public render(): JSX.Element {
        const roomId = this.props.room.roomId;
        const isEncrypted = MatrixClientPeg.get().isRoomEncrypted(roomId);

        let previewsForAccount = null;
        let previewsForRoom = null;

        if (!isEncrypted) {
            // Only show account setting state and room state setting state in non-e2ee rooms where they apply
            const accountEnabled = SettingsStore.getValueAt(SettingLevel.ACCOUNT, "urlPreviewsEnabled");
            if (accountEnabled) {
                previewsForAccount = (
                    _t("You have <a>enabled</a> URL previews by default.", {}, {
                        'a': (sub)=><a onClick={this.onClickUserSettings} href=''>{ sub }</a>,
                    })
                );
            } else {
                previewsForAccount = (
                    _t("You have <a>disabled</a> URL previews by default.", {}, {
                        'a': (sub)=><a onClick={this.onClickUserSettings} href=''>{ sub }</a>,
                    })
                );
            }

            if (SettingsStore.canSetValue("urlPreviewsEnabled", roomId, SettingLevel.ROOM)) {
                previewsForRoom = (
                    <label>
                        <SettingsFlag
                            name="urlPreviewsEnabled"
                            level={SettingLevel.ROOM}
                            roomId={roomId}
                            isExplicit={true}
                        />
                    </label>
                );
            } else {
                let str = _td("URL previews are enabled by default for participants in this room.");
                if (!SettingsStore.getValueAt(SettingLevel.ROOM, "urlPreviewsEnabled", roomId, /*explicit=*/true)) {
                    str = _td("URL previews are disabled by default for participants in this room.");
                }
                previewsForRoom = (<label>{ _t(str) }</label>);
            }
        } else {
            previewsForAccount = (
                _t("In encrypted rooms, like this one, URL previews are disabled by default to ensure that your " +
                    "homeserver (where the previews are generated) cannot gather information about links you see in " +
                    "this room.")
            );
        }

        const previewsForRoomAccount = ( // in an e2ee room we use a special key to enforce per-room opt-in
            <SettingsFlag name={isEncrypted ? 'urlPreviewsEnabled_e2ee' : 'urlPreviewsEnabled'}
                level={SettingLevel.ROOM_ACCOUNT}
                roomId={roomId} />
        );

        return (
            <div>
                <div className='mx_SettingsTab_subsectionText'>
                    { _t('When someone puts a URL in their message, a URL preview can be shown to give more ' +
                        'information about that link such as the title, description, and an image from the website.') }
                </div>
                <div className='mx_SettingsTab_subsectionText'>
                    { previewsForAccount }
                </div>
                { previewsForRoom }
                <label>{ previewsForRoomAccount }</label>
            </div>
        );
    }
}
