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

import React from "react";
import { IRecordingUpdate, RECORDING_PLAYBACK_SAMPLES, VoiceRecording } from "../../../audio/VoiceRecording";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { arrayFastResample, arraySeed } from "../../../utils/arrays";
import Waveform from "./Waveform";
import { MarkedExecution } from "../../../utils/MarkedExecution";

interface IProps {
    recorder: VoiceRecording;
}

interface IState {
    waveform: number[];
}

/**
 * A waveform which shows the waveform of a live recording
 */
@replaceableComponent("views.audio_messages.LiveRecordingWaveform")
export default class LiveRecordingWaveform extends React.PureComponent<IProps, IState> {
    public static defaultProps = {
        progress: 1,
    };

    private waveform: number[] = [];
    private scheduledUpdate = new MarkedExecution(
        () => this.updateWaveform(),
        () => requestAnimationFrame(() => this.scheduledUpdate.trigger()),
    );

    constructor(props) {
        super(props);
        this.state = {
            waveform: arraySeed(0, RECORDING_PLAYBACK_SAMPLES),
        };
    }

    componentDidMount() {
        this.props.recorder.liveData.onUpdate((update: IRecordingUpdate) => {
            // The incoming data is between zero and one, so we don't need to clamp/rescale it.
            this.waveform = arrayFastResample(Array.from(update.waveform), RECORDING_PLAYBACK_SAMPLES);
            this.scheduledUpdate.mark();
        });
    }

    private updateWaveform() {
        this.setState({ waveform: this.waveform });
    }

    public render() {
        return <Waveform relHeights={this.state.waveform} />;
    }
}
