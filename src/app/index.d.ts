// Type definitions for wmclient, the WURFL Microservice client for Node.js.

/** Information about the WURFL Microservice server, from getInfo(). */
export interface JSONInfoData {
    wurflAPIVersion: string;
    wurflInfo: string;
    wmVersion: string;
    /** Header names the server uses for detection. */
    importantHeaders: string[];
    staticCaps: string[];
    virtualCaps: string[];
    /** Load time of the WURFL data on the server. */
    ltime: string;
}

/** A detected device. Capability values are strings, e.g. "true" or "Smartphone". */
export interface JSONDeviceData {
    APIVersion: string;
    capabilities: Record<string, string>;
    error: string;
    mtime: number;
    ltime: string;
}

export interface JSONModelMktName {
    modelName: string;
    marketingName: string;
}

/** A request to detect from: a Node.js request (lowercase header names) or a Fetch API Request. */
export interface LookupRequest {
    headers: Record<string, string | string[] | undefined> | { get(name: string): string | null };
}

/** The cache behind uaCache and devIdCache (the lru-cache 4.x API subset it keeps). */
export interface DeviceCache {
    get(key: string): JSONDeviceData | undefined;
    set(key: string, value: JSONDeviceData): boolean;
    has(key: string): boolean;
    del(key: string): void;
    reset(): void;
    keys(): string[];
    readonly itemCount: number;
    readonly length: number;
}

export interface WmClient {
    scheme: string;
    host: string;
    port: string;
    baseURI: string;
    importantHeaders: string[];
    staticCaps: string[];
    virtualCaps: string[];
    reqStaticCaps: string[] | null;
    reqVCaps: string[] | null;
    uaCache: DeviceCache | undefined;
    devIdCache: DeviceCache | undefined;
    /** HTTP timeout in milliseconds (default 10000). */
    httpTimeout: number;
    ltime?: string;

    getInfo(): Promise<JSONInfoData>;
    lookupRequest(request: LookupRequest): Promise<JSONDeviceData>;
    lookupUserAgent(userAgent: string): Promise<JSONDeviceData>;
    lookupDeviceID(wurflId: string): Promise<JSONDeviceData>;

    /** @deprecated Use setRequestedStaticCapabilities and setRequestedVirtualCapabilities. */
    setRequestedCapabilities(caps: string[] | null | undefined): void;
    setRequestedStaticCapabilities(caps: string[] | null | undefined): void;
    setRequestedVirtualCapabilities(caps: string[] | null | undefined): void;
    hasStaticCapability(capName: string): boolean;
    hasVirtualCapability(capName: string): boolean;
    getCapabilityCount(device: JSONDeviceData | undefined): number;

    getAllDeviceMakes(): Promise<string[]>;
    getAllDevicesForMake(make: string): Promise<JSONModelMktName[]>;
    getAllOSes(): Promise<string[]>;
    getAllVersionsForOS(deviceOs: string): Promise<string[]>;

    /** Enables the device caches: uaMaxEntries for lookups by headers, 20000 for lookups by WURFL ID. */
    setCacheSize(uaMaxEntries: number): void;
    clearCaches(): void;
    clearCachesIfNeeded(ltime: string | undefined): void;
    /** Values under 10000 are ignored. */
    setHTTPTimeout(timeout: number): void;
    getApiVersion(): string;
}

/**
 * Creates a client and loads the server info.
 * @param scheme "http" or "https" (the trailing ":" is optional; empty means http)
 * @param baseURI extra path in front of the API paths, or ""
 */
export function create(scheme: string, host: string, port: string, baseURI: string): Promise<WmClient>;
