import { findModule } from '@decky/ui';
import type { SetSchema, SetUser } from '../achievementSets';
import type { PageRates } from '../achievementsPage';

/**
 * A game's Achievement Sets from Steam's own queries (probed on the Deck 2026-11-17, ledger in memory
 * achievement-sets-data). Steam's achievements page keeps the set list under ["achievements", appid, "schema"] and the
 * player's progress under ["achievements", appid, "user_achievements", steamid] in its react-query client; Steam's
 * own prefetch functions fill them, the same requests its page makes. Nothing is written; the Steam id is never logged.
 */
type Prefetch = {
    schema(client: unknown, transport: unknown, appId: number): Promise<unknown>;
    user(client: unknown, transport: unknown, appId: number, steamId: string): Promise<unknown>;
};
type RatesLoader = (transport: unknown, appId: number) => Promise<unknown>;
export interface SetsSteam {
    client(): { getQueryData(key: unknown[]): unknown; fetchQuery?(options: { queryKey: unknown[]; queryFn(): Promise<unknown>; staleTime?: number }): Promise<unknown> } | null;
    transport(): unknown;
    steamId(): string | null;
    prefetch(): Prefetch | null;
    /** Steam's loader for the share of players with each achievement (its query "globalpercentages"). */
    rates(): RatesLoader | null;
}
export interface SetsData { schema: SetSchema; user: SetUser }

export function createAchievementSets(steam: SetsSteam) {
    const pending = new Map<number, Promise<SetsData | null>>();
    function read(appId: number): SetsData | null {
        try {
            const client = steam.client(), id = steam.steamId();
            if (!client || !id) return null;
            const schema = client.getQueryData(['achievements', appId, 'schema']) as SetSchema | undefined;
            const user = client.getQueryData(['achievements', appId, 'user_achievements', id]) as SetUser | undefined;
            return schema && user ? { schema, user } : null;
        } catch { return null; }
    }
    function load(appId: number): Promise<SetsData | null> {
        if (!Number.isInteger(appId) || appId <= 0) return Promise.resolve(null);
        const known = read(appId);
        if (known) return Promise.resolve(known);
        let job = pending.get(appId);
        if (!job) {
            job = (async () => {
                try {
                    const client = steam.client(), id = steam.steamId(), prefetch = steam.prefetch();
                    if (!client || !id || !prefetch) return null;
                    const transport = steam.transport();
                    await Promise.all([prefetch.schema(client, transport, appId), prefetch.user(client, transport, appId, id)]);
                    return read(appId);
                } catch { return null; }
                finally { pending.delete(appId); }
            })();
            pending.set(appId, job);
        }
        return job;
    }
    const ratesKey = (appId: number) => ['achievements', appId, 'globalpercentages'];
    function readRates(appId: number): PageRates | null {
        try { const v = steam.client()?.getQueryData(ratesKey(appId)) as PageRates | undefined; return v && typeof v.percentages === 'object' ? v : null; } catch { return null; }
    }
    /** As Steam's page loads them: its key, its loader, kept a day (Steam's staleTime). */
    async function loadRates(appId: number): Promise<PageRates | null> {
        if (!Number.isInteger(appId) || appId <= 0) return null;
        try {
            const known = readRates(appId);
            if (known) return known;
            const client = steam.client(), loader = steam.rates();
            if (!client?.fetchQuery || !loader) return null;
            const transport = steam.transport();
            await client.fetchQuery({ queryKey: ratesKey(appId), queryFn: () => loader(transport, appId), staleTime: 86_400_000 });
            return readRates(appId);
        } catch { return null; }
    }
    return { read, load, readRates, loadRates };
}

