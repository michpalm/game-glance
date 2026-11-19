import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {} }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { recentGame, SettingsPageView, type SettingsViewProps } from '../../src/settings/SettingsPage';
import { PageFrame } from '../../src/pageKit/PageKit';
import { glanceFor } from '../../src/settings/settingsGlance';
import { closedPreview } from '../../src/settings/settingsModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const el = node as ReactElement<Record<string, any>>;
    if (typeof el.type === 'function' && !String(el.type.name).startsWith('Lu')) return [el, ...tree((el.type as (p: unknown) => ReactNode)(el.props))];
    return [el, ...tree(el.props.children)];
}
const text = (node: ReactNode) => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string')).join('|');
const props = (extra: Partial<SettingsViewProps> = {}): SettingsViewProps => ({
    focus: 'bluetooth', glance: glanceFor({ bluetooth: [{ name: 'Headphones', connected: false, kind: 'audio' }] }, 'bluetooth'),
    onFocus: () => {}, onMove: () => {}, onOpen: () => {}, onBack: () => {}, onPanelBack: () => {}, backdrop: null, ...extra,
});
const root = (p: SettingsViewProps) => tree(SettingsPageView(p)).find(e => e.type === PageFrame)!;
const press = (p: SettingsViewProps, button: number) => root(p).props.onButtonDown({ detail: { button }, preventDefault() {}, stopPropagation() {} });

describe('SettingsPageView', () => {
    it("only the open group's entries are focusable; closed groups show their preview", () => {
        const out = tree(SettingsPageView(props()));
        expect(out.filter(e => e.props.className === 'gg-settings-entry').map(e => e.props['data-gg-focus'])).toEqual(
            ['settings:display', 'settings:sound', 'settings:bluetooth', 'settings:controllers', 'settings:keyboard', 'settings:power']);
        expect(out.filter(e => e.props.className === 'gg-settings-preview').map(e => text(e))).toEqual(
            ['Games', 'People', 'You', 'System'].map(closedPreview));
    });
    it('A opens the entry\'s Steam page; More opens the focused one', () => {
        const onOpen = vi.fn();
        const out = tree(SettingsPageView(props({ onOpen })));
        out.find(e => e.props['data-gg-focus'] === 'settings:sound')!.props.onClick();
        out.find(e => e.props['data-gg-focus'] === 'settings:more')!.props.onClick();
        expect(onOpen.mock.calls).toEqual([['sound'], ['bluetooth']]);
    });
    it('L1/R1 jump a group', () => {
        const onMove = vi.fn();
        press(props({ onMove }), 6);
        press(props({ onMove }), 5);
        expect(onMove.mock.calls).toEqual([['ingame'], ['system']]);
    });
    it('Down on a group\'s last entry opens the next; Up on the very first does nothing', () => {
        const onMove = vi.fn();
        const entries = (p: SettingsViewProps) => tree(SettingsPageView(p)).find(e => e.props.className === 'gg-settings-entries')!;
        const pressEntries = (p: SettingsViewProps, button: number) => entries(p).props.onButtonDown({ detail: { button }, preventDefault() {}, stopPropagation() {} });
        pressEntries(props({ focus: 'power', onMove }), 10);
        pressEntries(props({ focus: 'display', onMove }), 9);
        pressEntries(props({ focus: 'sound', onMove }), 10);
        expect(onMove.mock.calls).toEqual([['ingame']]);
    });
    it('Up/Down on More stay in the panel (final review)', () => {
        const onMove = vi.fn();
        press(props({ focus: 'power', onMove }), 10);
        press(props({ focus: 'display', onMove }), 9);
        expect(onMove).not.toHaveBeenCalled();
    });
    it('B in the panel goes back to the list (spec §3)', () => {
        const onPanelBack = vi.fn();
        const panel = tree(SettingsPageView(props({ onPanelBack }))).find(e => e.props.className === 'gg-settings-panel')!;
        panel.props.onCancelButton({ preventDefault() {}, stopPropagation() {} });
        expect(onPanelBack).toHaveBeenCalled();
        expect(panel.props.onCancelActionDescription).toBe('Back');
    });
    it('the panel shows its glance, the menu line and More', () => {
        const t = text(SettingsPageView(props()));
        for (const s of ['Bluetooth', 'Paired devices', 'Headphones', 'Not connected', 'Already in the menu: Bluetooth on and off', "More in Steam's settings"]) expect(t).toContain(s);
    });
    it("the background is the last played game's hero, blurred, as the other pages (PS5 check)", () => {
        const page = (backdrop: string | null) => root(props({ backdrop }));
        const art = tree(page('hero-1.jpg').props.backdrop).find(e => e.props.className === 'gg-pk-backdrop')!;
        expect(art.props.style.backgroundImage).toBe('url("hero-1.jpg")');
        expect(tree(page(null).props.backdrop).some(e => e.props.className === 'gg-pk-backdrop')).toBe(false);
    });
    it('the last played game, shortcuts included, never one not played', () => {
        const g = (appId: number, lastPlayed: number) => ({ appId, lastPlayed });
        expect(recentGame([g(1, 10), g(2, 30), g(3, 20)])).toBe(2);
        expect(recentGame([g(1, 0)])).toBeNull();
        expect(recentGame([])).toBeNull();
    });
});
