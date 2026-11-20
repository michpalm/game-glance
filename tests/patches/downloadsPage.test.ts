import { RoutePatch, routerHook } from '@decky/api';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', ConfirmModal: 'div', Navigation: {}, showModal: () => {} }));
import { DownloadsGate } from '../../src/downloads/DownloadsPage';
import { DOWNLOADS_ROUTE, patchDownloadsPage } from '../../src/patches/downloadsPage';

afterEach(() => {
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
});
const patchFn = () => vi.mocked(routerHook.addPatch).mock.calls[0][1] as RoutePatch;

describe('patchDownloadsPage', () => {
    it('patches Steam\'s Downloads route and removes that patch on unload', () => {
        vi.mocked(routerHook.addPatch).mockReturnValue('handle' as unknown as RoutePatch);
        const unpatch = patchDownloadsPage();
        expect(DOWNLOADS_ROUTE).toBe('/library/downloads');
        expect(vi.mocked(routerHook.addPatch).mock.calls[0][0]).toBe('/library/downloads');
        unpatch();
        expect(routerHook.removePatch).toHaveBeenCalledWith('/library/downloads', 'handle');
    });
    it('wraps Steam\'s page element in the gate, which falls back to it', () => {
        patchDownloadsPage();
        const steam = createElement('div', { id: 'steam' });
        const out = patchFn()({ path: '/library/downloads', children: steam } as never) as { children: ReactElement<{ native: unknown }> };
        expect(out.children.type).toBe(DownloadsGate);
        expect(out.children.props.native).toBe(steam);
    });
    it('leaves an unknown route shape untouched', () => {
        patchDownloadsPage();
        const props = { path: '/library/downloads', children: 'text' };
        expect(patchFn()(props as never)).toEqual({ path: '/library/downloads', children: 'text' });
    });
});
