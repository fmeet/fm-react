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
import { formatSeconds } from "../../../DateUtils";
import { replaceableComponent } from "../../../utils/replaceableComponent";

export interface IProps {
    seconds: number;
}

/**
 * Simply converts seconds into minutes and seconds. Note that hours will not be
 * displayed, making it possible to see "82:29".
 */
@replaceableComponent("views.audio_messages.Clock")
export default class Clock extends React.Component<IProps> {
    public constructor(props) {
        super(props);
    }

    shouldComponentUpdate(nextProps: Readonly<IProps>): boolean {
        const currentFloor = Math.floor(this.props.seconds);
        const nextFloor = Math.floor(nextProps.seconds);
        return currentFloor !== nextFloor;
    }

    public render() {
        return <span className='mx_Clock'>{ formatSeconds(this.props.seconds) }</span>;
    }
}
