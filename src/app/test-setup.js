'use strict'
// Jest globalSetup: decides whether the live suite (__tests__/wmclientTest.js) runs.
//
// WM_URL set:   the server must answer, or the run fails (you asked for it).
// WM_URL unset: try http://localhost:8080; run the live suite only if it answers.
//
// Test workers inherit process.env, so WM_LIVE and WM_URL reach the tests.
module.exports = async () => {
    const explicit = Boolean(process.env.WM_URL)
    const wmUrl = process.env.WM_URL || 'http://localhost:8080'
    const infoUrl = new URL('v2/getinfo/json', wmUrl.endsWith('/') ? wmUrl : wmUrl + '/')
    try {
        const response = await fetch(infoUrl, { signal: AbortSignal.timeout(3000) })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        process.env.WM_URL = wmUrl
        process.env.WM_LIVE = '1'
        console.log(`\nLive tests run against the WURFL Microservice at ${wmUrl}`)
    } catch (error) {
        if (explicit) {
            throw new Error(`WM_URL=${wmUrl} is not reachable: ${error.message}`)
        }
        process.env.WM_LIVE = '0'
        console.log(`\nNo WURFL Microservice at ${wmUrl}: live tests skipped (set WM_URL to run them)`)
    }
}
