/** Local Steam ownership counts, retained while revisiting a game or refreshing its overview. */
type Entry = { count?: number; at: number; pending?: Promise<number> };
const counts = new Map<string, Entry>();
const MAX_AGE_MS = 30_000;
const nativeId = (id: number) => Number.isInteger(id) && id > 0 && id <= 0x7fffffff;
const keyFor = (id: number) => {
    const app = (globalThis as unknown as { App?: { m_CurrentUser?: { strSteamID?: string } } }).App;
    return `${app?.m_CurrentUser?.strSteamID ?? ''}:${id}`;
};
const availableLenders = (id: number): Promise<unknown> => {
    const family = (globalThis as unknown as { SteamClient?: { FamilySharing?: { GetAvailableLenders?(id: number): Promise<unknown> } } }).SteamClient?.FamilySharing;
    return family?.GetAvailableLenders ? family.GetAvailableLenders(id) : Promise.reject(new Error('Family service unavailable'));
};

export function peekFamilyCopyCount(appId: number): number | undefined {
    return nativeId(appId) ? counts.get(keyFor(appId))?.count : undefined;
}

export function loadFamilyCopyCount(appId: number, refresh = false, lookup = availableLenders): Promise<number> {
    if (!nativeId(appId)) return Promise.resolve(0);
    const key = keyFor(appId);
    let entry = counts.get(key);
    if (!entry) {
        entry = { at: 0 };
        counts.set(key, entry);
    }
    if (entry.pending) return entry.pending;
    if (!refresh && entry.count !== undefined && Date.now() - entry.at < MAX_AGE_MS) return Promise.resolve(entry.count);
    const target = entry;
    target.pending = Promise.resolve().then(() => lookup(appId)).then((lenders) => {
        if (!Array.isArray(lenders)) throw new Error('Family service returned no lender list');
        target.count = lenders.length;
        target.at = Date.now();
        return target.count;
    }).finally(() => { target.pending = undefined; });
    return target.pending;
}
