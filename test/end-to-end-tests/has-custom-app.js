/*
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

// used from run.sh as getopts doesn't support long parameters
const idx = process.argv.indexOf("--app-url");
let hasAppUrl = false;
if (idx !== -1) {
    const value = process.argv[idx + 1];
    hasAppUrl = !!value;
}
process.stdout.write(hasAppUrl ? "1" : "0" );