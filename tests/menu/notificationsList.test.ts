import { describe, expect, it, vi } from 'vitest';
import { parseSale, readTray, rowText, rowTime } from '../../src/menu/notificationsList';

// Shapes as read on the Ally on 2026-10-27 (NotificationStore.m_rgNotificationTray), ids synthetic.
const sale = (id: number, appid: number, count: number, created: number, unread = false) => ({
    eType: 28,
    notifications: [{ notificationID: id, rtCreated: created, eType: 28, bNewIndicator: unread,
        data: { type: 8, timestamp: created, rgunread: unread ? [id] : [], rgread: [], item: { body_data: JSON.stringify({ appid, count, appids: Array.from({ length: count }, (_, i) => appid + i) }) } } }],
});
const now = new Date(2026, 9, 27, 23, 30);
const at = (day: number, h: number, m: number) => Math.floor(new Date(2026, 9, day, h, m).getTime() / 1000);

describe('Steam notification tray', () => {
    it('reads wishlist sales in Steam’s order, with their game, count, time and unread state', () => {
        const rows = readTray([sale(2, 3339880, 1, at(27, 20, 42), true), sale(1, 2129530, 20, at(26, 18, 0))]);
        expect(rows).toEqual([
            { id: '2', kind: 'wishlist', appId: 3339880, count: 1, time: at(27, 20, 42), unread: true },
            { id: '1', kind: 'wishlist', appId: 2129530, count: 20, time: at(26, 18, 0), unread: false },
        ]);
    });
    it('keeps notifications it does not recognise, so nothing is hidden', () => {
        const other = { eType: 3, notifications: [{ notificationID: 9, rtCreated: at(27, 9, 0), eType: 3, data: { type: 4, item: { body_data: '{"steamid":"x"}' } } }] };
        expect(readTray([other, { eType: 1, notifications: [] }, null, 'junk'])).toEqual([{ id: '9', kind: 'other', appId: null, count: 1, time: at(27, 9, 0), unread: false }]);
        expect(readTray(undefined)).toEqual([]);
    });
    it('dates today’s notifications by the clock and older ones by the day, like Steam', () => {
        expect(rowTime(at(27, 20, 42), now)).toMatch(/42/);
        expect(rowTime(at(27, 20, 42), now)).not.toMatch(/Oct/);
        expect(rowTime(at(26, 18, 0), now)).toMatch(/Oct\s*26|26\s*Oct/);
    });
    it('says what happened in one sentence, with the store’s name and price when known', () => {
        const one = readTray([sale(2, 3339880, 1, at(27, 20, 42))])[0], many = readTray([sale(1, 2129530, 20, at(26, 18, 0))])[0];
        expect(rowText(one, { name: 'OFF', price: '9,76€' })).toMatchObject({ title: 'OFF is on sale for 9,76€', action: 'View in store' });
        expect(rowText(one, { name: 'OFF' }).title).toBe('OFF is on sale');
        expect(rowText(one, null).title).toBe('A game on your wishlist is on sale');
        expect(rowText(many, { name: 'REANIMAL' })).toMatchObject({ title: 'REANIMAL and 19 other games are on sale', action: 'See all 20' });
        expect(rowText(many, null).title).toBe('20 games on your wishlist are on sale');
        expect(rowText(one, null).label).toMatch(/^Wishlist sale · /);
        expect(rowText({ id: '9', kind: 'other', appId: null, count: 1, time: 0, unread: false }, null)).toMatchObject({ title: 'Steam notification', action: 'Open in Steam' });
    });
    it('takes the name and sale price from Steam’s store answer', () => {
        expect(parseSale({ 3339880: { success: true, data: { name: 'OFF', price_overview: { discount_percent: 35, final_formatted: '9,76€' } } } }, 3339880)).toEqual({ name: 'OFF', price: '9,76€' });
        expect(parseSale({ 3339880: { success: true, data: { name: 'OFF', price_overview: { discount_percent: 0, final_formatted: '15€' } } } }, 3339880)).toEqual({ name: 'OFF' });
        expect(parseSale({ 3339880: { success: false } }, 3339880)).toBeNull();
        expect(parseSale('nope', 3339880)).toBeNull();
    });
});

describe('notification sources', () => {
    it('looks each sale up once and falls back to null on any failure', async () => {
        const { createSaleLookup } = await import('../../src/menu/steam/storeSale');
        const fetcher = vi.fn(async (url: string) => ({ status: 200, json: async () => ({ 3339880: { success: true, data: { name: 'OFF', price_overview: { discount_percent: 35, final_formatted: '9,76€' } } } }), url }));
        const lookup = createSaleLookup(fetcher as never);
        expect(await lookup(3339880)).toEqual({ name: 'OFF', price: '9,76€' });
        expect(await lookup(3339880)).toEqual({ name: 'OFF', price: '9,76€' });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(fetcher.mock.calls[0][0]).toBe('https://store.steampowered.com/api/appdetails?appids=3339880&filters=basic,price_overview');
        const failing = createSaleLookup((async () => { throw Error('offline'); }) as never);
        expect(await failing(1)).toBeNull();
    });
    it('reads the tray and tells listeners only when its rows change', async () => {
        const { createNotificationList } = await import('../../src/menu/steam/notifications');
        let tray: unknown[] = [sale(2, 3339880, 1, at(27, 20, 42))];
        let notify!: () => void;
        const list = createNotificationList({ getTray: () => tray, subscribe: listener => { notify = listener; return () => {}; } });
        const listener = vi.fn(); list.subscribe(listener);
        expect(list.get()).toHaveLength(1);
        notify(); expect(listener).not.toHaveBeenCalled();
        tray = [...tray, sale(1, 2129530, 20, at(26, 18, 0))]; notify();
        expect(listener).toHaveBeenCalledTimes(1); expect(list.get()).toHaveLength(2);
        list.dispose();
    });
});
