'use strict'
// Runs without a WURFL Microservice: a stub server answers the endpoints the client uses.
const http = require('http')
const wmClient = require('../wmclient')
const LRUCache = require('../cache')

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'

let server
let port
let stub

function resetStub() {
    stub = {
        ltime: '2026-10-01 00:00:00',
        calls: {},
        bodies: [],
        fail: false,
        delayMs: 0,
    }
}

function device(wurflId) {
    return {
        apiVersion: '1.13.3.0',
        capabilities: { wurfl_id: wurflId, brand_name: 'Samsung', model_name: 'SM-S928B', form_factor: 'Smartphone' },
        error: '',
        mtime: 1793400000,
        ltime: stub.ltime,
    }
}

const routes = {
    'GET /v2/getinfo/json': () => ({
        wurfl_api_version: '1.13.3.0',
        wurfl_info: 'Root:/data/wurfl.zip:for API 1.13.3.0, db.scientiamobile.com - 2026-10-28 10:00:00',
        wm_version: '2.4.0',
        important_headers: ['User-Agent', 'Sec-CH-UA', 'Sec-CH-UA-Model', 'Sec-CH-UA-Platform-Version'],
        static_caps: ['brand_name', 'model_name'],
        virtual_caps: ['form_factor', 'is_robot'],
        ltime: stub.ltime,
    }),
    'POST /v2/lookuprequest/json': () => device('samsung_sm_s928b_ver1'),
    'POST /v2/lookupuseragent/json': () => device('samsung_sm_s928b_ver1'),
    'POST /v2/lookupdeviceid/json': (body) => body.wurfl_id === 'missing'
        ? { apiVersion: '1.13.3.0', capabilities: {}, error: 'device missing does not exist', mtime: 0, ltime: stub.ltime }
        : device(body.wurfl_id),
    'GET /v2/alldevices/json': () => [
        { brand_name: 'Samsung', model_name: 'SM-S928B', marketing_name: 'Galaxy S24 Ultra' },
        { brand_name: 'Apple', model_name: 'iPhone', marketing_name: '' },
        { brand_name: '', model_name: 'generic' },
    ],
    'GET /v2/alldeviceosversions/json': () => [
        { device_os: 'Android', device_os_version: '14' },
        { device_os: 'Android', device_os_version: '' },
        { device_os: 'iOS', device_os_version: '18.1' },
    ],
}

beforeAll(async () => {
    resetStub()
    server = http.createServer((req, res) => {
        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', () => {
            const key = `${req.method} ${req.url}`
            stub.calls[key] = (stub.calls[key] || 0) + 1
            const body = raw ? JSON.parse(raw) : undefined
            if (body) {
                stub.bodies.push(body)
            }
            const route = routes[key]
            setTimeout(() => {
                if (stub.fail || !route) {
                    res.writeHead(stub.fail ? 500 : 404, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'stub failure' }))
                    return
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(route(body)))
            }, stub.delayMs)
        })
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = String(server.address().port)
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

beforeEach(resetStub)

const create = () => wmClient.create('http:', '127.0.0.1', port, '')

describe('create and getInfo', () => {
    test('loads the server info', async () => {
        const client = await create()
        expect(client.importantHeaders).toContain('Sec-CH-UA-Model')
        expect(client.staticCaps).toEqual(['brand_name', 'model_name'])
        expect(client.virtualCaps).toEqual(['form_factor', 'is_robot'])
        const info = await client.getInfo()
        expect(info.wurflAPIVersion).toBe('1.13.3.0')
        expect(info.wmVersion).toBe('2.4.0')
    })

    test('reports a refused connection like axios did', async () => {
        const unused = http.createServer()
        await new Promise((resolve) => unused.listen(0, '127.0.0.1', resolve))
        const closedPort = String(unused.address().port)
        await new Promise((resolve) => unused.close(resolve))
        await expect(wmClient.create('http:', '127.0.0.1', closedPort, '')).rejects.toThrow('ECONNREFUSED')
    })

    test('rejects a malformed address with Invalid URL', async () => {
        await expect(wmClient.create('', '', '', '')).rejects.toThrow('Invalid URL')
    })

    test('does not leak globals', async () => {
        await create()
        expect(globalThis.checkData).toBeUndefined()
    })
})

