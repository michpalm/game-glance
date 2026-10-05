import { findModule } from '@decky/ui';
import { memoLookup } from './moduleLookup';
import { LOG_PREFIX } from '../constants';
import { mapSteamTrending, StoreInfo, TrendingCard } from './trending';

/**
 * Reads Steam's own "Trending among friends" list (stock Home's shelf, probed on the Ally): `window.trendingStore`
 * (TrendingApps; Steam fetches and stores it itself, for a day), names and prices from Steam's store item cache (the
 * class with HintLoadStoreApps, its singleton `Get()`; Steam loads the trending games into it), friends from
 * friendStore, and Steam's own "show store content on Home" setting (settingsStore.clientSettings). No requests of
 * our own. null: the source is missing or failed (Home then uses its derived list).
 */

type AnyFn = (...args: never[]) => unknown;
interface StoreItem {
    GetName?(): string;
    BIsFree?(): boolean;
    GetBestPurchaseOption?(): { discount_pct?: number; formatted_final_price?: string; formatted_original_price?: string } | null | undefined;
    GetAssets?(): { GetHeaderURL?(): string } | null | undefined;
}
interface StoreCache {
    BHasApp?(appId: number): boolean;
    GetApp?(appId: number): StoreItem | null | undefined;
}
type Globals = {
    trendingStore?: { TrendingApps?: unknown };
    settingsStore?: { clientSettings?: { show_store_content_on_home?: unknown } };
    appStore?: { GetAppOverviewByAppID?(appId: number): { display_name?: string; BIsOwned?(): boolean } | null | undefined };
    friendStore?: { allFriends?: Array<{ m_unAccountID?: number; display_name?: string; persona?: { avatar_url_medium?: string } }> };
};

const storeClass = memoLookup<{ Get?: AnyFn }>('store item cache', () => {
    const m = findModule((x: any) => x && typeof x.A === 'function' && typeof x.A.prototype?.HintLoadStoreApps === 'function' && typeof x.A.Get === 'function');
    return m ? m.A : null;
});

function storeCache(): StoreCache | null {
    try {
        return (storeClass()?.Get?.() as StoreCache | undefined) ?? null;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not read Steam's store item cache`, error);
        return null;
    }
}

function storeInfo(cache: StoreCache | null, appId: number): StoreInfo | null {
    try {
        if (!cache?.BHasApp?.(appId)) return null;
        const item = cache.GetApp?.(appId);
        if (!item) return null;
        const option = item.GetBestPurchaseOption?.() ?? null;
        return {
            name: item.GetName?.() ?? '',
            header: item.GetAssets?.()?.GetHeaderURL?.() || null,
            free: item.BIsFree?.() === true,
            discountPct: Number(option?.discount_pct) || 0,
            finalPrice: option?.formatted_final_price ?? '',
            originalPrice: option?.formatted_original_price ?? '',
        };
    } catch {
        return null;
    }
}

/** Steam's trending list as cards (trending.mapSteamTrending), or null when the source is missing or throws. */
export function readSteamTrending(): TrendingCard[] | null {
    try {
        const g = globalThis as unknown as Globals;
        const apps = g.trendingStore?.TrendingApps;
        if (!Array.isArray(apps)) return null;
        const cache = storeCache();
        const friends = new Map((g.friendStore?.allFriends ?? []).map((f) => [Number(f.m_unAccountID), f]));
        return mapSteamTrending(apps, {
            owned: (id) => {
                try {
                    return g.appStore?.GetAppOverviewByAppID?.(id)?.BIsOwned?.() === true;
                } catch {
                    return false;
                }
            },
            libraryName: (id) => g.appStore?.GetAppOverviewByAppID?.(id)?.display_name ?? '',
            store: (id) => storeInfo(cache, id),
            friend: (id) => {
                const f = friends.get(id);
                return f ? { name: String(f.display_name ?? ''), avatarUrl: f.persona?.avatar_url_medium ?? null } : null;
            },
        }, g.settingsStore?.clientSettings?.show_store_content_on_home !== false);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not read Steam's trending list`, error);
        return null;
    }
}
