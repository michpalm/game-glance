import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', ToggleField: 'toggle-field', NavEntryPositionPreferences: {} }));
import { WifiPageView } from '../../src/menu/components/WifiPage';
import { MenuAction } from '../../src/menu/components/MenuAction';
import { Crumb } from '../../src/menu/components/SettingRows';
import { wifiRows } from '../../src/menu/wifiPage';
import type { WifiNetwork } from '../../src/menu/steam/wifi';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const net = (key: string, extra: Partial<WifiNetwork> = {}): WifiNetwork => ({ key, name: key, strength: 2, locked: true, saved: false, state: 'idle', needsSteam: false, minPassword: 8, security: 'WPA2', ...extra });
const home = net('home', { state: 'connected', saved: true });
const rows = wifiRows({ available: true, enabled: true, connected: home, others: [net('corp', { needsSteam: true }), net('cafe', { locked: false })] }, new Map());
const handlers = () => ({ onToggle: vi.fn(), onActivate: vi.fn(), onRun: vi.fn(), onBack: vi.fn(() => true) });

it('starts with the crumb, then the rows in one group, each network keyed by its access point', () => {
    const page = WifiPageView({ rows, ...handlers() });
    const nodes = tree(page);
    expect(nodes[1].type).toBe(Crumb);
    expect(nodes[1].props).toMatchObject({ parent: 'Quick settings', title: 'Wi-Fi' });
    const actions = nodes.filter(n => n.type === MenuAction).map(n => n.props.id);
    expect(actions).toEqual(['wifi:home', 'wifi:corp', 'wifi:cafe']);
    const corp = nodes.find(n => n.props['data-gg-wifi'] === 'corp')!;
    expect(corp.props.className).toContain('gg-menu-row-dim');
    expect(nodes.some(n => n.props['data-gg-focus'] === 'wifi:switch')).toBe(true);
});

it('hands A on a row to the page; networks with a page of their own get a chevron', () => {
    const h = handlers();
    const nodes = tree(WifiPageView({ rows, ...h }));
    nodes.find(n => n.props.id === 'wifi:cafe')!.props.onAction();
    expect(h.onActivate).toHaveBeenCalledWith(rows[rows.length - 1]);
    const home = nodes.find(n => n.props.id === 'wifi:home')!;
    expect(tree(home.props.children).some(n => String(n.props.className).includes('gg-menu-wifi-chevron'))).toBe(true);
    const cafe = nodes.find(n => n.props.id === 'wifi:cafe')!;
    expect(tree(cafe.props.children).some(n => String(n.props.className).includes('gg-menu-wifi-chevron'))).toBe(false);
    // B is claimed at the menu's root (pageTakesCancel): nothing inside the page catches it, so one press never acts twice.
    expect(nodes.some(n => typeof n.props.onCancel === 'function')).toBe(false);
});

it('draws the switch and notes when Wi-Fi is off', () => {
    const h = handlers();
    const nodes = tree(WifiPageView({ rows: wifiRows({ available: true, enabled: false, connected: null, others: [] }, new Map()), ...h }));
    const toggle = nodes.find(n => n.type === 'toggle-field')!;
    expect(toggle.props.checked).toBe(false);
    toggle.props.onChange(true);
    expect(h.onToggle).toHaveBeenCalledWith(true);
    expect(nodes.some(n => n.props.children === 'Turn on Wi-Fi to see networks.')).toBe(true);
});
