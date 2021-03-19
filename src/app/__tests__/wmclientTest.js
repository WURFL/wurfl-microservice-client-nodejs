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

'use strict'
let client;
describe( "Wm client", () => {
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
        }
        catch (error){
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
        }
        catch (error){
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
    test('lookupDeviceID should return device data with all the available capabilities', async () =>{
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
})