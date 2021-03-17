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
    return this.genericRequest('POST', '/v2/lookupuseragent/json', reqData, parseDevice, resultCallback, CACHE_TYPE_HEADERS);
}


/**
 * lookupDeviceID - Searches WURFL device data using its wurfl_id value
 * @param wurflId
 * @param cb
 * @returns {JSONDeviceData}
 */
/*
WmClient.prototype.lookupDeviceID = function (wurflId, cb) {
    var options = this.getOptions('/v2/lookupdeviceid/json', 'POST');

    var lHeaders = {};
    var reqData = new model.Request(lHeaders, this.reqStaticCaps, this.reqVCaps, wurflId);
    this.genericRequest(options, reqData, parseDevice, cb, CACHE_TYPE_DEVICE_ID, this);
};
*/

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
    return new Promise((resolve, reject) => {
        let info_promise = getJSON(full_url)
        info_promise.then((info) => {
            let parsedInfo = parseInfo(info)
            resolve(parsedInfo)
        }).catch((error) => {
            reject(new Error('Unable to get WURFL Microservice server info ' + error.message))
        })
    })




}

WmClient.prototype.internalGetInfo = async function () {
    let full_url = this.createFullUrl('/v2/getinfo/json')
    return getJSON(full_url)
}

/**
 * Create a WMClient
 * @param scheme
 * @param host
 * @param port
 * @param baseURI
 * @param cb
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

    return new Promise((resolve, reject) => {
            const client = new WmClient(sc, host, port, baseURI);
            let info_promise = client.internalGetInfo()
            info_promise.then((response) => {
                let info = parseInfo(response)
                client.importantHeaders = info.importantHeaders
                client.staticCaps = info.staticCaps
                client.virtualCaps = info.virtualCaps
                client.staticCaps.sort()
                client.virtualCaps.sort()
                resolve(client)
            })
        })
}

WmClient.prototype.createUrl = function (path) {
    return this.scheme + '//' + this.host + ':' + this.port + this.createPath(path)
}

WmClient.prototype.newRequest = function (method, path, data) {
    const req = {
        host: this.host,
        port: this.port,
        method: method,
        url: this.createUrl(path),
        timeout: this.httpTimeout,
        headers: {
            'Content-Type': 'application/json'
        },
    }

    if (data != null) {
        req.data = JSON.stringify(data)
    }
    return req
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

    if(isUndefined(caps) || caps === null){
        this.reqStaticCaps = null;
        this.reqVCaps = null;
        this.clearCaches();
        return;
    }

    let capNames = [];
    let vcapNames = [];

    for (let i=0; i< caps.length; i++)
    {
        let name = caps[i];
        if (this.hasStaticCapability(name))
        {
            capNames.push(name);
        }
        else if (this.hasVirtualCapability(name))
        {
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

    if(isUndefined(stCaps) || stCaps === null){
        this.reqStaticCaps = null;
        this.clearCaches();
        return;
    }

    let capNames = [];

    for (let i=0; i< stCaps.length; i++)
    {
        let name = stCaps[i];
        if (this.hasStaticCapability(name))
        {
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

    if(isUndefined(vCaps) || vCaps === null){
        this.reqVCaps = null;
        this.clearCaches();
        return;
    }

    var vcapNames = [];

    for (let i=0; i< vCaps.length; i++)
    {
        let name = vCaps[i];
        if (this.hasVirtualCapability(name))
        {
            vcapNames.push(name);
        }
    }
    this.reqVCaps = vcapNames;
}

/**
 * lookupRequest - detects a device and returns its data in JSON format
 * @param nodeReq
 * @param cb callback function that will be executed with the resulting JSONDeviceData structure
 * @returns {JSONDeviceData}
 */