describe('lookupRequest', () => {
    test('reads a Node.js request headers object (lowercase names)', async () => {
        const client = await create()
        const result = await client.lookupRequest({ headers: { 'user-agent': UA, 'sec-ch-ua-model': '"SM-S928B"', 'accept': 'text/html' } })
        expect(result.capabilities.wurfl_id).toBe('samsung_sm_s928b_ver1')
        expect(stub.bodies[0].lookup_headers).toEqual({ 'User-Agent': UA, 'Sec-CH-UA-Model': '"SM-S928B"' })
    })

    test('reads a Fetch API Request', async () => {
        const client = await create()
        const request = new Request('https://example.com/', {
            headers: { 'User-Agent': UA, 'Sec-CH-UA-Platform-Version': '"14.0.0"', 'Accept': 'text/html' },
        })
        await client.lookupRequest(request)
        expect(stub.bodies[0].lookup_headers).toEqual({ 'User-Agent': UA, 'Sec-CH-UA-Platform-Version': '"14.0.0"' })
    })

    test('sends the requested capabilities', async () => {
        const client = await create()
        client.setRequestedStaticCapabilities(['brand_name', 'unknown_cap'])
        client.setRequestedVirtualCapabilities(['form_factor'])
        await client.lookupUserAgent(UA)
        expect(stub.bodies[0].requested_caps).toEqual(['brand_name'])
        expect(stub.bodies[0].requested_vCaps).toEqual(['form_factor'])
    })
})

describe('errors and timeouts', () => {
    test('a non-2xx response throws with the status, and keeps error.response', async () => {
        const client = await create()
        stub.fail = true
        const error = await client.lookupUserAgent(UA).catch((e) => e)
        expect(error.message).toBe('Request failed with status code 500')
        expect(error.response.status).toBe(500)
        expect(error.response.data).toEqual({ error: 'stub failure' })
    })

    test('requests time out after httpTimeout', async () => {
        const client = await create()
        client.httpTimeout = 50
        stub.delayMs = 500
        const error = await client.lookupUserAgent(UA).catch((e) => e)
        expect(error.message).toBe('timeout of 50ms exceeded')
        expect(error.code).toBe('ECONNABORTED')
    })

    test('setHTTPTimeout ignores values under 10000ms', async () => {
        const client = await create()
        client.setHTTPTimeout(500)
        expect(client.httpTimeout).toBe(10000)
        client.setHTTPTimeout(15000)
        expect(client.httpTimeout).toBe(15000)
    })

    test('lookupDeviceID throws the server error message', async () => {
        const client = await create()
        await expect(client.lookupDeviceID('missing')).rejects.toThrow('does not exist')
    })
})

describe('caches', () => {
    test('a cached user agent does not call the server again', async () => {
        const client = await create()
        client.setCacheSize(10)
        await client.lookupUserAgent(UA)
        await client.lookupUserAgent(UA)
        expect(stub.calls['POST /v2/lookupuseragent/json']).toBe(1)
        expect(client.uaCache.itemCount).toBe(1)
    })

    test('a changed server load time clears the caches', async () => {
        const client = await create()
        client.setCacheSize(10)
        await client.lookupUserAgent(UA)
        await client.lookupDeviceID('samsung_sm_s928b_ver1')
        expect(client.uaCache.itemCount).toBe(1)
        expect(client.devIdCache.itemCount).toBe(1)
        stub.ltime = '2026-10-02 00:00:00'
        await client.getInfo()
        expect(client.uaCache.itemCount).toBe(0)
        expect(client.devIdCache.itemCount).toBe(0)
    })

    test('device makes and OS versions are fetched once', async () => {
        const client = await create()
        expect(await client.getAllDeviceMakes()).toEqual(['Samsung', 'Apple'])
        expect((await client.getAllDevicesForMake('Samsung'))[0].marketingName).toBe('Galaxy S24 Ultra')
        await expect(client.getAllDevicesForMake('Nokia')).rejects.toThrow('does not exist')
        expect(stub.calls['GET /v2/alldevices/json']).toBe(1)

        expect(await client.getAllOSes()).toEqual(['Android', 'iOS'])
        expect(await client.getAllVersionsForOS('Android')).toEqual(['14'])
        expect(stub.calls['GET /v2/alldeviceosversions/json']).toBe(1)
    })

    test('getAllDeviceMakes rejects when the server fails', async () => {
        const client = await create()
        stub.fail = true
        await expect(client.getAllDeviceMakes()).rejects.toThrow('status code 500')
    })
})

describe('LRUCache', () => {
    test('evicts the least recently used entry', () => {
        const cache = LRUCache(2)
        cache.set('a', 1)
        cache.set('b', 2)
        expect(cache.get('a')).toBe(1)
        cache.set('c', 3)
        expect(cache.has('b')).toBe(false)
        expect(cache.keys()).toEqual(['c', 'a'])
        expect(cache.itemCount).toBe(2)
        cache.del('a')
        expect(cache.length).toBe(1)
        cache.reset()
        expect(cache.itemCount).toBe(0)
    })
})
