/** Steam's notification tray (NotificationStore.m_rgNotificationTray), read as plain rows for the menu's page. */
export interface TrayRow { id: string; kind: 'wishlist' | 'other'; appId: number | null; count: number; time: number; unread: boolean }
export interface SaleInfo { name: string; price?: string }

type AnyRecord = Record<string, unknown> | undefined | null;
const record = (value: unknown): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null);
const parse = (text: unknown): AnyRecord => { try { return typeof text === 'string' ? record(JSON.parse(text)) : null; } catch { return null; } };

/** Steam rolls notifications up per kind; each group's first entry is what its own tab shows. */
export function readTray(tray: unknown): TrayRow[] {
    if (!Array.isArray(tray)) return [];
    const rows: TrayRow[] = [];
    for (const group of tray) {
        const first = record(Array.isArray(record(group)?.notifications) ? (record(group)!.notifications as unknown[])[0] : null);
        if (!first) continue;
        const data = record(first.data);
        const time = Number(data?.timestamp ?? first.rtCreated);
        const unread = first.bNewIndicator === true || (Array.isArray(data?.rgunread) && data!.rgunread.length > 0);
        // A wishlist sale carries the game and how many wishlist games are on sale (the shape Steam's
        // own tab renders as "Wishlist Sale"); classify by that shape, not by an enum number.
        const body = parse(record(data?.item)?.body_data);
        const appId = Number(body?.appid), count = Number(body?.count);
        const wishlist = Number.isInteger(appId) && appId > 0 && Number.isInteger(count) && count > 0 && Array.isArray(body?.appids);
        rows.push({ id: String(first.notificationID ?? rows.length), kind: wishlist ? 'wishlist' : 'other', appId: wishlist ? appId : null, count: wishlist ? count : 1, time: Number.isFinite(time) ? time : 0, unread });
    }
    return rows;
}

export function rowTime(time: number, now = new Date()): string {
    if (!time) return '';
    const date = new Date(time * 1000);
    const today = date.toDateString() === now.toDateString();
    return today ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function rowText(row: TrayRow, sale: SaleInfo | null | undefined, now = new Date()): { label: string; title: string; action: string } {
    const when = rowTime(row.time, now);
    if (row.kind === 'other') return { label: when ? `Steam · ${when}` : 'Steam', title: 'Steam notification', action: 'Open in Steam' };
    const label = when ? `Wishlist sale · ${when}` : 'Wishlist sale';
    if (row.count > 1) return { label, action: `See all ${row.count}`, title: sale ? `${sale.name} and ${row.count - 1} other games are on sale` : `${row.count} games on your wishlist are on sale` };
    return { label, action: 'View in store', title: !sale ? 'A game on your wishlist is on sale' : sale.price ? `${sale.name} is on sale for ${sale.price}` : `${sale.name} is on sale` };
}

/** Steam's store appdetails answer for one app: its name, and its price while discounted. */
export function parseSale(json: unknown, appId: number): SaleInfo | null {
    const entry = record(record(json)?.[String(appId)]);
    const data = record(entry?.data);
    if (entry?.success !== true || typeof data?.name !== 'string' || !data.name) return null;
    const overview = record(data.price_overview);
    const price = Number(overview?.discount_percent) > 0 && typeof overview?.final_formatted === 'string' && overview.final_formatted ? overview.final_formatted : undefined;
    return price ? { name: data.name, price } : { name: data.name };
}
