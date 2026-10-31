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

/**
 * LRUCache - a fixed size, least recently used cache.
 * Replaces the lru-cache 4.x dependency and keeps the part of its API the client
 * exposes through uaCache and devIdCache (get, set, has, del, reset, keys, itemCount, length).
 * A Map keeps insertion order, so the first key is always the least recently used one.
 * @param max {int} maximum number of entries
 * @constructor
 */
function LRUCache(max) {
    if (!(this instanceof LRUCache)) {
        return new LRUCache(max)
    }
    this.max = max > 0 ? max : Infinity
    this.map = new Map()
}

LRUCache.prototype.get = function (key) {
    if (!this.map.has(key)) {
        return undefined
    }
    const value = this.map.get(key)
    // Move the entry to the most recently used end
    this.map.delete(key)
    this.map.set(key, value)
    return value
}

LRUCache.prototype.set = function (key, value) {
    this.map.delete(key)
    this.map.set(key, value)
    while (this.map.size > this.max) {
        this.map.delete(this.map.keys().next().value)
    }
    return true
}

LRUCache.prototype.has = function (key) {
    return this.map.has(key)
}

LRUCache.prototype.del = function (key) {
    this.map.delete(key)
}

LRUCache.prototype.reset = function () {
    this.map.clear()
}

LRUCache.prototype.keys = function () {
    // Most recently used first, as lru-cache 4.x returns them
    return Array.from(this.map.keys()).reverse()
}

Object.defineProperty(LRUCache.prototype, 'itemCount', {
    get: function () {
        return this.map.size
    }
})

Object.defineProperty(LRUCache.prototype, 'length', {
    get: function () {
        return this.map.size
    }
})

module.exports = LRUCache
