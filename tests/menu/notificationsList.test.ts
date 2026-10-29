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
        expect(rowText(row, null)).toMatchObject({ label: expect.stringContaining('Download complete'), title: 'Synthetic game', body: 'Ready to play' });
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
        expect(rowText(row, null)).toMatchObject({ label: expect.stringContaining('Plugin'), title: 'Synthetic plugin update', body: 'An update is available.' });
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
        expect(rowText(one, { name: 'OFF', price: '9,76€' })).toMatchObject({ title: 'OFF is on sale for 9,76€' });
        expect(rowText(one, { name: 'OFF' }).title).toBe('OFF is on sale');
        expect(rowText(one, null).title).toBe('A game on your wishlist is on sale');
        expect(rowText(many, { name: 'REANIMAL' })).toMatchObject({ title: 'REANIMAL and 19 other games are on sale' });
        expect(rowText(many, null).title).toBe('20 games on your wishlist are on sale');
        expect(rowText(one, null).label).toMatch(/^Wishlist sale · /);
        expect(rowText({ id: '9', kind: 'other', appId: null, count: 1, time: 0, unread: false }, null)).toMatchObject({ title: 'Steam notification' });
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

describe('notification kinds and read state', () => {
    const account = (id: number, notification_id: string, type: number, body: object, read: boolean) => ({ eType: 28, notifications: [{ notificationID: id, eType: 28, bNewIndicator: true, rtCreated: 5,
        data: { type, rollup_key: 'k', item: { notification_id, notification_type: type, body_data: JSON.stringify(body), read, viewed: false, hidden: false }, rgunread: read ? [] : [notification_id], rgread: read ? [notification_id] : [] } }] });
    it('reads account notifications with their store id, type and body, and their read state from the account', () => {
        const [row, done] = readTray([account(4, '900001', 12, { title: 'x' }, false), account(5, '900002', 12, {}, true)]);
        expect(row).toEqual({ id: '4', kind: 'account', appId: null, count: 1, time: 5, unread: true, notificationId: '900001', accountType: 12, accountBody: { title: 'x' } });
        expect(done).toMatchObject({ kind: 'account', unread: false });
    });
    it('keeps the account id on wishlist sales so they can be marked read', () => {
        const [row] = readTray([account(6, '900003', 8, { appid: 10, count: 1, appids: [10] }, false)]);
        expect(row).toMatchObject({ kind: 'wishlist', appId: 10, notificationId: '900003', unread: true });
    });
    it('reads friend notifications by shape: a steam id and no game, with an invite url when there is one', () => {
        const friend = { sid: '76561198000000001', steamid() { return this.sid; } };
        const invite = { steamid: () => '76561198000000002', response_steamurl: () => 'steam://joinlobby/1/2/76561198000000002' };
        const rows = readTray([{ eType: 4, notifications: [{ notificationID: 11, eType: 4, bNewIndicator: true, data: friend }] },
            { eType: 7, notifications: [{ notificationID: 12, eType: 7, bNewIndicator: false, data: invite }] },
            { eType: 9, notifications: [{ notificationID: 13, eType: 9, data: { steamid: () => 'nope' } }] }]);
        expect(rows[0]).toEqual({ id: '11', kind: 'friend', appId: null, count: 1, time: 0, unread: true, steamId: '76561198000000001' });
        expect(rows[1]).toMatchObject({ kind: 'friend', steamId: '76561198000000002', inviteUrl: 'steam://joinlobby/1/2/76561198000000002', unread: false });
        expect(rows[2].kind).toBe('other');
    });
    it('keeps a plugin’s own onClick by reference', () => {
        const onClick = () => {};
        const [withClick, without] = readTray([{ notifications: [{ nNotificationID: 1, eType: 31, data: { title: 'a', onClick } }] }, { notifications: [{ nNotificationID: 2, eType: 31, data: { title: 'b' } }] }]);
        expect(withClick.onClick).toBe(onClick); expect('onClick' in without).toBe(false);
    });
    it('counts a local notification unread only while Steam marks it new and it is not remembered', async () => {
        const { rowUnread } = await import('../../src/menu/notificationsList');
        const download = { id: '7', kind: 'download', appId: 1, count: 1, time: 0, unread: true } as const;
        const sale = { id: '8', kind: 'wishlist', appId: 1, count: 1, time: 0, unread: true, notificationId: '9' } as const;
        expect(rowUnread(download, new Set())).toBe(true);
        expect(rowUnread(download, new Set(['7']))).toBe(false);
        expect(rowUnread({ ...download, unread: false }, new Set())).toBe(false);
        expect(rowUnread(sale, new Set(['8']))).toBe(true);
    });
});

