import { RoutePatch, routerHook } from '@decky/api';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, showModal: () => {}, ConfirmModal: 'div', Menu: 'div', MenuItem: 'div' }));
import { MediaGate } from '../../src/media/MediaPage';
import { MEDIA_ROUTE, patchMediaPage } from '../../src/patches/mediaPage';

afterEach(() => {
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
});
const patchFn = () => vi.mocked(routerHook.addPatch).mock.calls[0][1] as RoutePatch;

describe('patchMediaPage', () => {
    it('patches Steam\'s Media route and removes that patch on unload', () => {
        vi.mocked(routerHook.addPatch).mockReturnValue('handle' as unknown as RoutePatch);
        const unpatch = patchMediaPage();
        expect(MEDIA_ROUTE).toBe('/media');
        expect(vi.mocked(routerHook.addPatch).mock.calls[0][0]).toBe('/media');
        unpatch();
        expect(routerHook.removePatch).toHaveBeenCalledWith('/media', 'handle');
    });
    it('wraps Steam\'s Media element in the gate, which falls back to it', () => {
        patchMediaPage();
        const steam = createElement('div', { id: 'steam' });
        const out = patchFn()({ path: '/media', children: steam } as never) as { children: ReactElement<{ native: unknown }> };
        expect(out.children.type).toBe(MediaGate);
        expect(out.children.props.native).toBe(steam);
    });
    it('does not wrap twice', () => {
        patchMediaPage();
        const steam = createElement('div', { id: 'steam' });
        const once = patchFn()({ path: '/media', children: steam } as never) as { children: ReactElement };
        const twice = patchFn()({ path: '/media', children: once.children } as never) as { children: ReactElement };
        expect(twice.children).toBe(once.children);
    });
    it('leaves an unknown route shape untouched', () => {
        patchMediaPage();
        expect(patchFn()({ path: '/media', children: 'text' } as never)).toEqual({ path: '/media', children: 'text' });
    });
    it('a router that throws gives a no-op unpatch', () => {
        vi.mocked(routerHook.addPatch).mockImplementation(() => { throw new Error('no router'); });
        expect(() => patchMediaPage()()).not.toThrow();
    });
});
