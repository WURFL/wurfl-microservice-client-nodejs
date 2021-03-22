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
const wmClient = require('../wmclient')
const http = require("http");
const lookupRequestTestOpts = {
    protocol: 'http:',
    host: 'localhost',
    port: '8080',
    method: 'POST',
    path: '/',
}

'use strict'
let client;
describe("Wm client", () => {
    beforeAll(async () => {
        console.log('Running on node v ' + process.version)
        client = await wmClient.create('http:', 'localhost', '8080', '')
        expect(client !== undefined)
    })

    test('client Create successful', async () => {
        let wm = await wmClient.create('http:', 'localhost', '8080', '')
        expect(wm.importantHeaders.length).toBe(7)
        expect(wm.virtualCaps.length).toBeGreaterThan(0)
        expect(wm.staticCaps.length).toBeGreaterThan(0)
    })

    test('create client should work when schema is provided without the column', async () => {
        let wm = await wmClient.create('http', 'localhost', '8080', '')
        expect(wm.importantHeaders.length).toBe(7)
        expect(wm.virtualCaps.length).toBeGreaterThan(0)
        expect(wm.staticCaps.length).toBeGreaterThan(0)
    });

    test('create client should pass when schema is not passed, defaulting to http', async () => {
        let wm = await wmClient.create('', 'localhost', '8080', '')
        expect(wm.importantHeaders.length).toBe(7)
        expect(wm.virtualCaps.length).toBeGreaterThan(0)
        expect(wm.staticCaps.length).toBeGreaterThan(0)
    })
    test('client create should throw error when protocol is not supported', async () => {
        let exc = false
        try {
            await wmClient.create('smtp', 'localhost', '8080', '')
        } catch (error) {
            exc = true
            expect(error.message).toContain('Unknown protocol')
            expect(error.message).toContain('smtp')
        }
        expect(exc).toBeTruthy()
    })
    test('should throw error when schema, host and port are all empty', async () => {
        let exc = false
        try {
            await wmClient.create('', '', '', '')
        } catch (error) {
            exc = true
            expect(error.message).toContain('Invalid URL')
        }
        expect(exc).toBeTruthy()
    })
    test('should throw error when port is wrong', async () => {
        let exc = false
        try {
            await wmClient.create('http:', 'localhost', '8089', '')
        } catch (error) {
            exc = true
            expect(error.message).toContain('ECONNREFUSED')
        }
        expect(exc).toBeTruthy()

    })
    test('hasStaticCapability should return true when capability is exposed by the WM server, false otherwise', async () => {
        // Now we start using the client created in beforeAll function, to save client creation time
        expect(client.hasStaticCapability('brand_name')).toBeTruthy()
        expect(client.hasStaticCapability('model_name')).toBeTruthy()
        expect(client.hasStaticCapability('is_smarttv')).toBeTruthy()
        // this is a virtual capability, so it shouldn't be returned
        expect(client.hasStaticCapability('is_app')).toBeFalsy()
        // This doesn't exist
        expect(client.hasStaticCapability('nonexisting_cap')).toBeFalsy()
    })
    test('should return true when a virtual capability is exposed by the WM server, false otherwise', async () => {
        expect(client.hasVirtualCapability('is_robot')).toBeTruthy()
        expect(client.hasVirtualCapability('is_smartphone')).toBeTruthy()
        expect(client.hasVirtualCapability('form_factor')).toBeTruthy()
        // this is a static capability, so it shouldn't be returned
        expect(client.hasVirtualCapability('brand_name')).toBeFalsy()
        expect(client.hasVirtualCapability('nonexisting_vcap')).toBeFalsy()
    })
    test('getInfo should return WM server info when called', async () => {

        let info = await client.getInfo()
        expect(info).toBeDefined()
        expect(info.wurflAPIVersion).toBeDefined()
        expect(info.importantHeaders.length).toBeGreaterThan(0)
        expect(info.staticCaps.length).toBeGreaterThan(0)
        expect(info.virtualCaps.length).toBeGreaterThan(0)
        expect(info.ltime).toBeDefined()
        // this is something that can be specified later, so now they are undefined
        expect(info.reqStaticCaps).toBeUndefined()
        expect(info.reqVCaps).toBeUndefined()
    })
    test('lookupDeviceID should return device data with all the available capabilities', async () => {
        let device = await client.lookupDeviceID('nokia_generic_series40')
        expect(device).toBeDefined()
        expect(device.capabilities['brand_name']).toBe('Nokia')
        expect(device.capabilities['is_robot']).toBe('false')
        expect(device.capabilities['form_factor']).toBe('Feature Phone')
        expect(client.getCapabilityCount(device)).toBeGreaterThan(0)
        expect(device.ltime).toBeDefined()
    })
    test('lookupDeviceID should return device data with the selected capability values', async () => {

        client.setRequestedStaticCapabilities(['brand_name', 'model_name'])
        client.setRequestedVirtualCapabilities(['is_robot', 'is_full_desktop'])
        let device = await client.lookupDeviceID('nokia_generic_series40')
        expect(device).toBeDefined()
        expect(device.capabilities['brand_name']).toBe('Nokia')
        expect(device.capabilities['is_robot']).toBe('false')
        // capability not selected
        expect(device.capabilities['resolution_width']).toBeUndefined()
        expect(client.getCapabilityCount(device)).toBe(5)
        // reset these values
        client.setRequestedStaticCapabilities([])
        client.setRequestedVirtualCapabilities([])
        expect(device.ltime).toBeDefined()
    })
    test('lookupDeviceID should throw an error with message if device does not exist in server', async () => {
        let exc = false
        let device
        try {
            device = await client.lookupDeviceID('google_unexisting_id')
        } catch (error) {
            exc = true
        }
        expect(client.getCapabilityCount(device)).toBe(0)
        expect(device).toBeUndefined()
        expect(exc).toBeTruthy()
    })
    test('getCapabilityCount should return the number of capabilities loaded in device', async () => {

        let device = await client.lookupDeviceID('nokia_generic_series40')
        expect(device).toBeDefined()
        let capCount = client.getCapabilityCount(device)
        expect(capCount).toBeGreaterThan(0)
    })
    test('getCapabilityCount should return zero when device is undefined', () => {
        expect(client.getCapabilityCount(undefined)).toBe(0)
    })
    test('getCapabilityCount should return zero when device capabilities property is undefined', () => {
        let device = {'property': 'test'};
        expect(client.getCapabilityCount(device)).toBe(0)
    })
    test('lookupUserAgent should return device data with all the available capabilities', async () => {

        let device = await client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36')
        expect(device).toBeDefined()
        expect(device.capabilities['brand_name']).toBe('Asus')
        expect(device.capabilities['is_robot']).toBe('false')
        expect(device.capabilities['model_name']).toBe('Z017D')
        expect(device.capabilities['wurfl_id']).toBe('asus_z017d_ver1')
        expect(client.getCapabilityCount(device)).toBeGreaterThan(0)
        expect(device.ltime).toBeDefined()
        expect(device.mtime).toBeGreaterThan(0)
    })
    test('lookupUserAgent should return device data with the set of chosen capabilities', async () => {

        client.setRequestedStaticCapabilities(['brand_name', 'model_name'])
        client.setRequestedVirtualCapabilities(['is_robot', 'form_factor'])
        let device = await client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36')
        expect(device.capabilities['brand_name']).toBe('Asus')
        expect(device.capabilities['is_robot']).toBe('false')
        expect(device.capabilities['model_name']).toBe('Z017D')
        expect(device.capabilities['model_name']).toBe('Z017D')
        expect(device.capabilities['form_factor']).toBe('Smartphone')
        expect(client.getCapabilityCount(device)).toBe(5)

        // These caps have not been defined
        expect(device.capabilities['resolution_width']).toBeUndefined()
        expect(device.capabilities['is_app_webview']).toBeUndefined()
        expect(device.mtime).toBeGreaterThan(0)
        expect(device.APIVersion).toBeDefined()
        client.setRequestedStaticCapabilities([]);
        client.setRequestedVirtualCapabilities([]);
    })
    test('lookupRequest should return a device with all the available capabilities', async () => {

        // In order to emulate node js behaviour we must lowercase (see: https://nodejs.org/docs/latest-v0.10.x/api/http.html) "Keys are lowercased. Values are not modified"
        let hs = {
            'content-Type': 'application/json',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/539.36',
            'accept-encoding': 'gzip, deflate'
        }

        let req = http.request(lookupRequestTestOpts)
        req.headers = hs
        req.end()
        let device = await client.lookupRequest(req)
        expect(device).toBeDefined()
        expect(client.getCapabilityCount(device)).toBeGreaterThan(0)
        expect(device.capabilities['wurfl_id']).toBe('asus_z017d_ver1')
        expect(device.capabilities['brand_name']).toBe('Asus')
        expect(device.capabilities['is_robot']).toBe('false')
        expect(device.capabilities['is_full_desktop']).toBe('false')
        expect(device.APIVersion).toBeDefined()
        expect(device.mtime).toBeGreaterThan(0)
    })
    test('lookupRequest should return a device with a set of selected capabilities', async () => {

        client.setRequestedStaticCapabilities(['brand_name', 'model_name'])
        client.setRequestedVirtualCapabilities(['is_robot', 'form_factor'])
        // In order to emulate node js behaviour we must lowercase (see: https://nodejs.org/docs/latest-v0.10.x/api/http.html) "Keys are lowercased. Values are not modified"
        let hs = {
            'content-type': 'application/json',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36',
            'accept-encoding': 'gzip, deflate'
        }

        let req = http.request(lookupRequestTestOpts)
        req.headers = hs
        req.end()
        let device = await client.lookupRequest(req)
        expect(device).toBeDefined()
        expect(client.getCapabilityCount(device)).toBeGreaterThan(0)
        expect(device.capabilities['wurfl_id']).toBe('asus_z017d_ver1')
        expect(device.capabilities['brand_name']).toBe('Asus')
        expect(device.capabilities['model_name']).toBe('Z017D')
        expect(device.capabilities['is_robot']).toBe('false')
        expect(device.capabilities['form_factor']).toBe('Smartphone')
        expect(device.APIVersion).toBeDefined()
        expect(device.mtime).toBeGreaterThan(0)
        // This capability is not included in the filter
        expect(device.capabilities['is_ios']).toBeUndefined()
        //  Reset capability filters to return them all
        client.setRequestedStaticCapabilities([])
        client.setRequestedVirtualCapabilities([])
    })
    test('should return an error is server is not available', async () => {

        client.port = 9090;

        // In order to emulate node js behaviour we must lowercase (see: https://nodejs.org/docs/latest-v0.10.x/api/http.html) "Keys are lowercased. Values are not modified"
        let hs = {
            'content-type': 'application/json',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36',
            'accept-encoding': 'gzip, deflate'
        }
        let req = http.request(lookupRequestTestOpts)
        req.headers = hs;
        req.end();
        let exc = false
        let device
        try {
            device = await client.lookupRequest(req)
        }
        catch (error) {
            exc = true
        }
        expect(device).toBeUndefined()
        expect(exc).toBeTruthy()
        client.port = 8080;
    })
    test('setRequestedCapabilities assign each capability in the given array to the proper specific array of static or virtual capabilities', async () => {
        client.setRequestedCapabilities(["is_full_desktop", "marketing_name", "brand_name", "model_name", "form_factor", "is_robot", "is_tablet"]);
        expect(client.reqStaticCaps).toStrictEqual(['marketing_name', 'brand_name', 'model_name', 'is_tablet'])
        expect(client.reqVCaps).toStrictEqual(['is_full_desktop', 'form_factor', 'is_robot'])
        //  Reset capability filters to return them all
        client.setRequestedStaticCapabilities([])
        client.setRequestedVirtualCapabilities([])
    })
    test('setRequestedStaticCapabilities should discard non existing capability names when setting the required capabilities arrays', async () => {
        client.setRequestedStaticCapabilities(['brand_name', 'model_name', 'marketing_name', 'wrong_cap'])
        let device = await client.lookupDeviceID('nokia_generic_series40')
        expect(device).toBeDefined()
        let capCount = client.getCapabilityCount(device)
        expect(capCount).toBe(4) // 3 static caps chose + wurfl_id
        // resets static cap filter, allowing all caps to be returned
        client.setRequestedStaticCapabilities(undefined)
        device = await client.lookupDeviceID('nokia_generic_series40')
        capCount = client.getCapabilityCount(device)
        expect(capCount).toBeGreaterThan(20)
        //  Reset capability filters to return them all
        client.setRequestedStaticCapabilities([])
        client.setRequestedVirtualCapabilities([])
    })
    test('setRequestedVirtualCapabilities should discard non existing capability names when setting the required capabilities arrays', async () => {
        client.setRequestedVirtualCapabilities(['is_robot', 'wrong_vcap', 'wrong_vcap 2'])
        let device = await client.lookupDeviceID('nokia_generic_series40')
        expect(device).toBeDefined()
        let capCount = client.getCapabilityCount(device)
        expect(capCount).toBe(2) // 1 vcap + wurfl_id
        client.setRequestedVirtualCapabilities(undefined)
        device = await client.lookupDeviceID('nokia_generic_series40')
        capCount = client.getCapabilityCount(device)
        expect(capCount).toBeGreaterThan(20)
        //  Reset capability filters to return them all
        client.setRequestedVirtualCapabilities([])
    })
    test('setCacheSize should create the caches with the given size for storing devices', async () =>  {
        client.setCacheSize(1000)
        let device = await client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36')
        expect(device).toBeDefined()
        expect(client.uaCache.itemCount).toBe(1)
        device = await client.lookupDeviceID('google_pixel_xl_ver1')
        expect(device).toBeDefined()
        expect(client.devIdCache.itemCount).toBe(1)
        // This should NOT reset cache because ltime has not changed
        client.clearCachesIfNeeded(device.ltime, client);
        expect(client.uaCache.itemCount).toBe(1)
        expect(client.devIdCache.itemCount).toBe(1)

        client.clearCachesIfNeeded("2199-12-31", client);
        // Now ltime has changed, so caches are cleared
            expect(client.uaCache.itemCount).toBe(0)
            expect(client.devIdCache.itemCount).toBe(0)
    })
    test('should remove all elements from both caches', async ()=> {
        let device = await client.lookupDeviceID('google_pixel_xl_ver1')
        expect(device).toBeDefined()
        expect(client.devIdCache.itemCount).toBe(1)

        client.clearCaches();
        expect(client.uaCache.itemCount).toBe(0)
        expect(client.devIdCache.itemCount).toBe(0)
    })
    test('clearCachesIfNeeded, on lookup methods, should remove all elements from both caches only if the server\'s load time changes', async () => {
            let device = await client.lookupUserAgent('Mozilla/5.0 (Linux; Android 6.0; ASUS_Z017D Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36')
            expect(client.uaCache.itemCount).toBe(1)
            device = await client.lookupDeviceID('google_pixel_xl_ver1')
            expect(client.devIdCache.itemCount).toBe(1)
            // This should NOT reset cache because ltime is not changed
            client.clearCachesIfNeeded(device.ltime)
            expect(client.uaCache.itemCount).toBe(1)
            expect(client.devIdCache.itemCount).toBe(1)
            client.clearCachesIfNeeded("2199-12-31");
            // Now ltime has changed, so caches are cleared
            expect(client.uaCache.itemCount).toBe(0)
            expect(client.devIdCache.itemCount).toBe(0)
    })
    test('when getInfo method is called, client should remove all elements from both caches only if server\'s load time changes', async () => {
        await client.lookupDeviceID('google_pixel_xl_ver1')
        expect(client.devIdCache.itemCount).toBe(1)
        client.ltime = "1999-12-31"; // force client ltime to trigger cache reset
        let info = await client.getInfo()
        expect(info).toBeDefined()
        // getInfo will have real ltime from server, so cache should have been reset
        expect(client.devIdCache.itemCount).toBe(0)
    })
    test('getAllDeviceMakes should retrieve a json array holding all device makes', async () => {
        let deviceMakes = await client.getAllDeviceMakes()
        expect(deviceMakes).toBeDefined()
        expect(deviceMakes.length).toBeGreaterThan(0)
        expect(deviceMakes[0]).toBeDefined()
        // deviceMakesMap cache has been set
        expect(Object.keys(client.deviceMakesMap).length).toBeGreaterThan(2000)
    })
    test('getAllDevicesForMake should retrieve an array of an aggregate containing model_names + marketing_names for the given Make', async () => {
        let modelMktName = await client.getAllDevicesForMake("Nokia")
        expect(modelMktName).toBeDefined()
        expect(modelMktName.length).toBeGreaterThan(0)
        expect(modelMktName[0].modelName).toBeDefined()
        expect(modelMktName[0].modelName.length).toBeGreaterThan(0)
        expect(modelMktName.length).toBeGreaterThan(700)
    })
    test('getAllDevicesForMake should throw an error for the given Make if not exists', async () => {
            let devicesForMake
            try{
                devicesForMake =await client.getAllDevicesForMake("NotExists")
            }
            catch (error) {
                expect(error).toBeDefined()
                expect(error.message).toContain('does not exist')
            }
            expect(devicesForMake).toBeUndefined()
    })
    test('getAllOSes should retrieve a json array holding all devices device_os capabilities', async () => {
        let oses = await client.getAllOSes()
        expect(oses).toBeDefined()
        expect(oses.length).toBeGreaterThan(30)
        expect(oses[0]).toBeDefined()
        // deviceOsVerMap cache has been set
        expect(Object.keys(client.deviceOsVerMap).length).toBeGreaterThan(30)
    })
    test('getAllVersionsForOS should retrieve an array of all devices device_os_version for a given device_os cap', async () => {
            let versionsForOS = await client.getAllVersionsForOS("Android")
            expect(versionsForOS).toBeDefined()
            expect(versionsForOS.length).toBeGreaterThan(30)
            // WPC-154: client must strip empty OS versions from array
            expect(versionsForOS.includes('')).toBeFalsy()
    })
})