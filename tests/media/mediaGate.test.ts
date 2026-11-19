import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureMediaNativeReset, mediaGateChoice, mediaKeepsNative, mediaMemory, stopMediaNativeReset } from '../../src/media/mediaState';

const on = { enabled: true, available: true, path: '/media', native: false };

describe('mediaGateChoice', () => {
    it("ours on Steam's Media paths", () => {
        expect(mediaGateChoice(on)).toBe('ours');
        expect(mediaGateChoice({ ...on, path: '/media/grid' })).toBe('ours');
        expect(mediaGateChoice({ ...on, path: '/media/item/screenshot/x' })).toBe('ours');
    });
    it('native when off, unavailable, chosen or the path is unknown', () => {
        expect(mediaGateChoice({ ...on, enabled: false })).toBe('native');
        expect(mediaGateChoice({ ...on, available: false })).toBe('native');
        expect(mediaGateChoice({ ...on, native: true })).toBe('native');
        expect(mediaGateChoice({ ...on, path: null })).toBe('native');
    });
    it('a path outside Media keeps the previous choice (no flash)', () => {
        expect(mediaGateChoice({ ...on, path: '/library/home' }, 'ours')).toBe('ours');
        expect(mediaGateChoice({ ...on, path: '/library/home' }, 'native')).toBe('native');
        expect(mediaGateChoice({ ...on, path: '/library/home' })).toBe('ours');
    });
});

describe('mediaKeepsNative', () => {
    it('stays under /media', () => {
        for (const p of ['/media', '/media/grid', '/media/list', '/media/item/clip/abc']) expect(mediaKeepsNative(p)).toBe(true);
        for (const p of ['/library/home', '/mediaplayer', '/']) expect(mediaKeepsNative(p)).toBe(false);
    });
});

describe('native reset', () => {
    afterEach(() => { stopMediaNativeReset(); mediaMemory.reset(); });
    it("resets Steam's media on leaving Media", () => {
        let listener: () => void = () => {};
        const history = { location: { pathname: '/media/grid' }, listen: vi.fn((fn: () => void) => { listener = fn; return () => {}; }) };
        expect(ensureMediaNativeReset(() => history)).toBe(true);
        mediaMemory.set({ native: true });
        listener();
        expect(mediaMemory.get().native).toBe(true);
        history.location.pathname = '/library/home';
        listener();
        expect(mediaMemory.get().native).toBe(false);
    });
    it('waits for Steam\'s history', () => {
        expect(ensureMediaNativeReset(() => undefined)).toBe(false);
    });
});

describe('final review fixes', () => {
    it('focus is gone only when nothing real holds it (a dialog keeps it)', async () => {
        const { focusGone } = await import('../../src/media/mediaState');
        const body = { isConnected: true };
        expect(focusGone(null, body)).toBe(true);
        expect(focusGone(body, body)).toBe(true);
        expect(focusGone({ isConnected: false }, body)).toBe(true);
        expect(focusGone({ isConnected: true }, body)).toBe(false); // e.g. the Delete dialog's button, outside the page
    });
    it('remember() stores without waking the gate', () => {
        const fn = vi.fn();
        const stop = mediaMemory.subscribe(fn);
        mediaMemory.remember({ focusId: '7_2', tab: 'shots' });
        expect(fn).not.toHaveBeenCalled();
        expect(mediaMemory.get()).toMatchObject({ focusId: '7_2', tab: 'shots' });
        stop();
        mediaMemory.reset();
    });
});
