export interface StoreVersion { appId: number; store: string; edition?: string }
type Row = { app_id?: number; store?: string; dedupe_group_id?: string; edition_label?: string; steam_owned_app_id?: number; steam_versions?: { app_id: number; edition_label?: string }[] };

/** Use Unifideck's explicit groups and owned-Steam bridges, without matching titles ourselves. */
export function storeVersions(raw: unknown, appId: number): StoreVersion[] {
    const value = raw as { success?: boolean; data?: unknown } | null;
    const rows = (Array.isArray(raw) ? raw : value?.success && Array.isArray(value.data) ? value.data : []) as Row[];
    const same = (a: unknown, b: number) => typeof a === 'number' && (a >>> 0) === (b >>> 0);
    const seed = rows.find((r) => same(r.app_id, appId)) ?? rows.find((r) => same(r.steam_owned_app_id, appId) || r.steam_versions?.some((v) => same(v.app_id, appId)));
    if (!seed) return [];
    const group = seed.dedupe_group_id ? rows.filter((r) => r.dedupe_group_id === seed.dedupe_group_id) : [seed];
    const versions = new Map<number, StoreVersion>();
    for (const row of group) {
        if (typeof row.app_id === 'number' && typeof row.store === 'string') versions.set(row.app_id >>> 0, { appId: row.app_id, store: row.store, edition: row.edition_label });
        const steam = row.steam_versions?.length ? row.steam_versions : row.steam_owned_app_id ? [{ app_id: row.steam_owned_app_id }] : [];
        for (const v of steam) versions.set(v.app_id >>> 0, { appId: v.app_id, store: 'steam', edition: v.edition_label });
    }
    return versions.size > 1 ? [...versions.values()].sort((a, b) => Number(b.store === 'steam') - Number(a.store === 'steam') || a.store.localeCompare(b.store)) : [];
}
let cache: { at: number; value: Promise<unknown> } | undefined;
let resolved: { raw: unknown; groups: Map<number, StoreVersion[]> } | undefined;

/** Last resolved local catalog, also usable while the 30-second refresh is in flight. */
export function peekStoreVersions(appId: number): StoreVersion[] | undefined {
    if (!resolved) return undefined;
    const id = appId >>> 0;
    let group = resolved.groups.get(id);
    if (!group) { group = storeVersions(resolved.raw, id); resolved.groups.set(id, group); }
    return group;
}

export function loadStoreVersions(appId: number): Promise<StoreVersion[]> {
    const backend = (globalThis as unknown as { DeckyBackend?: { call(...args: unknown[]): Promise<unknown> } }).DeckyBackend;
    if (!backend) return Promise.resolve([]);
    if (!cache || Date.now() - cache.at > 30_000) cache = { at: Date.now(), value: backend.call('loader/call_plugin_method', 'Unifideck', 'get_all_unifideck_games').then((raw) => {
        resolved = { raw, groups: new Map() };
        return raw;
    }).catch(() => resolved?.raw ?? null) };
    return cache.value.then((raw) => storeVersions(raw, appId));
}
