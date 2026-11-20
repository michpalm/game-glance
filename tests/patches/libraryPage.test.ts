import { RoutePatch, routerHook } from '@decky/api';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
import { LibraryGate } from '../../src/library/LibraryPage';
import { LIBRARY_ROUTE, patchLibraryPage } from '../../src/patches/libraryPage';

afterEach(() => {
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
});
const patchFn = () => vi.mocked(routerHook.addPatch).mock.calls[0][1] as RoutePatch;

describe('patchLibraryPage', () => {
    it('patches Steam\'s Library route and removes that patch on unload', () => {
        vi.mocked(routerHook.addPatch).mockReturnValue('handle' as unknown as RoutePatch);
        const unpatch = patchLibraryPage();
        expect(LIBRARY_ROUTE).toBe('/library');
        expect(vi.mocked(routerHook.addPatch).mock.calls[0][0]).toBe('/library');
        unpatch();
        expect(routerHook.removePatch).toHaveBeenCalledWith('/library', 'handle');
    });
    it('wraps Steam\'s Library element in the gate, which falls back to it', () => {
        patchLibraryPage();
        const steam = createElement('div', { id: 'steam' });
        const out = patchFn()({ path: '/library', children: steam } as never) as { children: ReactElement<{ native: unknown }> };
        expect(out.children.type).toBe(LibraryGate);
        expect(out.children.props.native).toBe(steam);
    });
    it('does not wrap twice', () => {
        patchLibraryPage();
        const steam = createElement('div', { id: 'steam' });
        const once = patchFn()({ path: '/library', children: steam } as never) as { children: ReactElement };
        const twice = patchFn()({ path: '/library', children: once.children } as never) as { children: ReactElement };
        expect(twice.children).toBe(once.children);
    });
    it('leaves an unknown route shape untouched', () => {
        patchLibraryPage();
        expect(patchFn()({ path: '/library', children: 'text' } as never)).toEqual({ path: '/library', children: 'text' });
    });
    it('a router that throws gives a no-op unpatch', () => {
        vi.mocked(routerHook.addPatch).mockImplementation(() => { throw new Error('no router'); });
        expect(() => patchLibraryPage()()).not.toThrow();
    });
});
