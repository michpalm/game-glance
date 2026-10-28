import { fetchNoCors } from '@decky/api';
import { parseSale, type SaleInfo } from '../notificationsList';

const REQUEST_TIMEOUT_MS = 8_000;
const timeout = <T>(work: Promise<T>) => Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(Error('timed out')), REQUEST_TIMEOUT_MS))]);

/** One store lookup per game for the session; any failure answers null so the row keeps its plain sentence. */
export function createSaleLookup(fetcher: typeof fetchNoCors) {
    const known = new Map<number, Promise<SaleInfo | null>>();
    return (appId: number): Promise<SaleInfo | null> => {
        let pending = known.get(appId);
        if (!pending) {
            pending = (async () => {
                try {
                    const response = await timeout(Promise.resolve().then(() => fetcher(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic,price_overview`)));
                    if (response.status !== 200) return null;
                    return parseSale(await timeout(Promise.resolve().then(() => response.json())), appId);
                } catch { return null; }
            })();
            known.set(appId, pending);
        }
        return pending;
    };
}
export const lookupSale = createSaleLookup(fetchNoCors);
