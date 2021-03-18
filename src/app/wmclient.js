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
const bent = require('bent')
const getJSON = bent('json')
const model = require('./model');
const LRU = require('lru-cache');
const CACHE_TYPE_HEADERS = 'ua-cache'
const CACHE_TYPE_DEVICE_ID = 'dId-cache'

/**
 * WmClient holds http connection data to server and the list capability it must return in response
 * @param scheme
 * @param host
 * @param port
 * @param baseURI
 * @constructor
 */
function WmClient(scheme, host, port, baseURI) {
    this.scheme = scheme
    this.host = host
    this.port = port
    this.baseURI = baseURI
    this.importantHeaders
    this.virtualCaps = []
    this.staticCaps = []
    this.reqVCaps = []
    this.reqStaticCaps = []
    this.uaCache = undefined
    this.devIdCache = undefined
    this.httpTimeout = 10000;
    this.deviceMakesMap = {}
    this.deviceOsVerMap = {}
}

/**
 * lookupUserAgent - Searches WURFL device data using the given user-agent for detection
 * @param userAgent
 * @param resultCallback
 * @returns {JSONDeviceData}
 */
WmClient.prototype.lookupUserAgent = async (userAgent, resultCallback) => {

    let lHeaders = {'User-Agent': userAgent};
    let reqData = new model.Request(lHeaders, this.reqStaticCaps, this.reqVCaps);
    return this.genericRequest('POST', '/v2/lookupuseragent/json', reqData, parseDevice, CACHE_TYPE_HEADERS);
}


/**
 * lookupDeviceID - Searches WURFL device data using its wurfl_id value
 * @param wurflId
 * @returns {JSONDeviceData}
 */

WmClient.prototype.lookupDeviceID = function (wurflId) {

    const lHeaders = {};
    let reqData = new model.Request(lHeaders, this.reqStaticCaps, this.reqVCaps, wurflId);
    return this.genericRequest('POST', '/v2/lookupdeviceid/json', reqData, parseDevice, CACHE_TYPE_DEVICE_ID);
}

WmClient.prototype.createPath = function (path) {

    if (this.baseURI.length > 0) {
        return "/" + this.baseURI + path
    } else {
        return path
    }
}

WmClient.prototype.createFullUrl = function (path) {
    return this.scheme + '//' + this.host + ':' + this.port + this.createPath(path)
}

/**
 * getInfo - Returns information about the running WM server and API
 * @returns {JSONInfoData}
 */
WmClient.prototype.getInfo = async function () {

    let full_url = this.createFullUrl('/v2/getinfo/json')
    let info_response = await getJSON(full_url)
    return parseInfo(info_response)
}

/**
 * Create a WMClient
 * @param scheme
 * @param host
 * @param port
 * @param baseURI
 */
async function create(scheme, host, port, baseURI) {
    let sc = scheme
    if (scheme.length > 0) {
        sc = scheme
        if (!endsWith(sc, ":")) {
            sc += ":"
        }
    } else {
        sc = 'http:'
    }

    const client = new WmClient(sc, host, port, baseURI);
    let info = await client.getInfo()
    client.importantHeaders = info.importantHeaders
    client.staticCaps = info.staticCaps
    client.virtualCaps = info.virtualCaps
    client.staticCaps.sort()
    client.virtualCaps.sort()
    return client
}

WmClient.prototype.createUrl = function (path) {
    return this.scheme + '//' + this.host + ':' + this.port + this.createPath(path)
}

checkData = (jsonInfoData) => {
    return jsonInfoData.wmVersion.length > 0 &&
        jsonInfoData.wurflAPIVersion.length > 0 &&
        jsonInfoData.wurflInfo.length > 0 &&
        jsonInfoData.staticCaps.length > 0;
}

/**
 * setRequestedCapabilities - set the given capability names to the set they belong
 * @param caps
 */
