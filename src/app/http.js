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
'use strict'

// Internal HTTP helper built on the runtime's fetch (Node >= 18, Bun, Deno).
// Errors keep the messages and the `response` property the axios based client threw,
// so callers that inspect them keep working.

/**
 * Sends a request and returns the parsed JSON body (or the raw text when it is not JSON).
 * @param method {string} GET or POST
 * @param url {string} full URL
 * @param body {object} request body, sent as JSON (POST only)
 * @param timeout {int} timeout in milliseconds
 * @return {Promise<*>} the response data
 */
async function request(method, url, body, timeout) {
    // new URL() throws "Invalid URL" for a malformed address, as axios did
    const target = new URL(url)
    const options = { method, headers: { 'Accept': 'application/json' } }
    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(body)
    }
    if (timeout > 0) {
        options.signal = AbortSignal.timeout(timeout)
    }

    // The timeout covers the whole exchange, body included: a server can send the headers
    // and then stall.
    let response
    let text
    try {
        response = await fetch(target, options)
        text = await response.text()
    } catch (error) {
        // Check the signal rather than the error: fetch rejects with a TimeoutError, but a
        // body read cut short by it can report an AbortError or a network error instead.
        if (options.signal && options.signal.aborted) {
            throw wrapError(`timeout of ${timeout}ms exceeded`, 'ECONNABORTED', error)
        }
        // fetch reports the system error (e.g. "connect ECONNREFUSED 127.0.0.1:8080") as its cause
        // (an AggregateError with an empty message when both IPv4 and IPv6 are refused).
        const cause = error.cause || error
        let message = cause.message || error.message
        if (cause.code && !message.includes(cause.code)) {
            message = `${cause.code}: ${message}`
        }
        throw wrapError(message, cause.code, error)
    }

    let data = text
    try {
        data = JSON.parse(text)
    } catch (ignored) {
        // Not JSON: return the text as it is
    }

    if (!response.ok) {
        const error = wrapError(`Request failed with status code ${response.status}`, 'ERR_BAD_RESPONSE')
        error.response = { status: response.status, statusText: response.statusText, data: data }
        throw error
    }
    return data
}

function wrapError(message, code, cause) {
    const error = new Error(message, cause ? { cause } : undefined)
    if (code) {
        error.code = code
    }
    return error
}

module.exports.get = (url, timeout) => request('GET', url, undefined, timeout)
module.exports.post = (url, body, timeout) => request('POST', url, body, timeout)
