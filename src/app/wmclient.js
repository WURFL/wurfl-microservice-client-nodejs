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
var http = require('http');
var model = require('./model');
var LRU  = require('lru-cache');

/**
 * WmClient holds http connection data to server and the list capability it must return in response
 * @param scheme
 * @param host
 * @param port
 * @param baseURI
 * @constructor
 */
function WmClient(scheme, host, port, baseURI) {
    this.scheme = scheme,
        this.host = host;
    this.port = port;
    this.baseURI = baseURI;
    this.importantHeaders = '';
    this.virtualCaps = [];
    this.staticCaps = [];
    this.reqVCaps = [];
    this.reqStaticCaps = [];
    this.uaCache;
    this.devIdCache;
    this.httpTimeout = 10000;

    this.deviceMakesMap;
    this.deviceOsVerMap;
}

/**
 * lookupUserAgent - Searches WURFL device data using the given user-agent for detection
 * @param userAgent
 * @param resultCallback
 * @returns {JSONDeviceData}
 */
WmClient.prototype.lookupUserAgent = function (userAgent, resultCallback) {
    var options = this.getOptions('/v2/lookupuseragent/json', 'POST');

    var lHeaders = {'User-Agent': userAgent};
    var reqData = new model.Request(lHeaders, this.reqStaticCaps, this.reqVCaps);
    this.genericRequest(options, reqData, parseDevice, resultCallback, "ua-cache", this);
};

/**
 * lookupDeviceID - Searches WURFL device data using its wurfl_id value
 * @param wurflId
 * @param cb
 * @returns {JSONDeviceData}
 */
WmClient.prototype.lookupDeviceID = function (wurflId, cb) {
    var options = this.getOptions('/v2/lookupdeviceid/json', 'POST');

    var lHeaders = {};
    var reqData = new model.Request(lHeaders, this.reqStaticCaps, this.reqVCaps, wurflId);
    this.genericRequest(options, reqData, parseDevice, cb, "dId-cache", this);
};


WmClient.prototype.createPath = function (path) {

    if (this.baseURI.length > 0) {
        return "/" + this.baseURI + path;
    } else {
        return path;
    }
};

/**
 * getInfo - Returns information about the running WM server and API
 * @param cb
 * @returns {JSONInfoData}
 */
WmClient.prototype.getInfo = function (cb) {
    var path = this.createPath('/v2/getinfo/json');
    var options = this.getOptions(path, 'GET');
    this.genericRequest(options, '', parseInfo, cb, undefined, this);
};

/**
 * Create a WMClient
 * @param scheme
 * @param host
 * @param port
 * @param baseURI
 * @param cb
 */
function create(scheme, host, port, baseURI, cb) {
    var sc = scheme;
    if (scheme.length > 0) {
        sc = scheme;
        if (!endsWith(sc, ":")) {
            sc += ":";
        }
    } else {
        sc = 'http:';
    }

    var client = new WmClient(sc, host, port, baseURI);
    // Test server connection and save important headers taken using getInfo function
    var data;
    client.getInfo(function (result, error) {
        if(!isUndefined(error)){
            return cb(undefined, error)
        }

        data = result;
        client.importantHeaders = data.importantHeaders;
        client.staticCaps = data.staticCaps;
        client.virtualCaps = data.virtualCaps;
        client.staticCaps.sort();
        client.virtualCaps.sort();
        cb(client, undefined);
    });
}

WmClient.prototype.getOptions = function (path, method) {
    return {
        protocol: this.scheme,
        host: this.host,
        port: this.port,
        method: method,
        path: path,
        timeout: this.httpTimeout,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};

checkData = function (jsonInfoData) {
    return jsonInfoData.wmVersion.length > 0 &&
        jsonInfoData.wurflAPIVersion.length > 0 &&
        jsonInfoData.wurflInfo.length > 0 &&
        jsonInfoData.staticCaps.length > 0;
};

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

    var capNames = [];
    var vcapNames = [];

    for (var i=0; i< caps.length; i++)
    {
        var name = caps[i];
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
};

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

    var capNames = [];

    for (var i=0; i< stCaps.length; i++)
    {
        var name = stCaps[i];
        if (this.hasStaticCapability(name))
        {
            capNames.push(name);
        }
    }
    this.reqStaticCaps = capNames;
};

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

    for (var i=0; i< vCaps.length; i++)
    {
        var name = vCaps[i];
        if (this.hasVirtualCapability(name))
        {
            vcapNames.push(name);
        }
    }
    this.reqVCaps = vcapNames;
};

