const wmClient = require('../wmclient')

'use strict'

describe( "Wm client", () => {
    beforeAll(async () => {
        console.log('Running on node v ' + process.version)
        const client = await wmClient.create('http:', 'localhost', '8080', '')
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
})