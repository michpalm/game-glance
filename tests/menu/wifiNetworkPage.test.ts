import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div' }));
import { networkPage, WifiNetworkView } from '../../src/menu/components/WifiNetworkPage';
import { MenuAction } from '../../src/menu/components/MenuAction';
import { Crumb } from '../../src/menu/components/SettingRows';
import type { WifiNetwork, WifiSnapshot } from '../../src/menu/steam/wifi';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const net = (key: string, extra: Partial<WifiNetwork> = {}): WifiNetwork => ({ key, name: key, strength: 4, locked: true, saved: true, state: 'idle', needsSteam: false, minPassword: 8, security: 'WPA2', ...extra });
const snap = (extra: Partial<WifiSnapshot> = {}): WifiSnapshot => ({ available: true, enabled: true, connected: null, others: [], ...extra });

describe('networkPage', () => {
    it('the connected network: status, signal, security, then Disconnect and Forget', () => {
        const page = networkPage(snap({ connected: net('home', { state: 'connected' }) }), 'home', null);
        expect(page.facts).toEqual([['Status', 'Connected'], ['Signal', 'Strong'], ['Security', 'WPA2']]);
        expect(page.actions).toEqual(['disconnect', 'forget']);
        expect(networkPage(snap({ connected: net('open', { state: 'connected', saved: false }) }), 'open', null).actions).toEqual(['disconnect']);
    });
    it('a saved network in range: Join and Forget, and the reason a join failed', () => {
        const page = networkPage(snap({ others: [net('cafe', { strength: 1 })] }), 'cafe', "Couldn't connect.");
        expect(page.facts).toEqual([['Status', "Couldn't connect."], ['Signal', 'Weak'], ['Security', 'WPA2']]);
        expect(page.actions).toEqual(['join', 'forget']);
        expect(networkPage(snap({ others: [net('cafe', { state: 'connecting' })] }), 'cafe', null)).toMatchObject({ facts: [['Status', 'Connecting…'], ['Signal', 'Strong'], ['Security', 'WPA2']], actions: ['forget'] });
    });
    it('a network that left: no actions, a note', () => {
        expect(networkPage(snap(), 'gone', null)).toEqual({ network: null, facts: [], actions: [], note: 'This network is out of range.' });
    });
});

describe('WifiNetworkView', () => {
    it('starts with the crumb, then the facts, then one row per action', () => {
        const onAction = vi.fn();
        const nodes = tree(WifiNetworkView({ name: 'Home', page: networkPage(snap({ connected: net('home', { state: 'connected' }) }), 'home', null), busy: false, onAction }));
        expect(nodes[1].type).toBe(Crumb);
        expect(nodes[1].props).toMatchObject({ parent: 'Wi-Fi', title: 'Home' });
        const actions = nodes.filter(n => n.type === MenuAction);
        expect(actions.map(n => n.props.id)).toEqual(['wifi-network:disconnect', 'wifi-network:forget']);
        expect(actions.every(n => n.props.className.includes('gg-menu-wifi-step'))).toBe(true);
        actions[1].props.onAction();
        expect(onAction).toHaveBeenCalledWith('forget');
    });
    it('ignores presses while one runs, without disabling (focus stays on the button)', () => {
        const onAction = vi.fn();
        const nodes = tree(WifiNetworkView({ name: 'Home', page: networkPage(snap({ connected: net('home', { state: 'connected' }) }), 'home', null), busy: true, onAction }));
        const actions = nodes.filter(n => n.type === MenuAction);
        expect(actions.every(n => n.props.busy === true && !n.props.disabled)).toBe(true);
        actions[0].props.onAction();
        expect(onAction).not.toHaveBeenCalled();
    });
});
