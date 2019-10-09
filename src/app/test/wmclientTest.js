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
var asrt = require('chai').assert;
var wmClient = require('../wmclient');
var http = require('http');

var client;

// Main suite
describe('WM Client tests', function () {

    this.timeout(10000);
    // initialize a client to reuse
    before(function () {
        // log running node version for tests
        console.log('Running on node v ' + process.version);
        wmClient.create('http:', 'localhost', '8080', '', function (result) {
            client = result;
        });
    });

    // test that don't use the shared client
    describe('#Create successful', function () {
        it('should pass when schema, host and port are provided', function (done) {
            wmClient.create('http:', 'localhost', '8080', '', function (result) {
                asrt.isAbove(result.importantHeaders.length, 0);
                asrt.isAbove(result.virtualCaps.length, 0);              
                asrt.isAbove(result.staticCaps.length, 0);
                done();
            });
        });

        it('should pass when schema is provided without the column', function (done) {
            wmClient.create('http', 'localhost', '8080', '', function (result) {
                asrt.isAbove(result.importantHeaders.length, 0);
                asrt.isAbove(result.virtualCaps.length, 0);
                asrt.isAbove(result.staticCaps.length, 0);
                done();
            });
        });

        it('should pass when schema is not passed, defaulting to http', function (done) {
            wmClient.create('', 'localhost', '8080', '', function (result) {
                asrt.isAbove(result.importantHeaders.length, 0);
                asrt.isAbove(result.virtualCaps.length, 0);
                asrt.isAbove(result.staticCaps.length, 0);
                done();
            });
        });

        it('should pass when host is not passed, defaulting to localhost', function (done) {
            wmClient.create('http:', '', '8080', '', function (result) {
                asrt.isAbove(result.importantHeaders.length, 0);
                asrt.isAbove(result.virtualCaps.length, 0);
                asrt.isAbove(result.staticCaps.length, 0);
                done();
            });
        });
    });

    describe('#Create failure', function () {
        it('should throw error when protocol is not supported', function (done) {
            // Since assert.throws needs the reference to a parameterless function, we wrap create into it.
            var wrapper = function () {
                wmClient.create('smtp', 'localhost', '8080', '', function () {
                });
            };

            asrt.throws(wrapper, 'smtp:', 'not supported');
            done();
        });

        it('should throw error when schema, host and port are all empty', function (done) {

            wmClient.create('', '', '', '',

                function (undefined, error) {
                    asrt.isOk(error);
                    asrt.isTrue(error.message.indexOf('ECONNREFUSED')!==-1);
                    done();

                });
        });
        it('should throw error when host is wrong', function (done) {

            wmClient.create('http:', 'wrong_host', '8080', '',

                function (undefined, error) {
                    asrt.isOk(error);
                    asrt.isTrue(error.message.indexOf('ENOTFOUND')!==-1);

                });
            done();
        });
    });

    describe('#HasStaticCapability', function () {
        it('should return true when capability is exposed by the WM server, false otherwise', function (done) {
            wmClient.create('http:', 'localhost', '8080', '', function (result) {
                asrt.isOk(result.hasStaticCapability('brand_name'));
                asrt.isOk(result.hasStaticCapability('model_name'));
                asrt.isOk(result.hasStaticCapability('is_wireless_device'));
                // this is a virtual capability, so it shouldn't be returned
                asrt.isNotOk(result.hasStaticCapability('is_app'));
                // This doesn't exist
                asrt.isNotOk(result.hasStaticCapability('nonexisting_cap'));
                done();
            });
        });
    });

    describe('#HasVirtualCapability', function () {
        it('should return true when a virtual capability is exposed by the WM server, false otherwise', function (done) {
            wmClient.create('http:', 'localhost', '8080', '', function (result) {
                asrt.isOk(result.hasVirtualCapability('is_app'));
                asrt.isOk(result.hasVirtualCapability('is_smartphone'));
                asrt.isOk(result.hasVirtualCapability('form_factor'));
                asrt.isOk(result.hasVirtualCapability('is_app_webview'));
                // this is a static capability, so it shouldn't be returned
                asrt.isNotOk(result.hasVirtualCapability('brand_name'));
                // This doesn't exist
                asrt.isNotOk(result.hasVirtualCapability('nonexisting_vcap'));
                done();
            });
        });
    });

    describe('#Get server info', function () {
        it('should return WM server info when called', function (done) {

            client.getInfo(function (info, error) {
                asrt.isUndefined(error);
                asrt.isOk(info);
                asrt.isOk(info.wurflAPIVersion);
                asrt.isAbove(info.importantHeaders.length, 0);
                asrt.isTrue(info.staticCaps.length > 0);
                asrt.isTrue(info.virtualCaps.length > 0);
                // this is something that can be specified later, so now they are undefined
                asrt.isNotOk(info.reqStaticCaps);
                asrt.isNotOk(info.reqVCaps);
                asrt.isOk(info.ltime);
                done();
            });
        });
    });

    describe('#Lookup device id successful', function () {
        it('should return device data with all the available capabilities', function (done) {

            client.lookupDeviceID('nokia_generic_series40', function (device, error) {
                asrt.isOk(device);
                asrt.isUndefined(error);
                asrt.equal(device.capabilities['brand_name'], 'Nokia');
                asrt.equal('1', device.capabilities['xhtml_support_level']);
                asrt.equal('128', device.capabilities['resolution_width']);
                asrt.isAbove(client.getCapabilityCount(device), 0);
                asrt.isOk(device.ltime);
                done();
            });

        });
        it('should return device data with the selected capability values', function (done) {

            client.setRequestedStaticCapabilities(['brand_name', 'model_name', 'xhtml_support_level']);
            client.setRequestedVirtualCapabilities(['is_app']);
            client.lookupDeviceID('nokia_generic_series40', function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                asrt.equal(device.capabilities['brand_name'], 'Nokia');
                asrt.equal('1', device.capabilities['xhtml_support_level']);
                asrt.isNotOk(device.capabilities['resolution_width']);
                asrt.equal(client.getCapabilityCount(device), 5);
                // reset these values
                client.setRequestedStaticCapabilities([]);
                client.setRequestedVirtualCapabilities([]);
                asrt.isOk(device.ltime);
                done();
            });

        });
        it('should throw an error with message if device does not exist in server', function (done) {

                client.lookupDeviceID('google_unexisting_id', function (device, error) {

                        asrt.isOk(error);
                        asrt.isUndefined(device);
                        asrt.equal(client.getCapabilityCount(device), 0);
                        asrt.isNotEmpty(error.message);
                        done();
            });
        });
    });

    describe('#GetCapabilityCount', function () {
        it('should return the number of capabilities loaded in device', function (done) {

            client.lookupDeviceID('nokia_generic_series40', function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                var capCount = client.getCapabilityCount(device);
                asrt.isAbove(capCount, 0);
                done();
            });
        });
        it('should return zero when device is undefined', function (done) {
            asrt.equal(client.getCapabilityCount(undefined), 0);
            done();
        });
        it('should return zero when device capabilities property is undefined', function (done) {
            var device = {'property': 'test'};
            asrt.equal(client.getCapabilityCount(device), 0);
            done();
        });
    });


    describe('#Lookup user agent', function () {
        it('should return device data with all the available capabilities', function (done) {

            client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36', function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                asrt.equal(device.capabilities['brand_name'], 'Asus');
                asrt.equal('4', device.capabilities['xhtml_support_level']);
                asrt.equal('1080', device.capabilities['resolution_width']);
                asrt.equal(device.capabilities['wurfl_id'], 'asus_z017d_ver1');
                asrt.isAbove(client.getCapabilityCount(device), 0);
                asrt.isOk(device.ltime);
                asrt.isAbove(device.mtime, 0);
                done();
            });
        });
        it('should return device data with the set of chosen capabilities', function (done) {

            client.setRequestedStaticCapabilities(['brand_name', 'model_name', 'xhtml_support_level']);
            client.setRequestedVirtualCapabilities(['is_app']);
            client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36', function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                asrt.equal(device.capabilities['brand_name'], 'Asus');
                asrt.equal(device.capabilities['model_name'], 'Z017D');
                asrt.equal('4', device.capabilities['xhtml_support_level']);
                asrt.equal(device.capabilities['wurfl_id'], 'asus_z017d_ver1');
                asrt.equal(device.capabilities['is_app'], 'false');
                asrt.equal(client.getCapabilityCount(device), 5);

                // These caps have not been defined
                asrt.equal(undefined, device.capabilities['resolution_width']);
                asrt.equal(undefined, device.capabilities['is_app_webview']);
                asrt.isAbove(device.mtime, 0);
                asrt.isOk(device.APIVersion);
                client.setRequestedStaticCapabilities([]);
                client.setRequestedVirtualCapabilities([]);
                done();
            });
        });
        it('should return an undefined device and an error with message when empty user agent is provided', function (done) {

            client.lookupUserAgent('', function (device, error) {
                asrt.isUndefined(device);
                asrt.isOk(error);
                asrt.isOk(error.message.indexOf('No User-Agent header provided') !== -1);
                done();
            });
        });
    });

    describe('#Lookup Request', function () {
        it('should return a device with all the available capabilities', function (done) {

            // In order to emulate node js behaviour we must lowercase (see: https://nodejs.org/docs/latest-v0.10.x/api/http.html) "Keys are lowercased. Values are not modified"
            var hs = {
                'content-Type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/539.36',
                'accept-encoding': 'gzip, deflate'
            };
            var options = {
                protocol: 'http:',
                host: 'localhost',
                port: '8080',
                method: 'POST',
                path: '/',
            };
            var req = http.request(options);
            req.headers = hs;
            req.end();
            client.lookupRequest(req, function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                asrt.isAbove(client.getCapabilityCount(device), 0);
                asrt.equal('asus_z017d_ver1', device.capabilities['wurfl_id']);
                asrt.equal(device.capabilities['brand_name'], 'Asus');
                asrt.equal(device.capabilities['model_name'], 'Z017D');
                asrt.equal(device.capabilities['is_app'], 'false');
                asrt.equal(device.capabilities['is_wireless_device'], 'true');
                asrt.equal(device.capabilities['is_ios'], 'false');
                asrt.isOk(device.APIVersion);
                asrt.isAbove(device.mtime, 0);
                done();
            });
        });
        it('should return an undefined device and an error with message', function (done) {
            var options = {
                protocol: 'http:',
                host: 'localhost',
                port: '8080',
                method: 'POST',
                path: '/',
            };
            var req = http.request(options);
            req.headers = [];
            req.end();
            client.lookupRequest(req, function (device, error) {
                asrt.isOk(error);
                asrt.isUndefined(device);
                asrt.isTrue(error.message.indexOf("No User-Agent")!==-1);
                done();
            });
        });
        it('should return a device with the chosen capabilities', function (done) {

            client.setRequestedStaticCapabilities(['brand_name', 'pointing_method']);
            client.setRequestedVirtualCapabilities(['is_app', 'form_factor']);
            // In order to emulate node js behaviour we must lowercase (see: https://nodejs.org/docs/latest-v0.10.x/api/http.html) "Keys are lowercased. Values are not modified"
            var hs = {
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36',
                'accept-encoding': 'gzip, deflate'
            };
            var options = {
                protocol: 'http:',
                host: 'localhost',
                port: '8080',
                method: 'POST',
                path: '/',
            };
            var req = http.request(options);
            req.headers = hs;
            req.end();
            client.lookupRequest(req, function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                asrt.isOk(client.getCapabilityCount(device) === 5);
                asrt.equal('asus_z017d_ver1', device.capabilities['wurfl_id']);
                asrt.equal(device.capabilities['brand_name'], 'Asus');
                asrt.equal(device.capabilities['pointing_method'], 'touchscreen');
                asrt.equal(device.capabilities['is_app'], 'false');
                asrt.equal(device.capabilities['form_factor'], 'Smartphone');
                // This capability is not included in the filter
                asrt.isNotOk(device.capabilities['is_ios']);
                asrt.isOk(device.APIVersion);
                asrt.isAbove(device.mtime, 0);
                done();
            });
            client.setRequestedStaticCapabilities([]);
            client.setRequestedVirtualCapabilities([]);
        });
        it('should return an error is server is not available', function (done) {

            client.port = 9090;

            // In order to emulate node js behaviour we must lowercase (see: https://nodejs.org/docs/latest-v0.10.x/api/http.html) "Keys are lowercased. Values are not modified"
            var hs = {
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36',
                'accept-encoding': 'gzip, deflate'
            };
            var options = {
                protocol: 'http:',
                host: 'localhost',
                port: '8080',
                method: 'POST',
                path: '/',
            };
            var req = http.request(options);
            req.headers = hs;
            req.end();
            client.lookupRequest(req, function (device, error) {
                asrt.isNotOk(device);
                asrt.isOk(error, device);
                done();
            });
            client.port = 8080;
        });

    });
    describe('#setRequestedCapability', function () {
        it('assign each capability in the given array to the proper specific array of static or virtual capabilities', function (done) {
            client.setRequestedCapabilities(["is_app", "pointing_method", "brand_name", "model_name", "form_factor", "is_robot", "is_wireless_device"]);
            asrt.deepEqual(client.reqStaticCaps, ['pointing_method', 'brand_name','model_name', 'is_wireless_device']);
            asrt.deepEqual(client.reqVCaps, ['is_app', 'form_factor','is_robot']);
            done();
        });
        it('should discard non existing capability names when setting the required capabilities arrays', function (done) {
            client.setRequestedStaticCapabilities(['brand_name', 'model_name', 'xhtml_support_level', 'wrong_cap']);
            client.setRequestedVirtualCapabilities(['is_app','wrong_vcap', 'wrong_vcap 2']);
            client.lookupDeviceID('nokia_generic_series40', function (device, error) {
                asrt.isUndefined(error);
                asrt.isOk(device);
                var capCount = client.getCapabilityCount(device);
                // depending on which wurfl file you use (eval or full)
                asrt.isTrue(capCount === 5);
                client.setRequestedStaticCapabilities(undefined);
                client.lookupDeviceID('nokia_generic_series40', function (device, error) {
                    capCount = client.getCapabilityCount(device);
                    asrt.isTrue(capCount === 2);
                    done();
                });
                // reset capabilities
                client.setRequestedCapabilities(["is_app", "pointing_method", "brand_name", "model_name", "form_factor", "is_robot", "is_wireless_device"]);

            });

        });
    });
    describe('#setCacheSize', function () {
        it('should create the caches with the given size for storing devices', function (done) {
            client.setCacheSize(1000);
            client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36', function (device, error) {
                asrt.isOk(device);
                asrt.equal(1, client.uaCache.itemCount);

                client.lookupDeviceID('google_pixel_xl_ver1', function (device) {
                    asrt.isOk(device);
                    asrt.equal(client.devIdCache.itemCount, 1);
                    // This should NOT reset cache because ltime is not changed
                    client.clearCachesIfNeeded(device.ltime, client);
                    asrt.equal(1, client.uaCache.itemCount);
                    asrt.equal(1, client.devIdCache.itemCount);
                    //console.log(client.devIdCache.itemCount);

                    client.clearCachesIfNeeded("2199-12-31", client);
                    // Now ltime has changed, so caches are cleared
                    asrt.equal(0, client.uaCache.itemCount);
                    asrt.equal(0, client.devIdCache.itemCount);
                    //console.log(client.devIdCache.itemCount);
                    done();
                });
            });

        });
    });
    describe('#clearCaches', function () {
        it('should remove all elements from both caches', function (done) {
            client.lookupDeviceID('google_pixel_xl_ver1', function (device) {
                asrt.isOk(device);
                asrt.equal(1, client.devIdCache.itemCount);
                client.clearCaches();
                asrt.equal(0, client.uaCache.itemCount);
                asrt.equal(0, client.devIdCache.itemCount);
                done();
            });
        });
    });
    describe('#clearCachesIfNeeded', function () {
        it('on lookup methods, should remove all elements from both caches only if the server\'s load time changes', function () {
            client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36', function () {
                asrt.equal(1, client.uaCache.itemCount);
            });
            client.lookupDeviceID('google_pixel_xl_ver1', function (device) {
                asrt.equal(client.devIdCache.itemCount, 1);
                // This should NOT reset cache because ltime is not changed
                client.clearCachesIfNeeded(device.ltime);
                asrt.equal(1, client.uaCache.itemCount);
                asrt.equal(1, client.devIdCache.itemCount);
                client.clearCachesIfNeeded("2199-12-31");
                // Now ltime has changed, so caches are cleared
                asrt.equal(0, client.uaCache.itemCount);
                asrt.equal(0, client.devIdCache.itemCount);
            });
        });
        it('on info method, should remove all elements from both caches only if server\'s load time changes', function (done) {
            client.lookupDeviceID('google_pixel_xl_ver1', function () {
                asrt.equal(client.devIdCache.itemCount, 1);
                client.ltime = "1999-12-31"; // force client ltime to trigger cache reset
                client.getInfo(function (info) {
                    asrt.isOk(info);
                    // getInfo will have real ltime from server, so cache should be reset
                    asrt.equal(client.devIdCache.itemCount, 0);
                    done();
                });
            });
        });
    });
    describe('#getAllDeviceMakes', function () {
        it('should retrieve a json array holding all device make', function (done) {
            client.getAllDeviceMakes(function (modelMktName) {
                asrt.isOk(modelMktName);
                asrt.isArray(modelMktName);
                asrt.isOk(modelMktName[0]);
                asrt.isAtLeast(modelMktName.length, 2000);
                // deviceMakesMap cache has been set
                asrt.isAtLeast(Object.keys(client.deviceMakesMap).length, 2000);
                done();
            });
        });
    });
    describe('#getAllDevicesForMake', function () {
        it('should retrieve an array of an aggregate containing model_names + marketing_names for the given Make', function (done) {
            client.getAllDevicesForMake("Nokia", function (err, modelMktName) {
                asrt.isUndefined(err);
                asrt.isOk(modelMktName);
                asrt.isArray(modelMktName);
                asrt.notEmpty(modelMktName[0].modelName);
                asrt.isUndefined(modelMktName[0].marketingName);
                asrt.isAtLeast(modelMktName.length, 700);
                done();
            });
        });
        it('should throw an error for the given Make if not exists', function (done) {
            client.getAllDevicesForMake("NotExists", function (err, modelMktName) {
                asrt.instanceOf(err, Error);
                done();
            });
        });
    });

    describe('#getAllOSes', function () {
        it('should retrieve a json array holding all devices device_os capabilities', function (done) {
            client.getAllOSes(function (deviceOses) {
                asrt.isOk(deviceOses);
                asrt.isArray(deviceOses);
                asrt.isOk(deviceOses[0]);
                asrt.isAtLeast(deviceOses.length, 30);
                // deviceOsVerMap cache has been set
                asrt.isAtLeast(Object.keys(client.deviceOsVerMap).length, 30);
                done();
            });
        });
    });

    describe('#getAllVersionsForOS', function () {
        it('should retrieve an array of all devices device_os_version for a given device_os cap', function (done) {
            client.getAllVersionsForOS("Android", function (err, deviceOsVersions) {
                asrt.isUndefined(err);
                asrt.isOk(deviceOsVersions);
                asrt.isArray(deviceOsVersions);
                asrt.isAtLeast(deviceOsVersions.length, 30);
                // WPC-154: client must strip empty OS versions from array
                asrt.isNotOk(arrayIncludes(deviceOsVersions,""));
                done();
            });
        });
        it('should throw an error for the given Os if not exists', function (done) {
            client.getAllVersionsForOS("NotExists", function (err, modelMktName) {
                asrt.instanceOf(err, Error);
                done();
            });
        });
    });
}); // End of test suite

function arrayIncludes(arr, text) {
    if (arr !== undefined) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === text){
                return true;
            }
        }
    }
    return false;
}