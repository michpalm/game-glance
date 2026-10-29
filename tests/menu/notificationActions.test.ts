import { describe, expect, it, vi } from 'vitest';
import { createNotificationActions } from '../../src/menu/steam/notificationActions';

vi.mock('@decky/ui', () => ({ modules: new Map() }));
// Module 64884's shapes as read on the Ally on 2026-10-29: the store singleton and the link table lookup (minified names vary).
class Store { MarkAllItemsRead = vi.fn(); MarkAllItemsViewed = vi.fn(); MarkItemRead = vi.fn(); MarkItemHidden = vi.fn(); }
function fixture() {
    const store = new Store();
    const table: Record<number, unknown> = { 12: { displayNameLoc: 'a', link: (body: { n: number }) => `https://store.steampowered.com/account/${body.n}` }, 13: { displayNameLoc: 'b' } };
    // eslint-disable-next-line
    const lookup = new Function('S', 'return function b(e){if(e!==void 0)return S[e]}')(table);
    const decoy = new Function('S', 'return function q(e){if(e!==void 0)return S[e]}')({ 12: { link: () => 'https://evil.example/' } });
    const exports = new Map<string, Record<string, unknown>>([['1', { K9: decoy }], ['64884', { $Z: store, K9: lookup, x: () => 1 }], ['2', { other: { MarkAllItemsRead: 1 } }]]);
    const sources: Record<string, string> = { '1': 'function(){const S={}}', '64884': 'function(e,t,n){const S={12:{displayNameLoc:"#x",link:e=>e}}}', '2': '' };
    return { store, table, source: { modules: () => exports.entries(), source: (id: string) => sources[id] } };
}
describe('account notification store', () => {
    it('finds Steam’s store by its methods and marks one, or all read and viewed', () => {
        const f = fixture(), actions = createNotificationActions(f.source);
        actions.markRead('900001'); expect(f.store.MarkItemRead).toHaveBeenCalledWith('900001');
        actions.markAllRead(); expect(f.store.MarkAllItemsRead).toHaveBeenCalledWith(); expect(f.store.MarkAllItemsViewed).toHaveBeenCalledWith();
        expect(f.store.MarkItemHidden).not.toHaveBeenCalled();
    });
    it('never throws when the store is missing or fails', () => {
        const empty = createNotificationActions({ modules: () => new Map<string, Record<string, unknown>>().entries(), source: () => undefined });
        expect(() => { empty.markRead('1'); empty.markAllRead(); }).not.toThrow();
        const f = fixture(); f.store.MarkAllItemsRead.mockImplementation(() => { throw Error('x'); });
        const actions = createNotificationActions(f.source); actions.markAllRead(); expect(f.store.MarkAllItemsViewed).toHaveBeenCalled();
    });
    it('tells Steam’s tray the page was viewed, as its own notifications page does, so the bell clears', () => {
        const f = fixture(), tray = { Viewed: vi.fn() }, actions = createNotificationActions({ ...f.source, tray: () => tray });
        actions.viewed(); expect(tray.Viewed).toHaveBeenCalledTimes(1);
        actions.markAllRead(); expect(tray.Viewed).toHaveBeenCalledTimes(2);
        tray.Viewed.mockImplementation(() => { throw Error('x'); });
        expect(() => actions.viewed()).not.toThrow();
        expect(() => createNotificationActions({ ...f.source, tray: () => undefined }).viewed()).not.toThrow();
        expect(() => createNotificationActions(f.source).viewed()).not.toThrow();
    });
    it('looks up modules once', () => {
        const f = fixture(), modules = vi.fn(f.source.modules), actions = createNotificationActions({ ...f.source, modules });
        actions.markRead('1'); actions.markRead('2'); actions.link(12, { n: 1 }); actions.link(12, { n: 1 });
        expect(modules.mock.calls.length).toBeLessThanOrEqual(2);
    });
});
describe('account link table', () => {
    it('reads the link through the lookup in the module whose source holds the table', () => {
        const actions = createNotificationActions(fixture().source);
        expect(actions.link(12, { n: 7 })).toBe('https://store.steampowered.com/account/7');
        expect(actions.link(13, {})).toBeNull();
        expect(actions.link(99, {})).toBeNull();
    });
    it('gives no link when the table cannot be found or the link fails', () => {
        const f = fixture();
        expect(createNotificationActions({ ...f.source, source: () => 'nothing' }).link(12, { n: 1 })).toBeNull();
        (f.table[12] as { link: () => string }).link = () => { throw Error('bad body'); };
        expect(createNotificationActions(f.source).link(12, {})).toBeNull();
    });
});

it('uses the lookup whose entry for that type has a link, when several tables share the lookup’s shape', () => {
    const store = new Store();
    // eslint-disable-next-line
    const make = (table: unknown) => new Function('S', 'return function b(e){if(e!==void 0)return S[e]}')(table);
    const other = make({ 12: { displayNameLoc: 'no link here' } }), links = make({ 12: { link: () => 'https://store.steampowered.com/account/' } });
    const exports = new Map<string, Record<string, unknown>>([['64884', { $Z: store, aq: other, K9: links }]]);
    const actions = createNotificationActions({ modules: () => exports.entries(), source: () => 'displayNameLoc link:' });
    expect(actions.link(12, {})).toBe('https://store.steampowered.com/account/');
    expect(actions.link(13, {})).toBeNull();
});
