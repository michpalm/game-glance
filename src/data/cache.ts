import { backendKv, KvBackend } from './kv';

export const DAY_MS = 86_400_000;
export const TTL = {
    hltbFound: 3650 * DAY_MS, // kept: shown even when old, refreshed in the background after hltbRefresh
    hltbRefresh: 30 * DAY_MS,
    hltbNotFound: DAY_MS,
    description: 365 * DAY_MS, // descriptions rarely change; kept so pre-loaded ones last
    steamMatch: 365 * DAY_MS,
    steamMatchMiss: DAY_MS,
    accent: 3650 * DAY_MS,
    accentMiss: DAY_MS,
    friendLast: 3650 * DAY_MS, // a friend's last game stays until they play something else
    wishlist: 6 * 3_600_000,
    wishlistEmpty: 30 * 60_000, // private, empty or no discounts: retry soon, but not on every Home open
};

const CACHE_PREFIX = 'cache:';
const OVERRIDE_PREFIX = 'override:hltb:';

interface Entry {
    v: unknown;
    exp: number;
}

function isEntry(value: unknown): value is Entry {
    return typeof value === 'object' && value !== null && typeof (value as Entry).exp === 'number' && 'v' in value;
}

export interface Cache {
    get<T>(key: string): Promise<T | null>;
    put<T>(key: string, value: T, ttlMs: number): Promise<void>;
    clear(): Promise<void>;
}

export function createCache(kv: KvBackend, now: () => number = Date.now): Cache {
    return {
        async get<T>(key: string): Promise<T | null> {
            const entry = await kv.get(CACHE_PREFIX + key);
            if (!isEntry(entry) || entry.exp <= now()) return null;
            return entry.v as T;
        },
        async put<T>(key: string, value: T, ttlMs: number): Promise<void> {
            await kv.set(CACHE_PREFIX + key, { v: value, exp: now() + ttlMs });
        },
        async clear(): Promise<void> {
            await kv.deletePrefix(CACHE_PREFIX);
        },
    };
}

export interface Overrides {
    get(appId: number): Promise<number | null>;
    set(appId: number, hltbId: number): Promise<void>;
    remove(appId: number): Promise<void>;
    subscribe(listener: () => void): () => void;
    version(): number;
}

export function createOverrides(kv: KvBackend): Overrides {
    let version = 0;
    const listeners = new Set<() => void>();
    const bump = () => {
        version++;
        listeners.forEach((listener) => listener());
    };
    return {
        async get(appId) {
            const value = await kv.get(OVERRIDE_PREFIX + appId);
            return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
        },
        async set(appId, hltbId) {
            await kv.set(OVERRIDE_PREFIX + appId, hltbId);
            bump();
        },
        async remove(appId) {
            await kv.delete(OVERRIDE_PREFIX + appId);
            bump();
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        version: () => version,
    };
}

export const cache = createCache(backendKv);
export const overrides = createOverrides(backendKv);
