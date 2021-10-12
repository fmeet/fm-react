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

function requireCanonicalAliasAccessToPublish(): boolean {
    // Some environments may not care about this requirement and could return false
    return true;
}

// This interface summarises all available customisation points and also marks
// them all as optional. This allows customisers to only define and export the
// customisations they need while still maintaining type safety.
export interface IDirectoryCustomisations {
    requireCanonicalAliasAccessToPublish?: typeof requireCanonicalAliasAccessToPublish;
}

// A real customisation module will define and export one or more of the
// customisation points that make up `IDirectoryCustomisations`.
export default {} as IDirectoryCustomisations;