/**
 * lookupRequest - detects a device and returns its data in JSON format
 * @param nodeReq
 * @param cb callback function that will be executed with the resulting JSONDeviceData structure
 * @returns {JSONDeviceData}
 */
WmClient.prototype.lookupRequest = function (nodeReq, cb) {
    // copy headers
    var lookupHeaders = {};
    for (var i = 0; i < this.importantHeaders.length; i++) {
        var name = this.importantHeaders[i];
        var h = nodeReq.headers[name.toLowerCase()];
        if (!isUndefined(h) && h.length > 0) {
            lookupHeaders[name] = h;
        }
    }
    var wmReq = new model.Request(lookupHeaders, this.reqStaticCaps, this.reqVCaps);
    var options = this.getOptions('/v2/lookuprequest/json', 'POST');
    this.genericRequest(options, wmReq, parseDevice, cb, "ua-cache", this);
};

/**
 * hasStaticCapability - returns true if the given capName exist in this client' static capability set, false otherwise
 * @param capName
 * @returns {boolean}
 */
WmClient.prototype.hasStaticCapability = function(capName){

    return this.staticCaps.indexOf(capName)!==-1;
};

/**
 * hasVirtualCapability - returns true if the given capName exist in this client' virtual capability set, false otherwise
 * @param vcapName
 * @returns {boolean}
 */
WmClient.prototype.hasVirtualCapability = function(vcapName){
    return this.virtualCaps.indexOf(vcapName)!==-1;
};

WmClient.prototype.getCapabilityCount = function(device){
    if(isUndefined(device) ||  (isUndefined(device.capabilities))){
        return 0;
    }
    return Object.keys(device.capabilities).length;
};

/**
 * getAllDeviceMakes returns identity data for all devices in WM server
 * @param cb callback that will be ccalled with the API call result
 */
WmClient.prototype.getAllDeviceMakes = function (cb) {
    this.getDeviceMakesMap(function(deviceMakesMap) {
        cb(Object.keys(deviceMakesMap))
    })
};


/**
 * getAllDevicesForMake Returns an array of an aggregate containing model_names + marketing_names for the given Make.
 * @param make
 * @param cb callback called on the API result
 */
WmClient.prototype.getAllDevicesForMake = function (make, cb) {
    this.getDeviceMakesMap(function(deviceMakesMap) {
        var ob = deviceMakesMap[make];
        if (isUndefined(ob)) {
            return cb(new Error('WM server error : ' + make + ' does not exist'));
        }
        cb(undefined, ob)
    })
};

WmClient.prototype.getDeviceMakesMap = function (cb) {
    var client = this;
    var options = client.getOptions('/v2/alldevices/json', 'GET');

    // Check if we have a value for deviceMakesMap
    if (!isUndefined(client.deviceMakesMap) && client.deviceMakesMap.length > 0) {
        // This returns a deep copy of make model, so that any changes to it are not reflected into our cached value
        return cb(JSON.parse(JSON.stringify(client.deviceMakesMap)))
    }

    var req = http.request(options, function (res) {
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var data = JSON.parse(body);
            var deviceMakesMap = {};
            for (var i = 0; i < data.length; i++) {
                var bn = data[i].brand_name;
                if (isUndefined(bn) || bn === null || bn === "") {
                    continue;
                }

                var modelMktName = new model.JSONModelMktName(
                    data[i].model_name,
                    data[i].marketing_name);
                if (isUndefined(deviceMakesMap[data[i].brand_name])) {
                    deviceMakesMap[data[i].brand_name] = [];
                }
                deviceMakesMap[data[i].brand_name].push(modelMktName);
            }

            client.deviceMakesMap = JSON.parse(JSON.stringify(deviceMakesMap));

            return cb(deviceMakesMap);
        });
    });
    req.on('error', function (e) {
        return resultCb(e, null)
    });

    req.end();
};

/**
 * getAllOSes returns of all devices device_os capabilities
 * @param cb
 * @returns []
 */
WmClient.prototype.getAllOSes = function (cb) {
    this.getDeviceOsVerMap(function(deviceOsVerMap) {
        return cb(Object.keys(deviceOsVerMap))
    })
};


/**
 * getAllVersionsForOS Returns an array of all devices device_os_version for a given device_os cap.
 * @param device_os
 * @param {function(Error, {[]string}} cb called when done
 */
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
            var data = JSON.parse(body);
            var deviceOsVerMap = {};
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
};

