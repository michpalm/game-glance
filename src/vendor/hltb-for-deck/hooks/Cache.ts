// Shim for hltb-for-deck's hooks/Cache.ts (MIT, see THIRD_PARTY_LICENSES.md).
// Only the API-bootstrap cache used by HltbApi.ts, stored through Game Glance's
// backend KV under the "cache:" prefix so "Clear cached data" also resets it.
import { backendKv } from '../../../data/kv';

const KEY = 'cache:hltb-api-bootstrap';

export interface ApiBootstrapSearchAuth {
    searchUrl: string;
    token: string;
    hpKey?: string;
    hpVal?: string;
}

export interface ApiBootstrapCache {
    searchUrl?: string;
    searchAuth?: ApiBootstrapSearchAuth;
    nextJsKey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function isApiBootstrapSearchAuth(value: unknown): value is ApiBootstrapSearchAuth {
    if (!isRecord(value)) {
        return false;
    }
    return typeof value.searchUrl === 'string' && typeof value.token === 'string';
}

function normalizeApiBootstrapCache(value: unknown): ApiBootstrapCache | null {
    if (!isRecord(value)) {
        return null;
    }
    const normalized: ApiBootstrapCache = {};
    if (typeof value.searchUrl === 'string') {
        normalized.searchUrl = value.searchUrl;
    }
    if (typeof value.nextJsKey === 'string') {
        normalized.nextJsKey = value.nextJsKey;
    }
    if (isApiBootstrapSearchAuth(value.searchAuth)) {
        normalized.searchAuth = {
            searchUrl: value.searchAuth.searchUrl,
            token: value.searchAuth.token,
        };
        if (
            typeof value.searchAuth.hpKey === 'string' &&
            value.searchAuth.hpKey &&
            typeof value.searchAuth.hpVal === 'string' &&
            value.searchAuth.hpVal
        ) {
            normalized.searchAuth.hpKey = value.searchAuth.hpKey;
            normalized.searchAuth.hpVal = value.searchAuth.hpVal;
        }
    }
    return normalized;
}

export async function getApiBootstrapCache(): Promise<ApiBootstrapCache | null> {
    const raw = await backendKv.get(KEY);
    if (raw === null || raw === undefined) {
        return null;
    }
    const normalized = normalizeApiBootstrapCache(raw);
    if (normalized !== null) {
        return normalized;
    }
    await backendKv.delete(KEY);
    return null;
}

export async function updateApiBootstrapCache(patch: Partial<ApiBootstrapCache>) {
    const current = (await getApiBootstrapCache()) ?? {};
    await backendKv.set(KEY, { ...current, ...patch });
}

export async function clearApiBootstrapCache(...fields: Array<'searchUrl' | 'searchAuth' | 'nextJsKey'>) {
    if (fields.length === 0) {
        await backendKv.delete(KEY);
        return;
    }
    const current = await getApiBootstrapCache();
    if (current === null) {
        return;
    }
    const next: ApiBootstrapCache = { ...current };
    for (const field of fields) {
        delete next[field];
    }
    await backendKv.set(KEY, next);
}
