/*
   Copyright 2019 ScientiaMobile Inc. http://www.scientiamobile.com

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

// sample usage: node massive_detection_example.js -f <path-of-file-with-user-agent-list>

// this must be used when executing directly from source code downloaded from git repo
let wm = require('./src/app/wmclient');
let fs = require('fs');
let readline = require('readline');

console.log('Running with node version ' + process.version)

// this must be used when executing the example by installing wmclient using  'npm install wmclient'
//let wm = require('wmclient');
let inputFilePath
let fIndex = process.argv.indexOf('-f');
if (fIndex !== -1) {
    inputFilePath = process.argv[fIndex + 1];
} else {
    console.log('Usage: ')
    console.log('node massive_detection_example.js -f <path-of-the-user-agents-file>');
    return;
}
const massiveDetection = async () => {
// Create the WM client, read the file and detect all the devices whose user-agents are inside the given file
    let client = await wm.create('http:', 'localhost', '8080', '')
    readFileAndDetect(client)

    function readFileAndDetect(client) {
        client.setCacheSize(100000);

        let start = Date.now()
        let i = 0

        console.log('Reading user-agents from file and detecting devices')

        let reader = readline.createInterface({
            input: fs.createReadStream(inputFilePath),
            terminal: false
        })

        reader.on('line', async function (line) {
            try{
                let device = await client.lookupUserAgent(line)
                let brandModel = device.capabilities['brand_name'] + ' ' + device.capabilities['model_name']
                if (brandModel.length > 1) {
                    console.log(`Detected device: ${ brandModel}`)
                } else {
                    console.log('Detected device: GENERIC')
                }
                i++
            }
            catch (error){
                console.log(error.message)
            }
        })
    }
}
massiveDetection().then().catch((error) => {
    console.log(`An error occurred during detection process: ${error.message}`)
})