WmClient.prototype.setRequestedCapabilities = function (caps) {

    if (isUndefined(caps) || caps === null) {
        this.reqStaticCaps = null;
        this.reqVCaps = null;
        this.clearCaches();
        return;
    }

    let capNames = [];
    let vcapNames = [];

    for (let i = 0; i < caps.length; i++) {
        let name = caps[i];
        if (this.hasStaticCapability(name)) {
            capNames.push(name);
        } else if (this.hasVirtualCapability(name)) {
            vcapNames.push(name);
        }
    }
    this.reqStaticCaps = capNames;
    this.reqVCaps = vcapNames;
}

/**
 * setRequestedStaticCapabilities - set list of static capabilities to return
 * @param stCaps
 */

WmClient.prototype.setRequestedStaticCapabilities = function (stCaps) {

    if (isUndefined(stCaps) || stCaps === null) {
        this.reqStaticCaps = null;
        this.clearCaches();
        return;
    }

    let capNames = [];

    for (let i = 0; i < stCaps.length; i++) {
        let name = stCaps[i];
        if (this.hasStaticCapability(name)) {
            capNames.push(name);
        }
    }
    this.reqStaticCaps = capNames;
}

/**
 * setRequestedVirtualCapabilities - set list of virtual capabilities to return
 * @param stCaps
 */

WmClient.prototype.setRequestedVirtualCapabilities = function (vCaps) {

    if (isUndefined(vCaps) || vCaps === null) {
        this.reqVCaps = null;
        this.clearCaches();
        return;
    }

    let vcapNames = [];

    for (let i = 0; i < vCaps.length; i++) {
        let name = vCaps[i];
        if (this.hasVirtualCapability(name)) {
            vcapNames.push(name);
        }
    }
    this.reqVCaps = vcapNames;
}

/**
 * lookupRequest - detects a device and returns its data in JSON format
 * @param nodeReq
 * @returns {JSONDeviceData}
 */
WmClient.prototype.lookupRequest = async function (nodeReq) {
    // copy headers
    let lookupHeaders = {};
    for (let i = 0; i < this.importantHeaders.length; i++) {
        let name = this.importantHeaders[i];
        let h = nodeReq.headers[name.toLowerCase()];
        if (!isUndefined(h) && h.length > 0) {
            lookupHeaders[name] = h;
        }
    }
    let wmReq = new model.Request(lookupHeaders, this.reqStaticCaps, this.reqVCaps);
    return await this.genericRequest('POST', '/v2/lookuprequest/json', wmReq, parseDevice, CACHE_TYPE_HEADERS)
}

/**
 * hasStaticCapability - returns true if the given capName exist in this client' static capability set, false otherwise
 * @param capName
 * @returns {boolean}
 */
WmClient.prototype.hasStaticCapability = function (capName) {
    return this.staticCaps.indexOf(capName) !== -1;
};

/**
 * hasVirtualCapability - returns true if the given capName exist in this client' virtual capability set, false otherwise
 * @param vcapName
 * @returns {boolean}
 */
WmClient.prototype.hasVirtualCapability = function (vcapName) {
    return this.virtualCaps.indexOf(vcapName) !== -1;
};

WmClient.prototype.getCapabilityCount = function (device) {
    if (isUndefined(device) || (isUndefined(device.capabilities))) {
        return 0;
    }
    return Object.keys(device.capabilities).length;
};

/**
 * getAllDeviceMakes returns identity data for all devices in WM server
 */

WmClient.prototype.getAllDeviceMakes = function () {

    return new Promise((resolve) => {
        let makeMapPromise = this.getDeviceMakesMap()
        makeMapPromise.then(deviceMakes => {
            deviceMakes = Object.keys(deviceMakes)
            resolve(deviceMakes)
        })
    })
}


/**
 * getAllDevicesForMake Returns an array of an aggregate containing model_names + marketing_names for the given Make.
 * @param make
 */
WmClient.prototype.getAllDevicesForMake = async function (make) {
    let client = this
    let deviceMakesMap = await client.getDeviceMakesMap()
    let ob = deviceMakesMap[make]
    if (isUndefined(ob)) {
        throw new Error('WM server error : ' + make + ' does not exist')
    }
    return ob
}

