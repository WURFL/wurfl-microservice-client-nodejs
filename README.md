ScientiaMobile WURFL Microservice Client for NODE.JS
==============

WURFL Microservice (by ScientiaMobile, Inc.) is a mobile device detection service that can quickly and accurately detect over 500 capabilities of visiting devices. It can differentiate between portable mobile devices, desktop devices, SmartTVs and any other types of devices that have a web browser.

This is the Node.js Client API for accessing the WURFL Microservice. The API is released under Open-Source and can be integrated with other open-source or proprietary code. In order to operate, it requires access to a running instance of the WURFL Microservice product, such as:

- WURFL Microservice for Docker: https://www.scientiamobile.com/products/wurfl-microservice-docker-detect-device/

- WURFL Microservice for AWS: https://www.scientiamobile.com/products/wurfl-device-detection-microservice-aws/ 

- WURFL Microservice for Azure: https://www.scientiamobile.com/products/wurfl-microservice-for-azure/

- WURFL Microservice for Google Cloud Platform: https://www.scientiamobile.com/products/wurfl-microservice-for-gcp/

## Version 3.0.0: rewritten from the ground up!

Version 3.0.0 has been completely rewritten to replace callbacks with async/await approach. Every client API function remains the same, except
for the provided callback function, that is no longer accepted.

As a consequence, **applications written using WM client versions prior to 3.0.0, in order to use the new version, will have to be modified to use async/await** or handle promises 
(see paragraph 'Using promises')

For example, in versions before 3.0.0 you could get the WM server info doing:

```javascript
client.getInfo(function (info, error) {
    // do something...
}
```

from version 3.0.0 on, you will have to do

```javascript
let info = await client.getInfo()
// do something
```

## API usage

Example api usage:

```javascript
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
    // Perform a detection using passing a whole HTTP request to WM server API
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
    // Get all the device manufacturers, and print the first twenty
    let deviceMakes = await client.getAllDeviceMakes()
    let limit = 20
    console.log("Print the first " + limit + " Brand of " + deviceMakes.length)
    // Sort the device manufacturer names
    deviceMakes.sort()
    for (let i = 0; i < limit; i++) {
        console.log(" - " + deviceMakes[i])
    }
    separate()
    // Now call the WM server to get all device model and marketing names produced by Apple
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
    // Now call the WM server to get all operative system names
    let oses = await client.getAllOSes()
    // Sort and print all OS names
    console.log("Print the list of OSes")
    oses.sort()
    for (let i = 0; i < oses.length; i++) {
        console.log(" - " + oses[i])
    }

    // Let's call the WM server to get all version of the Android OS
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
```
### Using promises
If you prefer using Promises over async/await approach, you can do it like this:

```javascript
const wmclient = require('wmclient')
const clientPromise = wmclient.create('http:', 'localhost','8080','')
clientPromise.then((client) => {
    let userAgent = 'Mozilla/5.0 (Linux; Android 10; GM1911 Build/QKQ1.190716.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.106 Mobile Safari/537.36 Instagram 146.0.0.27.125 Android (29/10; 560dpi; 1440x3064; OnePlus; GM1911; OnePlus7Pro; qcom; en_US; 221134037)'
    let device_promise = client.lookupUserAgent(userAgent)
    device_promise.then((device) => {
        console.log(`Detected device ${device.capabilities['brand_name']} ${device.capabilities['model_name']}`)
    }).catch((error) => {
        console.log('ERROR: ' + error.message)
    })
})
```