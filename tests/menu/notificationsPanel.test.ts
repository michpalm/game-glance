import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsContents } from '../../src/menu/components/NotificationsPanel';
import type { TrayRow } from '../../src/menu/notificationsList';

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
function harness(list = rows) {
    const handoff = vi.fn();
    const nodes = tree(NotificationsContents({ rows: list, sales: { 3339880: { name: 'OFF', price: '9,76€' }, 2129530: { name: 'REANIMAL' } }, handoff }));
    return { nodes, handoff, action: (key: string) => nodes.find(n => n.props.id === key)! };
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
    it('opens each notification at what it is about', () => {
        const h = harness();
        h.action('notification:2').props.onAction();
        h.action('notification:1').props.onAction();
        h.action('notification:9').props.onAction();
        expect(h.handoff.mock.calls.map(c => c[0])).toEqual([
            { kind: 'store', target: 'app', appId: 3339880 }, { kind: 'store', target: 'wishlist' }, { kind: 'qam', tab: 'notifications' },
        ]);
    });
    it('marks unread notifications and keeps Steam’s own tab one press away', () => {
        const h = harness();
        expect(h.action('notification:2').props.className).toContain('gg-notification-unread');
        expect(h.action('notification:1').props.className).not.toContain('gg-notification-unread');
        h.action('notifications:native').props.onAction();
        expect(h.handoff).toHaveBeenLastCalledWith({ kind: 'qam', tab: 'notifications' });
    });
    it('says so when there is nothing new', () => {
        expect(strings(harness([]).nodes)).toContain('No notifications');
    });
    it('uses the shared title row', () => {
        const element = NotificationsContents({ rows: [], sales: {}, handoff: vi.fn() });
        expect(tree(element.props.children)[0].props.className).toBe('gg-menu-heading');
    });
});

describe('notification details',()=>{
 it('shows download and plugin information and retains their native notification destination',()=>{
  const details:TrayRow[]=[{id:'d',kind:'download',appId:42,count:1,time:0,unread:false,title:'Synthetic game',body:'Ready to play'},
   {id:'plugin:7',kind:'plugin',appId:null,count:1,time:0,unread:false,title:'Synthetic plugin',body:'Update available'}];
  const h=harness(details),text=strings(h.nodes);expect(text).toContain('Synthetic game');expect(text).toContain('Ready to play');expect(text).toContain('Update available');
  for(const id of ['d','plugin:7'])h.action(`notification:${id}`).props.onAction();
  expect(h.handoff.mock.calls.map(call=>call[0])).toEqual([{kind:'qam',tab:'notifications'},{kind:'qam',tab:'notifications'}]);
 });
});
