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

// PLEASE, notice that this is a server, so it will keep on running until you kill it or you make a GET request using the parameter shut=y

// this must be used when executing directly from source code downloaded from git repo
let wmclient = require('./src/app/wmclient');

// this must be used when executing the example by installing wmclient using  'npm install wmclient'
//var wmclient = require('wmclient');

let http = require('http');
let url = require('url');

console.log('Running with node version ' + process.version)

http.createServer(async (req, res) => {

    // First we need to create a WM client instance, to connect to our WM server API at the specified host and port.
    let client
    try {
        client = await wmclient.create('http:', 'localhost', '8080', '')

    } catch (error) {
        console.log(`Client creation failed, shutting down: ${error.message}`)
        process.exit()
    }

    // Perform a device detection calling WM server API using the current request
    let device
    try {
        device = await client.lookupRequest(req)
    } catch (error) {
        console.log(`Response error: ${error.message}`)
        res.writeHead(500, {'Content-Type': 'application/json'})
        res.write(`LOOKUP Error: ' ${error.message}`)
    }

    let url_parts = url.parse(req.url, true)
    let query = url_parts.query
    let shut = query['shut']
    // Let's get the device capabilities and print some of them
    console.log('Detected: ' + device.capabilities['brand_name'] + ' ' + device.capabilities['model_name'])
    // THIS sends the response to whichever tool you use to call this server (browser,postman or another piece of software
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write('LOOKUP REQUEST RESULT: ' + device.capabilities['brand_name'] + ' ' + device.capabilities['model_name'])
    res.end();

    if (shut !== undefined && shut === 'y') {
        console.log('Sent termination parameter: shutting down server')
        process.exit();
    }
}).
listen(19080)