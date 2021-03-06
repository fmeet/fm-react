/*
Copyright 2015, 2016 OpenMarket Ltd
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

import Skinner, { ISkinObject } from './Skinner';

export function loadSkin(skinObject: ISkinObject): void {
    Skinner.load(skinObject);
}

export function resetSkin(): void {
    Skinner.reset();
}

export function getComponent(componentName: string): any {
    return Skinner.getComponent(componentName);
}

// Import the js-sdk so the proper `request` object can be set. This does some
// magic with the browser injection to make all subsequent imports work fine.
import "matrix-js-sdk";

