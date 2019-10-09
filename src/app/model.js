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
 * @param wurflAPIVersion
 * @param wurflInfo
 * @param wmVersion
 * @param importantHeaders
 * @param staticCaps
 * @param virtualCaps
 * @param ltime
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

function Request(lookupHeaders, requestedCaps, requestedVCaps, wurflID, tacCode) {
          this.lookup_headers = lookupHeaders;
          this.requested_caps = requestedCaps;
          this.requested_vCaps = requestedVCaps;
          this.wurfl_id = wurflID;
          this.tac_code = tacCode;
}

/**
 * JSONDeviceData models a WURFL device data in JSON format
 * @param capabilities
 * @param error
 * @param mtime
 * @param ltime
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
 * @param brandName
 * @param modelName
 * @param marketingName
 * @constructor
 */
function JSONMakeModel(brandName, modelName, marketingName) {
    this.brandName = brandName;
    this.modelName  = modelName;
    this.marketingName = marketingName;
}

/**
 * JSONModelMktName holds model_name and marketing_name data in JSON format
 * @param modelName
 * @param marketingName
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
