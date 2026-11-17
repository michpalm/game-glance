import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { QuickSettingsPanel, WifiRow, WifiRowView } from '../../src/menu/components/QuickSettingsPanel';
import { MenuAction } from '../../src/menu/components/MenuAction';
import { wifiSummary, type WifiBindings, type WifiSnapshot } from '../../src/menu/steam/wifi';
import { WIFI_ROW } from '../../src/menu/views';
import type { SettingAdapter } from '../../src/menu/steam/setting';

vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', SliderField: 'slider-field', ToggleField: 'toggle-field', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const IDS = ['brightness', 'volume', 'wifi', 'bluetooth', 'airplane', 'night', 'ui-scale', 'friends-dnd'];
const controls = Object.fromEntries(IDS.map(id => [id, {} as SettingAdapter<number | boolean>]));

it('draws the toggles as one group, with no Connectivity or Other heading', () => {
    const nodes = tree(QuickSettingsPanel({ controls }));
    expect(nodes.filter(n => n.type === 'h3')).toEqual([]);
    const groups = nodes.filter(n => typeof n.props.className === 'string' && n.props.className.split(' ').includes('gg-menu-switches'));
    expect(groups).toHaveLength(1);
    expect(tree(groups[0].props.children).map(n => n.props.id)).toEqual(['wifi', 'bluetooth', 'airplane', 'night', 'ui-scale', 'friends-dnd']);
});

const snapshot = (available: boolean): WifiSnapshot => ({ available, enabled: true, connected: { key: 'h', name: 'Home', strength: 4, locked: true, saved: true, state: 'connected', needsSteam: false, minPassword: 8, security: 'WPA2' }, others: [] });
const bindings = (available: boolean) => ({ read: () => snapshot(available), subscribe: () => () => {} }) as unknown as WifiBindings;
const switches = (node: ReactNode) => tree(node).find(n => typeof n.props.className === 'string' && n.props.className.split(' ').includes('gg-menu-switches'))!;

it('draws Wi-Fi as a row that opens its page when Steam\'s network store is there', () => {
    const openWifi = () => {};
    const wifi = bindings(true);
    const kids = tree(switches(QuickSettingsPanel({ controls, wifi, openWifi })).props.children);
    const first = kids[0];
    expect(first.type).toBe(WifiRow);
    expect(first.props).toMatchObject({ wifi, openWifi });
    expect(kids.filter(n => n.type !== WifiRow).map(n => n.props.id)).toEqual(['bluetooth', 'airplane', 'night', 'ui-scale', 'friends-dnd']);
});

it('keeps the Wi-Fi switch when the store is missing or unavailable', () => {
    for (const wifi of [undefined, bindings(false)]) {
        const kids = tree(switches(QuickSettingsPanel({ controls, wifi, openWifi: () => {} })).props.children);
        expect(kids.map(n => n.props.id)).toEqual(['wifi', 'bluetooth', 'airplane', 'night', 'ui-scale', 'friends-dnd']);
    }
});

it('shows the row as a step with the name and the state line', () => {
    const openWifi = () => {};
    const row = WifiRowView({ summary: wifiSummary(snapshot(true)), openWifi });
    expect(row.type).toBe(MenuAction);
    expect(row.props).toMatchObject({ id: WIFI_ROW, className: 'gg-menu-setting gg-menu-setting-step', onAction: openWifi });
    const text = tree(row.props.children).flatMap(n => [n.props.children].flat()).filter(c => typeof c === 'string');
    expect(text).toEqual(expect.arrayContaining(['Wi-Fi', 'Home']));
});