WmClient.prototype.getDeviceMakesMap = async function () {
    let client = this;

    // Check if we have a value for deviceMakesMap
    if (!isUndefined(client.deviceMakesMap) && client.deviceMakesMap.length > 0) {
        // This returns a deep copy of make model, so that any changes to it are not reflected into our cached value
        return JSON.parse(JSON.stringify(client.deviceMakesMap))
    }

    let fullUrl = client.createFullUrl('/v2/alldevices/json')
    let allDevices = await getJSON(fullUrl)

    let deviceMakesMap = {}
    for (let i = 0; i < allDevices.length; i++) {
        let bn = allDevices[i].brand_name;
        if (isUndefined(bn) || bn === null || bn === "") {
            continue;
        }

        let modelMktName = new model.JSONModelMktName(allDevices[i].model_name, allDevices[i].marketing_name)
        if (isUndefined(deviceMakesMap[allDevices[i].brand_name])) {
            deviceMakesMap[allDevices[i].brand_name] = [];
        }
        deviceMakesMap[allDevices[i].brand_name].push(modelMktName);
    }
    client.deviceMakesMap = JSON.parse(JSON.stringify(deviceMakesMap));
    return deviceMakesMap
}

/**
 * getAllOSes returns of all devices device_os capabilities
 * @returns []
 */

WmClient.prototype.getAllOSes = async function () {
    let devOsVerMap = await this.getDeviceOsVerMap()
    return Object.keys(devOsVerMap)
}

/**
 * getAllVersionsForOS Returns an array of all devices device_os_version for a given device_os cap.
 * @param device_os
 */


WmClient.prototype.getAllVersionsForOS = async function (device_os) {
    let devOsVerMap = await this.getDeviceOsVerMap()

    let ob = devOsVerMap[device_os]
    if (isUndefined(ob)) {
        throw new Error('WM server error : ' + device_os + ' does not exist')
    }
    // Filter function strips all empty elements
    ob = ob.filter(function (element) {
        return element !== '';
    })
    return ob
}


WmClient.prototype.getDeviceOsVerMap = async function () {

    let client = this;
    // Check if we have a value for deviceMakesMap
    if (!isUndefined(client.deviceOsVerMap) && client.deviceOsVerMap.length > 0) {
        // This returns a deep copy of make model, so that any changes to it are not reflected into our cached value
        return JSON.parse(JSON.stringify(client.deviceOsVerMap))
    }

    let fullUrl = client.createFullUrl('/v2/alldeviceosversions/json')
    const allDevices = await getJSON(fullUrl)
    let deviceOsVerMap = {};
    for (let i = 0; i < allDevices.length; i++) {
        let os = allDevices[i].device_os;
        if (isUndefined(os) || os === null || os === "") {
            continue;
        }
        if (isUndefined(deviceOsVerMap[os])) {
            deviceOsVerMap[os] = [];
        }
        deviceOsVerMap[os].push(allDevices[i].device_os_version);
    }

    client.deviceOsVerMap = JSON.parse(JSON.stringify(deviceOsVerMap));
    return deviceOsVerMap
}

WmClient.prototype.genericRequest = async function (method, path, reqData, parseCb, resultCb, cacheType) {

    let device = null;
    let cacheKey = null
    // If the caller function uses a cache, try a cache lookup
    if (!isUndefined(cacheType)) {
        let cacheKey = this.getUserAgentCacheKey(reqData.lookup_headers);
        if (cacheType === CACHE_TYPE_HEADERS && !isUndefined(this.uaCache)) {
            device = this.uaCache.get(cacheKey);
        } else if (cacheType === CACHE_TYPE_DEVICE_ID && !isUndefined(this.devIdCache)) {
            cacheKey = reqData.wurfl_id;
            device = this.devIdCache.get(reqData.wurfl_id);
        }

        // cache has found a matching device, pass it to callback
        if (device != null && !isUndefined(device)) {
            return resultCb(device);
        }
    }
    let result
    if (method === 'GET') {
        let getResponse = await getJSON(this.createFullUrl(path))
        result = parseCb(getResponse)
        this.addToCache(cacheType, cacheKey, result)
    } else if (method === 'POST') {
        let server_address = this.scheme + '//' + this.host + ':' + this.port
        let post = bent(server_address, 'POST', 'json', 200)
        let postResponse = await post(path, reqData)
        result = parseCb(postResponse)
        this.addToCache(cacheType, cacheKey, result)
    }
    return result
}

