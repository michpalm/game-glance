import { RoutePatch, routerHook } from '@decky/api';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, showModal: () => {}, ConfirmModal: 'div', Menu: 'div', MenuItem: 'div' }));
import { SettingsGate } from '../../src/settings/SettingsPage';
import { SETTINGS_ROUTE, patchSettingsPage } from '../../src/patches/settingsPage';

afterEach(() => {
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
});
const patchFn = () => vi.mocked(routerHook.addPatch).mock.calls[0][1] as RoutePatch;

describe('patchSettingsPage', () => {
    it('patches Steam\'s Settings route and removes that patch on unload', () => {
        vi.mocked(routerHook.addPatch).mockReturnValue('handle' as unknown as RoutePatch);
        const unpatch = patchSettingsPage();
        expect(SETTINGS_ROUTE).toBe('/settings');
        expect(vi.mocked(routerHook.addPatch).mock.calls[0][0]).toBe('/settings');
        unpatch();
        expect(routerHook.removePatch).toHaveBeenCalledWith('/settings', 'handle');
    });
    it('wraps Steam\'s Settings element in the gate, which falls back to it', () => {
        patchSettingsPage();
        const steam = createElement('div', { id: 'steam' });
        const out = patchFn()({ path: '/settings', children: steam } as never) as { children: ReactElement<{ native: unknown }> };
        expect(out.children.type).toBe(SettingsGate);
        expect(out.children.props.native).toBe(steam);
    });
    it('does not wrap twice', () => {
        patchSettingsPage();
        const steam = createElement('div', { id: 'steam' });
        const once = patchFn()({ path: '/settings', children: steam } as never) as { children: ReactElement };
        const twice = patchFn()({ path: '/settings', children: once.children } as never) as { children: ReactElement };
        expect(twice.children).toBe(once.children);
    });
    it('leaves an unknown route shape untouched', () => {
        patchSettingsPage();
        expect(patchFn()({ path: '/settings', children: 'text' } as never)).toEqual({ path: '/settings', children: 'text' });
    });
    it('a router that throws gives a no-op unpatch', () => {
        vi.mocked(routerHook.addPatch).mockImplementation(() => { throw new Error('no router'); });
        expect(() => patchSettingsPage()()).not.toThrow();
    });
});
