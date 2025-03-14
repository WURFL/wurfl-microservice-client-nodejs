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

// Use the commented require to refer local source code instead of client installed from NPM repo
// let wmclient = require('./src/app/wmclient')
let wmclient = require('wmclient')
const http = require("http")
const TEXT_SEPARATOR = '---------------------------------------------------------------------------------'
separate = function () {console.log(TEXT_SEPARATOR)}

// Example of using the WURFL Microservice Client
const example = async () => {
    console.log('Running with node version ' + process.version)
    // First we need to create a WM client instance, to connect to our WM server API at the specified host and port.
    let client
    try {
        client = await wmclient.create('http:', 'localhost', '8080', '')
    } catch (error) {
        console.log(`Error creating WURFL Microservice client: ${error.message}. Terminating example`)
        process.exit(1)
    }
    console.log('wm created, printing some data')
    console.log('Static capabilities loaded: ' + client.staticCaps.length)
    console.log('Virtual capabilities loaded: ' + client.virtualCaps.length + '\n')
    separate()
    // Get server info
    try {
        let info = await client.getInfo()
        console.log('Server info: \n')
        console.log('WURFL API version: ' + info.wurflAPIVersion)
        console.log('WM server version: ' + info.wmVersion)
        console.log('WURFL file info:' + info.wurflInfo + '\n')
    } catch (error) {
        console.log("Unable to load WURFL Info")
    }
    separate()
    // Perform a detection using a whole HTTP request to WM server API
    // When building a request object for node, headers must be lowercase, according to Node standard
    let req_headers = {
        'accept': 'text/html, application/xml;q=0.9, application/xhtml+xml, image/png, image/webp, image/jpeg, image/gif, image/x-xbitmap, */*;q=0.1',
        'accept-encoding': 'gzip, deflate',
        'accept-language': 'en',
        'device-stock-ua': 'Mozilla/5.0 (Linux; Android 8.1.0; SM-J610G Build/M1AJQ; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 Mobile Safari/537.36',
        'forwarded': 'for=\"110.54.224.195:36350\'',
        'referer': 'https://www.cram.com/flashcards/labor-and-delivery-questions-889210',
        'save-data': 'on',
        'user-agent': 'Opera/9.80 (Android; Opera Mini/51.0.2254/184.121; U; en) Presto/2.12.423 Version/12.16',
        'x-clacks-overhead': 'GNU ph',
        'x-forwarded-for': '110.54.224.195, 82.145.210.235',
        'x-operamini-features': 'advanced, camera, download, file_system, folding, httpping, pingback, routing, touch, viewport',
        'x-operamini-phone': 'Android #',
        'x-operamini-phone-Ua': 'Mozilla/5.0 (Linux; Android 8.1.0; SM-J610G Build/M1AJQ; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 Mobile Safari/537.36',
    }

    // Request refer a local WM server. Change the host and port to your WM server if needed
    let options = {
        protocol: 'http:',
        host: 'localhost',
        port: '8080',
        method: 'POST',
        path: '/',
    }

    let req = http.request(options)
    req.headers = req_headers
    req.end()

    // Get device info using wmclient
    let device
    try {
        device = await client.lookupRequest(req)
    }
    catch(error) {
        console.log('Error detecting device from given headers:  ' + error.message)
    }
    console.log('WURFL device id ' + device.capabilities['wurfl_id'] + '\n')
    console.log('DEVICE BRAND & MODEL')
    console.log(device.capabilities['brand_name'] + ' ' + device.capabilities['model_name'] + '\n')
    if (device.capabilities['is_smartphone'] === 'true') {
        console.log('This is a smartphone\n')
    }

    console.log('All received capabilities: \n')
    for (let key in device.capabilities) {
        if (device.capabilities.hasOwnProperty(key)) {
            console.log(key + ': ' + device.capabilities[key])
        }
    }
    separate()
    // Get some data using wmclient

    // Get all the device manufacturers, and print the first twenty returned
    let deviceMakes = await client.getAllDeviceMakes()
    let limit = 20
    console.log("Print the first " + limit + " Brand of " + deviceMakes.length)
    // Sort the device manufacturer names
    deviceMakes.sort()
    for (let i = 0; i < limit; i++) {
        console.log(" - " + deviceMakes[i])
    }
    separate()
    // Get all device model and marketing names produced by Apple
    let brandName = "Apple"
    try {
        let devsForMake = await client.getAllDevicesForMake(brandName)
        // Sort modelMktNames by their model name
        devsForMake.sort(compare)
        console.log("Print all Model for the Apple Brand")
        for (let i = 0; i < devsForMake.length; i++) {
            let n = " - " + devsForMake[i].modelName
            if (devsForMake[i].marketingName !== undefined) {
                n += devsForMake[i].marketingName
            }
            console.log(n)
        }
    } catch (error) {
        console.log(`Error looking for  models for device, brand ${error.message}`)
    }
    separate()
    // Get all operative system names
    let oses = await client.getAllOSes()
    // Sort and print all OS names
    console.log("Print the list of OSes")
    oses.sort()
    for (let i = 0; i < oses.length; i++) {
        console.log(" - " + oses[i])
    }

    // Get all Android OS versions
    let os = 'Android'
    try {
        let versions = await client.getAllVersionsForOS(os)
        // Sort all os version numbers and print them.
        separate()
        console.log(`Print all versions for the ${os} OS`)
        versions.sort()
        for (var i = 0; i < versions.length; i++) {
            console.log(" - " + versions[i])
        }
    }
    catch (error){
        console.log(`Error listing versions for ${os}  OS: ${error.message}`)
    }
}
// Run the example
example().then().catch()

// Comparator used to sort modelMktNames objects according to their model name property, for which is used the String natural ordering.
function compare(a, b) {
    let comparison = 0
    if (a.modelName > b.modelName) {
        comparison = 1
    } else if (a.modelName < b.modelName) {
        comparison = -1
    }
    return comparison
}
