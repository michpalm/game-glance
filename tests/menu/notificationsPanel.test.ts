import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsContents } from '../../src/menu/components/NotificationsPanel';
import { rowAction, type TrayRow } from '../../src/menu/notificationsList';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button' }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const strings = (nodes: ReactElement<Record<string, any>>[]) => nodes.flatMap(n => [n.props.children].flat().filter((c: unknown) => typeof c === 'string')).join(' | ');
const rows: TrayRow[] = [
    { id: '2', kind: 'wishlist', appId: 3339880, count: 1, time: 0, unread: true },
    { id: '1', kind: 'wishlist', appId: 2129530, count: 20, time: 0, unread: false },
    { id: '9', kind: 'other', appId: null, count: 1, time: 0, unread: false },
];
function harness(list = rows, unread = (row: TrayRow) => row.unread, friendName?: (id: string) => string | undefined) {
    const open = vi.fn(), markAll = vi.fn(), seeAll = vi.fn();
    const nodes = tree(NotificationsContents({ rows: list, sales: { 3339880: { name: 'OFF', price: '9,76€' }, 2129530: { name: 'REANIMAL' } }, unread, action: row => rowAction(row, () => null), open, markAll, seeAll, friendName }));
    return { nodes, open, markAll, seeAll, action: (key: string) => nodes.find(n => n.props.id === key)! };
}
describe('Notifications page', () => {
    it('shows one row per notification with the game’s store art and one sentence', () => {
        const h = harness();
        expect(strings(h.nodes)).toContain('OFF is on sale for 9,76€');
        expect(strings(h.nodes)).toContain('REANIMAL and 19 other games are on sale');
        expect(strings(h.nodes)).toContain('Steam notification');
        expect(h.nodes.filter(n => n.type === 'img').map(n => n.props.src)).toEqual([
            'https://shared.steamstatic.com/store_item_assets/steam/apps/3339880/header.jpg',
            'https://shared.steamstatic.com/store_item_assets/steam/apps/2129530/header.jpg',
        ]);
    });
    it('opens each notification through its own action, labelled on the right', () => {
        const h = harness();
        h.action('notification:2').props.onAction();
        h.action('notification:9').props.onAction();
        expect(h.open.mock.calls.map(c => c[0].id)).toEqual(['2', '9']);
        const label = (id: string) => tree(h.action(id).props.children).find(n => n.props.className === 'gg-notification-action')?.props.children;
        expect(label('notification:2')).toBe('View in store'); expect(label('notification:1')).toBe('View in store'); expect(label('notification:9')).toBe('Open in Steam');
    });
    it('marks unread notifications, and replaces the Steam button with Mark all read', () => {
        const h = harness();
        expect(h.action('notification:2').props.className).toContain('gg-notification-unread');
        expect(h.action('notification:1').props.className).not.toContain('gg-notification-unread');
        expect(h.action('notifications:native')).toBeUndefined();
        const mark = h.action('notifications:mark-all');
        expect(strings(tree(mark))).toContain('Mark all read'); expect(mark.props.className).not.toContain('gg-notifications-mark-all-dim');
        mark.props.onAction(); expect(h.markAll).toHaveBeenCalledTimes(1);
    });
    it('dims Mark all read when nothing is unread, keeping it focusable', () => {
        const mark = harness(rows, () => false).action('notifications:mark-all');
        expect(mark.props.className).toContain('gg-notifications-mark-all-dim'); expect(mark.props.disabled).toBeFalsy();
    });
    it('says you are all caught up when nothing is left, with Steam’s list one press away and no heading button', () => {
        const h = harness([]);
        expect(strings(h.nodes)).toContain("You're all caught up");
        expect(strings(h.nodes)).toContain('Read notifications are still in Steam.');
        expect(h.action('notifications:mark-all')).toBeUndefined();
        const all = h.action('notifications:native'); expect(strings(tree(all))).toContain('See all in Steam');
        all.props.onAction(); expect(h.seeAll).toHaveBeenCalledTimes(1);
    });
    it('uses the shared title row', () => {
        const element = NotificationsContents({ rows: [], sales: {}, unread: () => false, action: () => ({}), open: vi.fn(), markAll: vi.fn(), seeAll: vi.fn() });
        expect(tree(element.props.children)[0].props.className).toBe('gg-menu-heading');
    });
});

describe('notification details',()=>{
 it('shows download and plugin information with their own actions',()=>{
  const details:TrayRow[]=[{id:'d',kind:'download',appId:42,count:1,time:0,unread:false,title:'Synthetic game',body:'Ready to play'},
   {id:'plugin:7',kind:'plugin',appId:null,count:1,time:0,unread:false,title:'Synthetic plugin',body:'Update available'}];
  const h=harness(details),text=strings(h.nodes);expect(text).toContain('Synthetic game');expect(text).toContain('Ready to play');expect(text).toContain('Update available');
  expect(text).toContain('View game');
  expect(tree(h.action('notification:plugin:7').props.children).some(n=>n.props.className==='gg-notification-action')).toBe(false);
 });
});

it('titles friend rows with the friend’s name', () => {
    const h = harness([{ id: '5', kind: 'friend', appId: null, count: 1, time: 0, unread: true, steamId: '76561198000000001' }], row => row.unread, () => 'Example Friend');
    expect(strings(h.nodes)).toContain('Example Friend');
});
