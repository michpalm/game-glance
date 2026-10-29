import { modules as deckyModules } from '@decky/ui';
import type { AccountLink } from '../notificationsList';

interface AccountStore { MarkAllItemsRead(): unknown; MarkAllItemsViewed(): unknown; MarkItemRead(id: string | number): unknown }
type LinkEntry = { link?: unknown } | undefined;
export interface ModuleSource { modules(): Iterable<[string, unknown]>; source(id: string): string | undefined }
export interface NotificationActions { markRead(id: string | number): void; markAllRead(): void; link: AccountLink }

const isStore = (value: unknown): value is AccountStore => !!value && typeof value === 'object'
    && typeof (value as AccountStore).MarkAllItemsRead === 'function' && typeof (value as AccountStore).MarkAllItemsViewed === 'function' && typeof (value as AccountStore).MarkItemRead === 'function';
// The account link table's exported lookup, `function b(e){if(e!==void 0)return S[e]}` (module 64884).
const LOOKUP = /^function \w+\(\w+\)\{if\(\w+!==void 0\)return \w+\[\w+\]\}$/;
function exportsOf(value: unknown): unknown[] {
    if (!value || typeof value !== 'object') return [];
    const out: unknown[] = [];
    for (const target of [(value as { default?: unknown }).default, value]) {
        if (!target || typeof target !== 'object') continue;
        for (const key of Object.keys(target)) { try { out.push((target as Record<string, unknown>)[key]); } catch { /* a throwing getter is not ours */ } }
    }
    return out;
}

/** Steam's account notification store and link table, found by method names and source text once, then cached. */
export function createNotificationActions(source: ModuleSource): NotificationActions {
    let store: AccountStore | null | undefined, lookups: ((type: number) => LinkEntry)[] | undefined;
    function findStore(): AccountStore | null {
        if (store !== undefined) return store;
        store = null;
        try { for (const [, value] of source.modules()) { const found = exportsOf(value).find(isStore); if (found) { store = found as AccountStore; break; } } } catch { store = null; }
        return store;
    }
    // Module 64884 exports more than one table with this lookup shape (K9 links, aq without links): keep them all.
    function findLookups() {
        if (lookups) return lookups;
        const found: ((type: number) => LinkEntry)[] = [];
        try {
            for (const [id, value] of source.modules()) {
                const text = source.source(id);
                if (!text || !text.includes('displayNameLoc') || !text.includes('link:')) continue;
                for (const item of exportsOf(value)) if (typeof item === 'function' && LOOKUP.test(Function.prototype.toString.call(item))) found.push(item as (type: number) => LinkEntry);
            }
        } catch { /* keep what was found */ }
        return lookups = found;
    }
    const attempt = (run: () => unknown) => { try { run(); } catch (error) { console.warn('[Game Glance] notification read-mark failed', error); } };
    return {
        markRead(id) { const found = findStore(); if (found) attempt(() => found.MarkItemRead(id)); },
        markAllRead() { const found = findStore(); if (!found) return; attempt(() => found.MarkAllItemsRead()); attempt(() => found.MarkAllItemsViewed()); },
        link(type, body) {
            try {
                let entry: LinkEntry;
                for (const lookup of findLookups()) { const candidate = lookup(type); if (candidate && typeof candidate.link === 'function') { entry = candidate; break; } }
                const url = entry ? (entry.link as (body: unknown) => unknown)(body) : null;
                return typeof url === 'string' && url ? url : null;
            } catch { return null; }
        },
    };
}

type WebpackRequire = { m?: Record<string, unknown> };
let webpackRequire: WebpackRequire | null | undefined;
/** Module factories' source, through webpack's own runtime (the same chunk push @decky/ui uses to load modules). */
function factorySource(id: string): string | undefined {
    if (webpackRequire === undefined) {
        webpackRequire = null;
        try { (globalThis as unknown as { webpackChunksteamui?: unknown[] }).webpackChunksteamui?.push([[Symbol('game-glance')], {}, (r: WebpackRequire) => { webpackRequire = r; }]); } catch { webpackRequire = null; }
    }
    const factory = webpackRequire?.m?.[id];
    try { return typeof factory === 'function' ? Function.prototype.toString.call(factory) : undefined; } catch { return undefined; }
}
export function nativeNotificationActions(): NotificationActions {
    return createNotificationActions({ modules: () => deckyModules.entries(), source: factorySource });
}