/**
 * getApiVersion, returns the API version
 * @returns {string}
 */
WmClient.prototype.getApiVersion = () => {
    return '2.2.0'
}

WmClient.prototype.clearCaches = function () {
    if (!isUndefined(this.uaCache)) {
        this.uaCache.reset();
    }

    if (!isUndefined(this.devIdCache)) {
        this.devIdCache.reset();
    }

    this.deviceMakesMap = {};
    this.deviceOsVerMap = {};
};

WmClient.prototype.safePut = function (cacheType, ckey, cvalue) {
    if (cacheType === CACHE_TYPE_HEADERS && !isUndefined(this.uaCache)) {
        this.uaCache.set(ckey, cvalue);
        return;
    }

    if (cacheType === CACHE_TYPE_DEVICE_ID && !isUndefined(this.devIdCache)) {
        this.devIdCache.set(ckey, cvalue);
    }
};

/**
 * setCacheSize : set UA cache size
 * @param uaMaxEntries
 */
WmClient.prototype.setCacheSize = function (uaMaxEntries) {
    this.uaCache = LRU(uaMaxEntries);
    this.devIdCache = LRU(20000); // Device ID uses a fixed size
};

function parseInfo(data) {
    let static_caps = data.static_caps === null ? [] : data.static_caps
    let virtual_caps = data.virtual_caps === null ? [] : data.virtual_caps
    let info = new model.JSONInfoData(
        data.wurfl_api_version,
        data.wurfl_info,
        data.wm_version,
        data.important_headers,
        static_caps,
        virtual_caps,
        data.ltime)
    if (!checkData(info)) {
        throw Error("server returned invalid or empty data")
    }
    return info;
}

function parseDevice(data) {

    return new model.JSONDeviceData(
        data.apiVersion,
        data.capabilities,
        data.error,
        data.mtime,
        data.ltime);
}

function endsWith(text, needle) {
    return text.indexOf(needle, text.length - needle.length) !== -1;
}

function isUndefined(value) {
    return typeof value === "undefined"
}

WmClient.prototype.getUserAgentCacheKey = function (headers) {
    let cacheKey = ''
    let h_name = ''
    for (let i = 0; i < this.importantHeaders.length; i++) {
        h_name = this.importantHeaders[i]
        let h_val = headers[h_name]
        if (!isUndefined(h_val)) {
            cacheKey += h_val
        }
    }
    return cacheKey
}

WmClient.prototype.clearCachesIfNeeded = function (ltime) {
    if (!isUndefined(ltime) && ltime !== this.ltime) {
        this.clearCaches()
        this.ltime = ltime
    }
}

WmClient.prototype.addToCache = function (cacheType, cacheKey, result) {
    // Clear cache if last load time of wurfl.xml on server has changed
    this.clearCachesIfNeeded(result.ltime)
    if (cacheType === CACHE_TYPE_HEADERS) {
        this.safePut(cacheType, cacheKey, result)
    } else if (cacheType === CACHE_TYPE_DEVICE_ID) {
        this.safePut(cacheType, result.capabilities['wurfl_id'], result)
    }
}

/**
 * SetHTTPTimeout sets the connection and transfer timeouts for this client in seconds.
 * This function should be called before performing any connection to WM server
 * @param timeout
 */
WmClient.prototype.setHTTPTimeout = (timeout) => {
    if (!isUndefined(timeout) && timeout >= 10000) {
        this.httpTimeout = timeout
    }
}

module.exports.create = create;