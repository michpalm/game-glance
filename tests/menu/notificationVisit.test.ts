import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import type { TrayRow } from '../../src/menu/notificationsList';
import { createNotificationReads } from '../../src/menu/notificationReads';
import { createNotificationVisit } from '../../src/menu/notificationVisit';

const base = { appId: null, count: 1, time: 0 };
const download: TrayRow = { ...base, id: '1', kind: 'download', appId: 42, unread: true };
const sale: TrayRow = { ...base, id: '2', kind: 'wishlist', appId: 5, unread: true, notificationId: '900002' };
const oldSale: TrayRow = { ...base, id: '3', kind: 'wishlist', appId: 6, unread: false, notificationId: '900003' };
const quiet: TrayRow = { ...base, id: 'plugin:4', kind: 'plugin', unread: true };
async function harness(remembered: string[] = []) {
    const kv = memoryKv(); await kv.set('menu:notifications-read', remembered);
    const reads = createNotificationReads(kv); await reads.load();
    const actions = { markRead: vi.fn(), markAllRead: vi.fn(), link: vi.fn(() => null) };
    const deps = { reads, actions, handoff: vi.fn(async (_request: unknown) => {}), close: vi.fn(), openChat: vi.fn((_id: string) => true), failed: vi.fn() };
    return { kv, reads, actions, deps, visit: createNotificationVisit(() => deps) };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('a visit to the Notifications page', () => {
    it('leaves out what was read on entry, including remembered local rows, and keeps rows read during the visit', async () => {
        const h = await harness(['1']);
        expect(h.visit.visible([download, sale, oldSale]).map(r => r.id)).toEqual(['2']);
        h.visit.open(sale);
        expect(h.visit.visible([download, { ...sale, unread: false }, oldSale]).map(r => r.id)).toEqual(['2']);
        expect(h.visit.unread(sale)).toBe(false);
    });
    it('marks an account row read in Steam and a local row in our memory, then opens it', async () => {
        const h = await harness();
        h.visit.open(sale); expect(h.actions.markRead).toHaveBeenCalledWith('900002');
        expect(h.deps.handoff).toHaveBeenLastCalledWith({ kind: 'store', target: 'app', appId: 5 });
        h.visit.open(download); await flush();
        expect(h.reads.get().has('1')).toBe(true); expect(await h.kv.get('menu:notifications-read')).toEqual(['1']);
        expect(h.deps.handoff).toHaveBeenLastCalledWith({ kind: 'app', appId: 42 });
    });
    it('only marks a plugin row without its own action', async () => {
        const h = await harness();
        h.visit.open(quiet); expect(h.deps.handoff).not.toHaveBeenCalled(); expect(h.visit.unread(quiet)).toBe(false); expect(h.reads.get().has('plugin:4')).toBe(true);
    });
    it('closes the menu before calling a plugin’s own onClick, and falls back to Steam’s page when it throws', async () => {
        const h = await harness(), order: string[] = [];
        h.deps.close.mockImplementation(() => { order.push('close'); });
        h.visit.open({ ...quiet, onClick: () => { order.push('click'); } }); expect(order).toEqual(['close', 'click']);
        h.visit.open({ ...quiet, onClick: () => { throw Error('plugin'); } });
        expect(h.deps.handoff).toHaveBeenLastCalledWith({ kind: 'qam', tab: 'notifications' });
    });
    it('opens our own Social chat for a friend, and Steam’s page when Social cannot', async () => {
        const h = await harness(), friend: TrayRow = { ...base, id: '5', kind: 'friend', unread: true, steamId: '76561198000000001' };
        h.visit.open(friend); expect(h.deps.openChat).toHaveBeenCalledWith('76561198000000001'); expect(h.deps.handoff).not.toHaveBeenCalled();
        h.deps.openChat.mockReturnValue(false); h.visit.open(friend);
        expect(h.deps.handoff).toHaveBeenLastCalledWith({ kind: 'qam', tab: 'notifications' });
    });
    it('falls back to Steam’s notifications page when an action fails, and a failing read-mark never blocks it', async () => {
        const h = await harness();
        h.actions.markRead.mockImplementation(() => { throw Error('store'); });
        h.deps.handoff.mockImplementationOnce(async () => { throw Error('route'); });
        h.visit.open(sale); await flush();
        expect(h.deps.handoff.mock.calls.map(c => c[0])).toEqual([{ kind: 'store', target: 'app', appId: 5 }, { kind: 'qam', tab: 'notifications' }]);
        h.deps.handoff.mockImplementation(async () => { throw Error('route'); });
        h.visit.open(sale); await flush(); expect(h.deps.failed).toHaveBeenCalledTimes(1);
    });
    it('marks all read: Steam’s account notifications read and viewed, every local row remembered, every dot gone', async () => {
        const h = await harness(), listener = vi.fn(); h.visit.subscribe(listener);
        const rows = [download, sale, quiet];
        expect(h.visit.visible(rows)).toHaveLength(3); expect(h.visit.anyUnread(rows)).toBe(true);
        h.visit.markAll(rows); await flush();
        expect(h.actions.markAllRead).toHaveBeenCalledTimes(1);
        expect([...h.reads.get()].sort()).toEqual(['1', 'plugin:4']);
        expect(rows.some(row => h.visit.unread(row))).toBe(false); expect(h.visit.anyUnread(rows)).toBe(false);
        expect(listener).toHaveBeenCalled();
        expect(h.visit.visible(rows).map(r => r.id)).toEqual(['1', '2', 'plugin:4']);
        h.visit.markAll(rows); expect(h.actions.markAllRead).toHaveBeenCalledTimes(1);
    });
    it('waits for the remembered ids before taking the entry snapshot', async () => {
        let resolve!: (v: unknown) => void;
        const reads = createNotificationReads({ get: () => new Promise(r => { resolve = r; }), set: async () => {} });
        const load = reads.load();
        const visit = createNotificationVisit(() => ({ reads, handoff: vi.fn(), close: vi.fn(), openChat: () => true }));
        expect(visit.visible([download]).map(r => r.id)).toEqual(['1']);
        resolve(['1']); await load;
        expect(visit.visible([download])).toEqual([]);
    });
});
