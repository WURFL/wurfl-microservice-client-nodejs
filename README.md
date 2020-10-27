ScientiaMobile WURFL Microservice Client for NODE.JS
==============

WURFL Microservice (by ScientiaMobile, Inc.) is a mobile device detection service that can quickly and accurately detect over 500 capabilities of visiting devices. It can differentiate between portable mobile devices, desktop devices, SmartTVs and any other types of devices that have a web browser.

This is the Node.js Client API for accessing the WURFL Microservice. The API is released under Open-Source and can be integrated with other open-source or proprietary code. In order to operate, it requires access to a running instance of the WURFL Microservice product, such as:

- WURFL Microservice for Docker: https://www.scientiamobile.com/products/wurfl-microservice-docker-detect-device/

- WURFL Microservice for AWS: https://www.scientiamobile.com/products/wurfl-device-detection-microservice-aws/ 

- WURFL Microservice for Azure: https://www.scientiamobile.com/products/wurfl-microservice-for-azure/

- WURFL Microservice for Google Cloud Platform: https://www.scientiamobile.com/products/wurfl-microservice-for-gcp/

Example api use looking up a single UserAgent :

```javascript
// this must be used when executing the example by installing wmclient using  "npm install wmclient"
var client = require('wmclient');

console.log('Running with node version ' + process.version)

// First we need to create a WM client instance, to connect to our WM server API at the specified host and port.
client.create('http:', 'localhost', '8080', '', function (result, error) {
    if (error !== undefined) {
        // problems such as network errors  or internal server problems
        console.log('[ERROR]: ' + error.message);
        return;
    }

    // We ask Wm server API for some Wm server info such as server API version and info about WURFL API and file used by WM server.
    console.log('wm created, printing some data');
    console.log('Static capabilities loaded: ' + result.staticCaps.length);
    console.log('Virtual capabilities loaded: ' + result.virtualCaps.length + '\n');

    // Now, use the result wm client to invoke the getInfo function and print info from the server
    result.getInfo(function (info, error) {

        if(error!== undefined){
            console.log('[ERROR]: ' + error.message);
            return;
        }

        if (info !== undefined) {
            console.log('Server info: \n');
            console.log('WURFL API version: ' + info.wurflAPIVersion);
            console.log('WM server version: ' + info.wmVersion);
            console.log('WURFL file info:' + info.wurflInfo + '\n');

            var ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3';
            console.log('Getting device by User-Agent: ' + ua + '\n');
            // set the capabilities we want to receive from WM server
            result.setRequestedStaticCapabilities(['brand_name', 'model_name']);
            result.setRequestedVirtualCapabilities(['is_mobile', 'form_factor', 'is_smartphone', 'is_app']);
            // Perform a device detection calling WM server API
            result.lookupUserAgent(ua, function (device, error) {

                if (error !== undefined) {
                    console.log('[ERROR]: ' + error.message);
                    return;
                }

                // Let's get the device capabilities and print some of them
                console.log('WURFL device id ' + device.capabilities['wurfl_id'] + '\n');
                console.log('DEVICE BRAND & MODEL');
                console.log(device.capabilities['brand_name'] + ' ' + device.capabilities['model_name'] + '\n');
                if (device.capabilities['is_smartphone'] === 'true') {
                    console.log('This is a smartphone\n')
                }

                console.log('All received capabilities: \n')
                for (var key in device.capabilities) {
                    if (device.capabilities.hasOwnProperty(key)) {
                        console.log(key + ': ' + device.capabilities[key]);
                    }
                }
            });

            // Get all the device manufacturers, and print the first twenty
            result.getAllDeviceMakes(function (deviceMakes) {
                var limit = 20;
                console.log("Print the first " + limit + " Brand of " + deviceMakes.length);
                // Sort the device manufacturer names
                deviceMakes.sort();
                for (var i = 0; i < limit; i++) {
                    console.log(" - " + deviceMakes[i]);
                }
            });

            // Now call the WM server to get all device model and marketing names produced by Apple
            result.getAllDevicesForMake("Apple", function (error, modelMktNames) {
                if (error !== undefined) {
                    console.log('[ERROR]: ' + error.message);
                    return;
                }

                // Comparator used to sort modelMktNames objects according to their model name property, for which is used the String natural ordering.
                function compare(a, b) {
                    var comparison = 0;
                    if (a.modelName > b.modelName) {
                        comparison = 1;
                    } else if (a.modelName < b.modelName) {
                        comparison = -1;
                    }
                    return comparison;
                }

                // Sort $modelMktNames by their model name
                modelMktNames.sort(compare);
                console.log("Print all Model for the Apple Brand");
                for (var i = 0; i < modelMktNames.length; i++) {
                    console.log(" - " + modelMktNames[i].modelName + " " +  modelMktNames[i].marketingName);
                }
            });

            // Now call the WM server to get all operative system names
            result.getAllOSes(function (oses) {
                // Sort and print all OS names
                console.log("Print the list of OSes");
                oses.sort();
                for (var i = 0; i < oses.length; i++) {
                    console.log(" - " + oses[i]);
                }
            });

            // Let's call the WM server to get all version of the Android OS
            result.getAllVersionsForOS("Android", function (error, versions) {
                if (error !== undefined) {
                    console.log('[ERROR]: ' + error.message);
                    return;
                }
                // Sort all Android version numbers and print them.
                console.log("Print all versions for the Android OS");
                versions.sort();
                for (var i = 0; i < versions.length; i++) {
                    console.log(" - " + versions[i]);
                }
            });
        }
    });

});
```

All the calls to WM client API functions accept a callback function that handle a result parameter and an error one. If the error parameter has a value, there are no device data available and the message reports the cause that made the data unavailable (ie: you provided empty or invalid input, or there has been a connection issue between client and server).

Example api use looking up using all the HTTP headers:

```javascript
let req_headers = {
                'accept':'text/html, application/xml;q=0.9, application/xhtml+xml, image/png, image/webp, image/jpeg, image/gif, image/x-xbitmap, */*;q=0.1',
                'accept-encoding':'gzip, deflate',
                'accept-language':'en',
                'device-stock-ua':'Mozilla/5.0 (Linux; Android 8.1.0; SM-J610G Build/M1AJQ; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 Mobile Safari/537.36',
                'forwarded':'for=\"110.54.224.195:36350\'',
                'referer':'https://www.cram.com/flashcards/labor-and-delivery-questions-889210',
                'save-data':'on',
                'user-agent':'Opera/9.80 (Android; Opera Mini/51.0.2254/184.121; U; en) Presto/2.12.423 Version/12.16',
                'x-clacks-overhead':'GNU ph',
                'x-forwarded-for':'110.54.224.195, 82.145.210.235',
                'x-operamini-features':'advanced, camera, download, file_system, folding, httpping, pingback, routing, touch, viewport',
                'x-operamini-phone':'Android #',
                'x-operamini-phone-Ua':'Mozilla/5.0 (Linux; Android 8.1.0; SM-J610G Build/M1AJQ; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 Mobile Safari/537.36',
            };
            let options = {
                protocol: 'http:',
                host: 'localhost',
                port: '8080',
                method: 'POST',
                path: '/',
            };

            let req = http.request(options);
            req.headers = req_headers
            req.end();

            result.lookupRequest(req, function (device, error) {
                // handle result or error
            }
```
