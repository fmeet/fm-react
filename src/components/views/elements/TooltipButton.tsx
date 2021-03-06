/*
Copyright 2017 New FM Foundation.
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
import { replaceableComponent } from "../../../utils/replaceableComponent";
import Tooltip from './Tooltip';

interface IProps {
    helpText: React.ReactNode | string;
}

interface IState {
    hover: boolean;
}

@replaceableComponent("views.elements.TooltipButton")
export default class TooltipButton extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);
        this.state = {
            hover: false,
        };
    }

    private onMouseOver = () => {
        this.setState({
            hover: true,
        });
    };

    private onMouseLeave = () => {
        this.setState({
            hover: false,
        });
    };

    render() {
        const tip = this.state.hover ? <Tooltip
            className="mx_TooltipButton_container"
            tooltipClassName="mx_TooltipButton_helpText"
            label={this.props.helpText}
        /> : <div />;
        return (
            <div className="mx_TooltipButton" onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
                ?
                { tip }
            </div>
        );
    }
}
