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

/* This file contains all data structures used by the client.
 * Output model objects are not necessary, but we use them for generic compliance with other WM client properties and
 * to leverage some dev tool completion features.
 */



/**
 * JSONInfoData - server and API informations
 * @param wurflAPIVersion {string} the server API version
 * @param wurflInfo {string} WM server info string
 * @param wmVersion {string}
 * @param importantHeaders {Array} list of headers names that server sends to client in order to instruct it on which one send in its requests
 * @param staticCaps {Array} list of static capabilities exposed by the WM server
 * @param virtualCaps {Array} list of virtual capabilities exposed by the WM server
 * @param ltime {string} date time of last WM server data update
 * @constructor
 */
function JSONInfoData (wurflAPIVersion, wurflInfo, wmVersion, importantHeaders, staticCaps, virtualCaps, ltime) {
    this.wurflAPIVersion = wurflAPIVersion;
    this.wurflInfo = wurflInfo;
    this.wmVersion = wmVersion;
    this.importantHeaders = importantHeaders;
    this.staticCaps = staticCaps;
    this.virtualCaps = virtualCaps;
    this.ltime = ltime;
}

/**
 * This object is used as request payload in all API calls that need it
 * @param lookupHeaders {Object} key/value headers map (at least the User-Agent is mandatory)
 * @param requestedCaps {Array} static capabilities that the server should return
 * @param requestedVCaps {Array} virtual capabilities that the server should return
 * @param wurflID {string} the WURFL device ID (optional)
 * @constructor
 */
function Request(lookupHeaders, requestedCaps, requestedVCaps, wurflID) {
          this.lookup_headers = lookupHeaders;
          this.requested_caps = requestedCaps;
          this.requested_vCaps = requestedVCaps;
          this.wurfl_id = wurflID;
}

/**
 * JSONDeviceData models a WURFL device data in JSON format
 * @param wmAPIVersion {string} server API version
 * @param capabilities {Object} a key/value map of device capabilities
 * @param error {string} error message of any error occurred during detection
 * @param mtime {int} timestamp of detection object creation time
 * @param ltime {string} date time of last data update from WM server
 * @constructor
 */
function JSONDeviceData(wmAPIVersion, capabilities, error, mtime, ltime) {
	this.APIVersion = wmAPIVersion;
	this.capabilities = capabilities;
	this.error = error;
	this.mtime = mtime;
    this.ltime = ltime;
}

/**
 * JSONMakeModel models simple device "identity" data in JSON format
 * @param brandName {string} device brand name (eg: samsung)
 * @param modelName {string} device model name (eg: SM-951)
 * @param marketingName {string} device marketing name, if any (eg: Samsung Galaxy S21)
 * @constructor
 */
function JSONMakeModel(brandName, modelName, marketingName) {
    this.brandName = brandName;
    this.modelName  = modelName;
    this.marketingName = marketingName;
}

/**
 * JSONModelMktName holds model_name and marketing_name data in JSON format
 * @param modelName {string} device model name (eg: SM-951)
 * @param marketingName {string} device marketing name, if any (eg: Samsung Galaxy S21)
 * @constructor
 */
function JSONModelMktName(modelName, marketingName) {
    this.modelName  = modelName;
    this.marketingName = marketingName;
}

// Functions which will be available to external callers
module.exports.JSONInfoData = JSONInfoData;
module.exports.Request = Request;
module.exports.JSONDeviceData = JSONDeviceData;
module.exports.JSONModelMktName = JSONModelMktName;