WmClient.prototype.lookupRequest = async function(nodeReq)  {
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
    return await this.genericRequest('POST', '/v2/lookuprequest/json', wmReq, parseDevice, parseDevice, CACHE_TYPE_HEADERS)
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
 * @param cb callback that will be ccalled with the API call result
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

WmClient.prototype.getAllDevicesForMake = function (make) {
    let client = this
    return new Promise(((resolve, reject) => {
        let deviceMakesMapPromise = client.getDeviceMakesMap()
        deviceMakesMapPromise.then((deviceMakesMap) => {
            let ob = deviceMakesMap[make]
            if (isUndefined(ob)) {
                reject(new Error('WM server error : ' + make + ' does not exist'))
            }
            resolve(ob)
        })
    }))
}


WmClient.prototype.getDeviceMakesMap = function (cb) {
    let client = this;

    // Check if we have a value for deviceMakesMap
    if (!isUndefined(client.deviceMakesMap) && client.deviceMakesMap.length > 0) {
        // This returns a deep copy of make model, so that any changes to it are not reflected into our cached value
        let map_copy = cb(JSON.parse(JSON.stringify(client.deviceMakesMap)))
        return Promise.resolve(map_copy)
    }

    return new Promise((resolve) => {
        let fullUrl = client.createFullUrl('/v2/alldevices/json')
        let allDevicesPromise = getJSON(fullUrl)
        allDevicesPromise.then(devices => {
            let deviceMakesMap = {}
            for (let i = 0; i < devices.length; i++) {
                let bn = devices[i].brand_name;
                if (isUndefined(bn) || bn === null || bn === "") {
                    continue;
                }

                let modelMktName = new model.JSONModelMktName(devices[i].model_name, devices[i].marketing_name)
                if (isUndefined(deviceMakesMap[devices[i].brand_name])) {
                    deviceMakesMap[devices[i].brand_name] = [];
                }
                deviceMakesMap[devices[i].brand_name].push(modelMktName);
            }
            client.deviceMakesMap = JSON.parse(JSON.stringify(deviceMakesMap));
            resolve(deviceMakesMap)
        })
    })
}

/**
 * getAllOSes returns of all devices device_os capabilities
 * @param cb
 * @returns []
 */
/*
WmClient.prototype.getAllOSes = function (cb) {
    this.getDeviceOsVerMap(function(deviceOsVerMap) {
        return cb(Object.keys(deviceOsVerMap))
    })
};
 */


/**
 * getAllVersionsForOS Returns an array of all devices device_os_version for a given device_os cap.
 * @param device_os
 * @param {function(Error, {[]string}} cb called when done
 */

/*
WmClient.prototype.getAllVersionsForOS = function (device_os, cb) {
    this.getDeviceOsVerMap(function(deviceOsVerMap) {
        var ob = deviceOsVerMap[device_os];
        if (isUndefined(ob)) {
            return cb(new Error('WM server error : ' + device_os + ' does not exist'));
        }
        // Filter function strips all empty elements
        ob = ob.filter(function(element) {
            return element !== "";
        });
        return cb(undefined, ob);
    });
};
 */

/*
WmClient.prototype.getDeviceOsVerMap = function (cb) {
    var client = this;
    var options = client.getOptions('/v2/alldeviceosversions/json', 'GET');

    // Check if we have a value for deviceMakesMap
    if (!isUndefined(client.deviceOsVerMap) && client.deviceOsVerMap.length > 0) {
        // This returns a deep copy of make model, so that any changes to it are not reflected into our cached value
        return cb(JSON.parse(JSON.stringify(client.deviceOsVerMap)))
    }

    var req = http.request(options, function (res) {
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            let data = JSON.parse(body);
            let deviceOsVerMap = {};
            for (var i = 0; i < data.length; i++) {
                var os = data[i].device_os;
                if (isUndefined(os) || os === null || os === "") {
                    continue;
                }
                if (isUndefined(deviceOsVerMap[os])) {
                    deviceOsVerMap[os] = [];
                }
                deviceOsVerMap[os].push(data[i].device_os_version);
            }

            client.deviceOsVerMap = JSON.parse(JSON.stringify(deviceOsVerMap));
            return cb(deviceOsVerMap);
        });
    });
    req.on('error', function (e) {
        return resultCb(e, null)
    });

    req.end();
};*/

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

        return new Promise(resolve => {
            let getResponsePromise = getJSON(this.createFullUrl(path))
            getResponsePromise.then(response => {
                result = parseCb(response)
                this.addToCache(cacheType, cacheKey, result)
                resolve(result)
            })
        })

    } else if (method === 'POST') {
        return new Promise(resolve => {
            let server_address = this.scheme + '//' + this.host + ':' + this.port
            let post = bent(server_address, 'POST', 'json', 200)
            let postResponsePromise = post(path, reqData)
            postResponsePromise.then(response => {
                result = parseCb(response)
                this.addToCache(cacheType, cacheKey, result)
                resolve(result)
            })
        })
    }
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
    if (cacheType == CACHE_TYPE_HEADERS && !isUndefined(this.uaCache)) {
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

    let device = new model.JSONDeviceData(
        data.apiVersion,
        data.capabilities,
        data.error,
        data.mtime,
        data.ltime);
    return device;
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