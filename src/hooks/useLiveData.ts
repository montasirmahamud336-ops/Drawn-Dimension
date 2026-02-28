import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const sortByDisplayOrder = (items: any[]) => {
    return [...items].sort((a, b) => {
        const aOrder = Number(a?.display_order);
        const bOrder = Number(b?.display_order);

        const aHasOrder = Number.isFinite(aOrder);
        const bHasOrder = Number.isFinite(bOrder);

        if (aHasOrder && bHasOrder) {
            if (aOrder !== bOrder) return aOrder - bOrder;
        } else if (aHasOrder) {
            return -1;
        } else if (bHasOrder) {
            return 1;
        }

        const aCreated = new Date(a?.created_at ?? 0).getTime();
        const bCreated = new Date(b?.created_at ?? 0).getTime();
        return bCreated - aCreated;
    });
};

type UseLiveDataOptions = {
    params?: Record<string, string | number | boolean | null | undefined>;
    cacheTimeMs?: number;
    revalidate?: boolean;
};

type LiveDataParams = NonNullable<UseLiveDataOptions["params"]>;

const DEFAULT_CACHE_TIME_MS = 90_000;
const liveDataCache = new Map<string, { data: any[]; updatedAt: number }>();
const inFlightRequests = new Map<string, Promise<any[]>>();

const buildParamsEntries = (params: LiveDataParams) =>
    Object.entries(params)
        .filter(([, value]) => {
            if (value === null || value === undefined) return false;
            return String(value).trim() !== "";
        })
        .map(([key, value]) => [key, String(value)] as const)
        .sort(([a], [b]) => a.localeCompare(b));

const getRequestKey = (endpoint: string, params: LiveDataParams) => {
    const entries = buildParamsEntries(params);
    if (!entries.length) return endpoint;
    const serialized = entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");
    return `${endpoint}?${serialized}`;
};

const buildUrl = (endpoint: string, params: LiveDataParams) => {
    const apiBase = getApiBaseUrl();
    const query = new URLSearchParams({ status: "live" });

    buildParamsEntries(params).forEach(([key, value]) => {
        query.set(key, value);
    });

    const separator = endpoint.includes("?") ? "&" : "?";
    return `${apiBase}/${endpoint}${separator}${query.toString()}`;
};

const fetchLiveData = async (endpoint: string, params: LiveDataParams) => {
    const requestKey = getRequestKey(endpoint, params);
    const existing = inFlightRequests.get(requestKey);
    if (existing) {
        return existing;
    }

    const request = (async () => {
        const res = await window.fetch(buildUrl(endpoint, params));
        if (!res.ok) {
            throw new Error(`Failed to fetch live data for ${endpoint}`);
        }

        const json = await res.json();
        const nextData = Array.isArray(json) ? sortByDisplayOrder(json) : [];
        liveDataCache.set(requestKey, { data: nextData, updatedAt: Date.now() });
        return nextData;
    })();

    inFlightRequests.set(requestKey, request);

    try {
        return await request;
    } finally {
        inFlightRequests.delete(requestKey);
    }
};

export const warmLiveData = async (endpoint: string, options: UseLiveDataOptions = {}) => {
    const params = options.params ?? {};
    const cacheTimeMs = options.cacheTimeMs ?? DEFAULT_CACHE_TIME_MS;
    const requestKey = getRequestKey(endpoint, params);
    const cached = liveDataCache.get(requestKey);
    const isFresh = cached && Date.now() - cached.updatedAt <= cacheTimeMs;

    if (isFresh) {
        return cached.data;
    }

    try {
        return await fetchLiveData(endpoint, params);
    } catch (e) {
        console.error(e);
        return cached?.data ?? [];
    }
};

// Hook to fetch live data
export const useLiveData = (endpoint: string, options: UseLiveDataOptions = {}) => {
    const params = options.params ?? {};
    const requestKey = getRequestKey(endpoint, params);
    const cacheTimeMs = options.cacheTimeMs ?? DEFAULT_CACHE_TIME_MS;
    const revalidate = options.revalidate ?? true;
    const cached = liveDataCache.get(requestKey);

    const [data, setData] = useState<any[]>(cached?.data ?? []);
    const [loading, setLoading] = useState(!cached);

    useEffect(() => {
        let cancelled = false;
        const cachedEntry = liveDataCache.get(requestKey);
        const isFresh = cachedEntry && Date.now() - cachedEntry.updatedAt <= cacheTimeMs;

        if (cachedEntry) {
            setData(cachedEntry.data);
            setLoading(false);
            if (isFresh && !revalidate) {
                return () => {
                    cancelled = true;
                };
            }
        } else {
            setLoading(true);
        }

        const load = async () => {
            try {
                const nextData = await fetchLiveData(endpoint, params);
                if (!cancelled) {
                    setData(nextData);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [endpoint, requestKey, cacheTimeMs, revalidate]);

    return { data, loading };
};
