import { describe, expect, it, vi } from 'vitest';
import {createElement} from 'react';
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
    it('reads native download protobuf getters with their receiver and resolves the game name', () => {
        const data = { app: 42, appid() { return this.app; }, dlc_appid: () => 0, remote_client_name: () => '' };
        const [row] = readTray([{ eType: 1, notifications: [{ notificationID: 7, eType: 1, rtCreated: 123, bNewIndicator: true, data }] }], id => id === 42 ? 'Synthetic game' : '');
        expect(row).toMatchObject({ id: '7', kind: 'download', appId: 42, time: 123, unread: true, title: 'Synthetic game' });
        expect(rowText(row, null)).toMatchObject({ label: expect.stringContaining('Download complete'), title: 'Synthetic game', body: 'Ready to play', action: 'Open in Steam' });
    });
    it('uses a DLC name when available and retains the remote completion information', () => {
        const data = { appid: () => 42, dlc_appid: () => 43, remote_client_name: () => 'Other device' };
        const [row] = readTray([{ notifications: [{ notificationID: 7, eType: 1, data }] }], id => id === 43 ? 'Synthetic expansion' : 'Synthetic game');
        expect(row.appId).toBe(42);expect(rowText(row, null)).toMatchObject({ title: 'Synthetic expansion', body: 'Ready to play on Other device' });
    });
    it('retains download type when its name is unavailable and isolates broken native getters', () => {
        const tray = [{ notifications: [{ notificationID: 1, eType: 1, data: { appid: () => { throw Error('gone'); } } }] },
            { notifications: [{ notificationID: 2, eType: 1, data: { appid: () => 42 } }] }];
        const rows = readTray(tray, () => { throw Error('No overview'); });
        expect(rows).toHaveLength(2);expect(rows[0].kind).toBe('other');
        expect(rowText(rows[1], null)).toMatchObject({ label: 'Download complete', title: 'Game download complete', body: 'Ready to play' });
    });
    it('reads plugin title/body, uses its native ID, and namespaces it against Steam IDs', () => {
        const [row] = readTray([{ eType: 31, notifications: [{ nNotificationID: 7, eType: 31, decky: true, data: { title: 'Synthetic plugin update', body: 'An update is available.', timestamp: 123 } }] }]);
        expect(row).toMatchObject({ id: 'plugin:7', kind: 'plugin', appId: null, time: 123 });
        expect(rowText(row, null)).toMatchObject({ label: expect.stringContaining('Plugin'), title: 'Synthetic plugin update', body: 'An update is available.', action: 'Open in Steam' });
    });
    it('preserves rich plugin translation elements without invoking them while reading', () => {
        const render = vi.fn(() => null), title = createElement(render, { transText: 'synthetic.title' }), body = createElement(render, { transText: 'synthetic.body' });
        const [row] = readTray([{ notifications: [{ nNotificationID: 8, eType: 31, data: { title, body } }] }]);
        const text = rowText(row, null);expect(text.title).toBe(title);expect(text.body).toBe(body);expect(render).not.toHaveBeenCalled();
    });
    it('does not coerce unsupported plugin payloads into object text', () => {
        const [row] = readTray([{ notifications: [{ nNotificationID: 8, eType: 31, data: { title: { secret: 'ignored' }, body: () => 'not invoked' } }] }]);
        expect(rowText(row, null)).toMatchObject({ title: 'Plugin notification' });expect(rowText(row, null).body).toBeUndefined();
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

it('tracks rich plugin changes without serializing React owners or emitting unchanged snapshots',async()=>{
 const {createNotificationList}=await import('../../src/menu/steam/notifications');
 const owner:any={};owner.self=owner;
 const title:any=createElement('span',null,'Synthetic update');
 // A React owner may contain cycles; the tray must retain rich content without JSON serialization.
 const rich={...title,_owner:owner};
 const item={nNotificationID:8,eType:31,data:{title:rich,body:'First body'}};
 let notify!:()=>void;const list=createNotificationList({getTray:()=>[{notifications:[item]}],subscribe:fn=>{notify=fn;return()=>{};}});
 const listener=vi.fn();list.subscribe(listener);expect(list.get()).toHaveLength(1);notify();expect(listener).not.toHaveBeenCalled();
 item.data.body='Changed body';notify();expect(listener).toHaveBeenCalledOnce();expect(rowText(list.get()[0],null).body).toBe('Changed body');list.dispose();
});