describe('which notifications show', () => {
    const row = (id: string, unread: boolean) => ({ id, kind: 'other' as const, appId: null, count: 1, time: 0, unread });
    it('leaves out the rows read on entering the page, and keeps rows read during the visit', async () => {
        const { entryHidden, visibleRows } = await import('../../src/menu/notificationsList');
        const rows = [row('a', true), row('b', false), row('c', true)];
        const hidden = entryHidden(rows, new Set());
        expect(visibleRows(rows, hidden).map(r => r.id)).toEqual(['a', 'c']);
        const later = [row('a', false), row('b', false), row('c', false), row('d', false)];
        expect(visibleRows(later, hidden).map(r => r.id)).toEqual(['a', 'c', 'd']);
    });
    it('remembers local read ids newest last, without repeats, capped at 200', async () => {
        const { rememberIds } = await import('../../src/menu/notificationsList');
        expect(rememberIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
        const many = Array.from({ length: 200 }, (_, i) => String(i));
        const next = rememberIds(many, ['new']);
        expect(next).toHaveLength(200); expect(next[0]).toBe('1'); expect(next[199]).toBe('new');
    });
});

describe('what a notification does', () => {
    const base = { appId: null, count: 1, time: 0, unread: true };
    it('gives each kind its action and label', async () => {
        const { rowAction } = await import('../../src/menu/notificationsList');
        const onClick = () => {};
        const link = (type: number, body: Record<string, unknown>) => type === 12 ? `https://store.steampowered.com/account/${body.n}` : null;
        expect(rowAction({ ...base, id: '1', kind: 'download', appId: 42 }, link)).toEqual({ label: 'View game', run: { kind: 'native', request: { kind: 'app', appId: 42 } } });
        expect(rowAction({ ...base, id: 'plugin:1', kind: 'plugin', onClick }, link)).toEqual({ label: 'Open', run: { kind: 'plugin', onClick } });
        expect(rowAction({ ...base, id: 'plugin:2', kind: 'plugin' }, link)).toEqual({ run: { kind: 'mark' } });
        expect(rowAction({ ...base, id: '3', kind: 'wishlist', appId: 5 }, link)).toEqual({ label: 'View in store', run: { kind: 'native', request: { kind: 'store', target: 'app', appId: 5 } } });
        expect(rowAction({ ...base, id: '4', kind: 'wishlist', appId: 5, count: 3 }, link)).toEqual({ label: 'See all 3', run: { kind: 'native', request: { kind: 'store', target: 'wishlist' } } });
        expect(rowAction({ ...base, id: '5', kind: 'friend', steamId: '76561198000000001' }, link)).toEqual({ label: 'Open chat', run: { kind: 'chat', steamId: '76561198000000001' } });
        expect(rowAction({ ...base, id: '6', kind: 'friend', steamId: '76561198000000001', inviteUrl: 'steam://joinlobby/1/2/3' }, link)).toEqual({ label: 'Open chat', run: { kind: 'native', request: { kind: 'url', url: 'steam://joinlobby/1/2/3' } } });
        expect(rowAction({ ...base, id: '7', kind: 'account', notificationId: '9', accountType: 12, accountBody: { n: 1 } }, link)).toEqual({ label: 'Open', run: { kind: 'native', request: { kind: 'url', url: 'https://store.steampowered.com/account/1' } } });
        const steam = { label: 'Open in Steam', run: { kind: 'native', request: { kind: 'qam', tab: 'notifications' } } };
        expect(rowAction({ ...base, id: '8', kind: 'account', notificationId: '9', accountType: 13, accountBody: {} }, link)).toEqual(steam);
        expect(rowAction({ ...base, id: '9', kind: 'other' }, link)).toEqual(steam);
        expect(rowAction({ ...base, id: '7', kind: 'account', notificationId: '9', accountType: 12, accountBody: { n: 1 } }, () => { throw Error('gone'); })).toEqual(steam);
    });
});

it('does not report an unchanged account notification as a change, though its body is parsed afresh', async () => {
    const { createNotificationList } = await import('../../src/menu/steam/notifications');
    const tray = [{ eType: 28, notifications: [{ notificationID: 4, eType: 28, data: { type: 12, item: { notification_id: '9', notification_type: 12, body_data: '{"a":1}', read: false } } }] }];
    let notify!: () => void;
    const list = createNotificationList({ getTray: () => tray, subscribe: fn => { notify = fn; return () => {}; } });
    const listener = vi.fn(); list.subscribe(listener); notify(); expect(listener).not.toHaveBeenCalled();
    tray[0].notifications[0].data.item.body_data = '{"a":2}'; notify(); expect(listener).toHaveBeenCalledOnce();
});