WmClient.prototype.genericRequest = function (options, reqData, parseCb, resultCb, cacheType, client) {

    var device = undefined;
    // If the caller function uses a cache, try a cache lookup
    if(!isUndefined(cacheType)) {
        var cacheKey = this.getUserAgentCacheKey(reqData.lookup_headers);
        if (cacheType === 'ua-cache' && !isUndefined(this.uaCache)) {
            device = this.uaCache.get(cacheKey);
        } else if (cacheType === 'dId-cache' && !isUndefined(this.devIdCache)) {
            cacheKey = reqData.wurfl_id;
            device = this.devIdCache.get(reqData.wurfl_id);
        }

        // cache has found a matching device, pass it to callback
        if (!isUndefined(device)) {
            return resultCb(device);
        }
    }

    // No device found in cache, let's try a server lookup
    var reqBody = '';
    if(!isUndefined(reqData)){
        reqBody = JSON.stringify(reqData);
    }

    var req = http.request(options, function (res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var result = parseCb(body);
            if(!isUndefined(result.error) && result.error.length > 0){
                return resultCb(undefined, new Error('WM server error :' + result.error));
            }

            if(!isUndefined(client)) {
                client.addToCache(cacheType, cacheKey, result);
            }
            return resultCb(result);
        });

    });
    req.on('error', function (e) {
        return resultCb(undefined,e);
    });

    if(reqBody.length > 0){
        req.write(reqBody);
    }

    req.end();
};

/**
 * getApiVersion, returns the API version
 * @returns {string}
 */
WmClient.prototype.getApiVersion = function () { return "2.1.0"; };

WmClient.prototype.clearCaches = function () {
    if (!isUndefined(this.uaCache)) {
        this.uaCache.reset();
    }

    if (!isUndefined(this.devIdCache)){
            this.devIdCache.reset();
    }

    this.deviceMakesMap = {};
    this.deviceOsVerMap = {};
};

WmClient.prototype.safePut = function(cacheType, ckey, cvalue){
    if(cacheType == 'ua-cache' && !isUndefined(this.uaCache)) {
        this.uaCache.set(ckey, cvalue);
        return;
    }

    if(cacheType == 'dId-cache' && !isUndefined(this.devIdCache)) {
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

function parseInfo(body) {
    var data = JSON.parse(body);
    var static_caps = data.static_caps === null ? [] : data.static_caps;
    var virtual_caps = data.virtual_caps === null ? [] : data.virtual_caps;
    var info = new model.JSONInfoData(
        data.wurfl_api_version,
        data.wurfl_info,
        data.wm_version,
        data.important_headers,
        static_caps,
        virtual_caps,
        data.ltime);
        if (!checkData(info)){
            throw Error("server returned invalid or empty data")
        }
    return info;
}

function parseDevice(body) {

    var data = JSON.parse(body);
    var device = new model.JSONDeviceData(
        data.apiVersion,
        data.capabilities,
        data.error,
        data.mtime,
        data.ltime);
    return device;
}

function endsWith(text, needle){

        return text.indexOf(needle, text.length - needle.length) !== -1;
}

function isUndefined(value) {
    return typeof value === "undefined"
}

WmClient.prototype.getUserAgentCacheKey = function (headers) {
    var cacheKey = '';
    var hname = ''
    for (let i = 0; i <this.importantHeaders.length; i++){
        hname = this.importantHeaders[i]
        var hval = headers[hname];
        if(!isUndefined(hval)){
            cacheKey += hval;
        }
    }
    return cacheKey;
};

WmClient.prototype.clearCachesIfNeeded = function (ltime) {
    if (!isUndefined(ltime) && ltime !== this.ltime) {
        this.clearCaches();
        this.ltime = ltime;
    }
};

WmClient.prototype.addToCache = function(cacheType, cacheKey, result) {
    // Clear cache if last load time of wurfl.xml on server has changed
    this.clearCachesIfNeeded(result.ltime);
    if(cacheType === 'ua-cache'){
        this.safePut(cacheType, cacheKey, result);
    }
    else if (cacheType === 'dId-cache'){
        this.safePut(cacheType, result.capabilities['wurfl_id'], result);
    }
}

/**
 * SetHTTPTimeout sets the connection and transfer timeouts for this client in seconds.
 * This function should be called before performing any connection to WM server
 * @param timeout
 */
WmClient.prototype.setHTTPTimeout = function (timeout) {
    if(!isUndefined(timeout) && timeout >= 10000) {
        this.httpTimeout = timeout;
    }
};

module.exports.create = create;
