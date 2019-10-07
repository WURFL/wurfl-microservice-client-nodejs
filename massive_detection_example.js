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
var wm = require('./src/app/wmclient');
var fs = require('fs');
var readline = require('readline');

console.log('Running with node version ' + process.version)

// this must be used when executing the example by installing wmclient using  'npm install wmclient'
//var wm = require('wmclient');

var fIndex = process.argv.indexOf('-f');
if (fIndex !== -1) {
    var inputFilePath = process.argv[fIndex + 1];
}
else {
    console.log('Usage: ')
    console.log('node massive_detection_example.js -f <path-of-the-user-agents-file>');
    return;
}

// Create the WM client, read the file and detect all the devices whose user-agents are inside the given file
var client;
wm.create('http:', 'localhost', '8080', '', readFileAndDetect);

function readFileAndDetect(client, error) {

    client.setCacheSize(100000);

    var start = Date.now();
    var i = 0;

    if (error !== undefined) {
        console.error('[ERROR]: ' + error.message)
    }

    console.log('Reading user-agents from file and detecting devices');

    var reader = readline.createInterface({
        input: fs.createReadStream(inputFilePath),
        terminal: false
    });

    reader.on('line', function (line) {
        client.lookupUserAgent(line, function (device, error) {
            if (error !== undefined) {
                console.error('[ERROR]: ' + error.message);
                return;
            }
            else {
                var brandModel = device.capabilities['brand_name'] + ' ' + device.capabilities['model_name'];
                if (brandModel.length > 1) {
                    console.log('Detected device: ' + brandModel);
                }
                else {
                    console.log('Detected device: GENERIC');
                }
                i++;

                if(i === 100000){
                    console.log("Read and detect executed in " + (Date.now() - start) + " milliseconds");
                }
            }
        });
    });
}