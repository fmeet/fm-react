/*
Copyright 2020 FM Foundation
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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
import CallPreview from './CallPreview';
import { replaceableComponent } from "../../../utils/replaceableComponent";

interface IProps {

}

interface IState {

}

@replaceableComponent("views.voip.CallContainer")
export default class CallContainer extends React.PureComponent<IProps, IState> {
    public render() {
        return <div className="mx_CallContainer">
            <CallPreview />
        </div>;
    }
}
