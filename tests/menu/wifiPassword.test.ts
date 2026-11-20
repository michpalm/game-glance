import { type ReactElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div' }));
import { createPasswordEntry, WifiPasswordView } from '../../src/menu/components/WifiPassword';
import { MenuAction } from '../../src/menu/components/MenuAction';
import type { WifiNetwork } from '../../src/menu/steam/wifi';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const strings = (node: ReactNode) => tree(node).flatMap(n => [n.props.children].flat()).filter(c => typeof c === 'string').join('|');
const net = (extra: Partial<WifiNetwork> = {}): WifiNetwork => ({ key: 'cafe', name: 'Cafe', strength: 3, locked: true, saved: false, state: 'idle', needsSteam: false, minPassword: 8, security: 'WPA2', ...extra });
const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
afterEach(() => { for (const spy of logs) expect(spy.mock.calls.flat().join(' ')).not.toContain('pass1234'); });

describe('createPasswordEntry', () => {
    it('starts hidden and empty, and Show reveals the text', () => {
        const entry = createPasswordEntry(net(), vi.fn());
        expect(entry.get()).toEqual({ draft: '', shown: false, canJoin: false });
        entry.setDraft('abc');
        expect(entry.get()).toMatchObject({ draft: 'abc', shown: false });
        entry.toggleShown();
        expect(entry.get().shown).toBe(true);
    });
    it('joins only from the network\'s minimum length, then forgets the draft', () => {
        const onDone = vi.fn();
        const entry = createPasswordEntry(net(), onDone);
        entry.setDraft('pass123');
        expect(entry.get().canJoin).toBe(false);
        entry.join();
        expect(onDone).not.toHaveBeenCalled();
        entry.setDraft('pass1234');
        expect(entry.get().canJoin).toBe(true);
        entry.join();
        expect(onDone).toHaveBeenCalledWith('pass1234');
        expect(entry.get().draft).toBe('');
        entry.join();
        expect(onDone).toHaveBeenCalledTimes(1);
        const open = createPasswordEntry(net({ minPassword: 1 }), vi.fn());
        open.setDraft('x');
        expect(open.get().canJoin).toBe(true);
    });
    it('cancel and dispose answer null once and forget the draft', () => {
        const onDone = vi.fn();
        const entry = createPasswordEntry(net(), onDone);
        entry.setDraft('pass1234');
        entry.cancel();
        expect(onDone).toHaveBeenCalledWith(null);
        expect(entry.get().draft).toBe('');
        entry.dispose();
        expect(onDone).toHaveBeenCalledTimes(1);
        const left = vi.fn();
        const other = createPasswordEntry(net(), left);
        other.setDraft('pass1234');
        other.dispose();
        expect(left).toHaveBeenCalledWith(null);
        expect(other.get().draft).toBe('');
    });
});

describe('WifiPasswordView', () => {
    const props = (extra = {}) => ({ network: net(), draft: 'pass1234', shown: false, canJoin: true, field: null, onField: vi.fn(), onToggle: vi.fn(), onJoin: vi.fn(), onCancel: vi.fn(), ...extra });
    it('names the network, masks the draft and offers Show and Join', () => {
        const nodes = tree(WifiPasswordView(props()));
        const text = strings(nodes[0]);
        expect(text).toContain('Cafe');
        expect(text).toContain('••••••••');
        expect(text).not.toContain('pass1234');
        const ids = nodes.filter(n => n.type === MenuAction).map(n => n.props.id);
        expect(ids).toEqual(['wifi:password:field', 'wifi:password:show', 'wifi:password:join']);
        expect(strings(nodes.find(n => n.props.id === 'wifi:password:show'))).toBe('Show');
    });
    it('shows the text when asked, and disables Join below the minimum', () => {
        const nodes = tree(WifiPasswordView(props({ shown: true, canJoin: false })));
        expect(strings(nodes[0])).toContain('pass1234');
        expect(strings(nodes.find(n => n.props.id === 'wifi:password:show'))).toBe('Hide');
        expect(nodes.find(n => n.props.id === 'wifi:password:join')!.props.disabled).toBe(true);
    });
    it('leaves B to the menu root, where the Wi-Fi page claims it', () => {
        expect(tree(WifiPasswordView(props())).some(n => typeof n.props.onCancel === 'function')).toBe(false);
    });
});

import { keyboardStyles } from '../../src/menu/keyboard/styles';
describe('the password view on its own page', () => {
    const props = { network: net(), draft: '', shown: false, canJoin: false, onField: vi.fn(), onToggle: vi.fn(), onJoin: vi.fn() };
    it('brings the keyboard\'s styles (they otherwise come only with the Social panel)', () => {
        const style = tree(WifiPasswordView(props)).find(n => n.type === 'style');
        expect(style?.props.children).toBe(keyboardStyles);
    });
    it('puts the field and Show in one row, so Right reaches Show and Down reaches Join', () => {
        const nodes = tree(WifiPasswordView(props));
        const row = nodes.find(n => String(n.props.className).includes('gg-menu-wifi-password-row'))!;
        expect(row.props['flow-children']).toBe('row');
        expect(tree(row.props.children).filter(n => n.type === MenuAction).map(n => n.props.id)).toEqual(['wifi:password:field', 'wifi:password:show']);
    });
});