// Steam's prefetches, found by shape: `async function E(client, transport, appid){await prefetch(client, options(transport, appid))}`,
// and the same with the Steam id for the player's progress (Steam's names change with every build).
const SCHEMA = /^async function [\w$]+\([\w$]+,[\w$]+,[\w$]+\)\{await\(0,[\w$]+\.[\w$]+\)\([\w$]+,[\w$]+\([\w$]+,[\w$]+\)\)\}$/;
const USER = /^async function [\w$]+\([\w$]+,[\w$]+,[\w$]+,[\w$]+\)\{await\(0,[\w$]+\.[\w$]+\)\([\w$]+,[\w$]+\([\w$]+,[\w$]+,[\w$]+\)\)\}$/;
const source = (f: unknown) => { try { return typeof f === 'function' ? Function.prototype.toString.call(f) : ''; } catch { return ''; } };
let prefetchFound: Prefetch | null | undefined;
function steamPrefetch(): Prefetch | null {
    if (prefetchFound !== undefined) return prefetchFound;
    try {
        const pick = (m: unknown, re: RegExp) => Object.values(m as object).find(f => re.test(source(f))) as Prefetch[keyof Prefetch] | undefined;
        // Steam's achievements module also holds its page's query hooks: both prefetches must be in the same one.
        const mod = findModule((m: unknown) => !!m && typeof m === 'object' && !!pick(m, SCHEMA) && !!pick(m, USER));
        prefetchFound = mod ? { schema: pick(mod, SCHEMA) as Prefetch['schema'], user: pick(mod, USER) as Prefetch['user'] } : null;
    } catch { prefetchFound = null; }
    return prefetchFound;
}

let ratesFound: RatesLoader | null | undefined;
/** Steam's loader calls its achievements service by name; the name is the one thing a Steam build does not rename. */
function steamRates(): RatesLoader | null {
    if (ratesFound !== undefined) return ratesFound;
    try {
        const isLoader = (f: unknown) => /^async function [\w$]+\([\w$]+,[\w$]+\)\{/.test(source(f)) && source(f).includes('.GetGlobalAchievementPercentages(');
        const mod = findModule((m: unknown) => !!m && typeof m === 'object' && Object.values(m as object).some(isLoader));
        ratesFound = mod ? (Object.values(mod as object).find(isLoader) as RatesLoader) : null;
    } catch { ratesFound = null; }
    return ratesFound;
}

interface CmInterface { GetServiceTransport?(): unknown; steamid?: { ConvertTo64BitString?(): string } }
const cm = () => (globalThis as { appAchievementProgressCache?: { m_CMInterface?: CmInterface } }).appAchievementProgressCache?.m_CMInterface;

type QueryClient = ReturnType<SetsSteam['client']> & object;
type Fiber = { memoizedProps?: { client?: unknown } | null; return?: Fiber | null };
let clientFound: QueryClient | null = null;
/** Steam's react-query client: held by a provider above every page, so any element of Steam's main window leads up to it. */
function steamClient(): QueryClient | null {
    if (clientFound) return clientFound;
    try {
        const doc = (globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { BrowserWindow?: Window } } } })
            .SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow?.document;
        const divs = doc?.getElementsByTagName('div');
        const el = divs?.length ? divs[divs.length - 1] as unknown as Element & Record<string, unknown> : null;
        const key = el && Object.keys(el).find(k => k.startsWith('__reactFiber'));
        let fiber = (key ? el[key] : null) as Fiber | null;
        for (let i = 0; fiber && i < 5000; i++, fiber = fiber.return ?? null) {
            const c = fiber.memoizedProps?.client as { getQueryCache?: unknown; getQueryData?: unknown } | undefined;
            if (c && typeof c.getQueryCache === 'function' && typeof c.getQueryData === 'function') { clientFound = c as QueryClient; break; }
        }
    } catch { /* No sets: the tile keeps its single bar. */ }
    return clientFound;
}

export const achievementSets = createAchievementSets({
    client: steamClient,
    transport: () => cm()?.GetServiceTransport?.(),
    steamId: () => { const id = cm()?.steamid?.ConvertTo64BitString?.(); return typeof id === 'string' && id !== '' && id !== '0' ? id : null; },
    prefetch: steamPrefetch,
    rates: steamRates,
});
