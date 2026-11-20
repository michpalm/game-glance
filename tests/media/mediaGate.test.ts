import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureMediaNativeReset, mediaGateChoice, mediaGameFromPath, mediaHasInvalidGameQuery, mediaKeepsNative, mediaMemory, mediaViewAfterTab, stopMediaNativeReset } from '../../src/media/mediaState';

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

describe('Games view navigation', () => {
    afterEach(() => mediaMemory.reset());
    it('keeps Games selected when changing a tab inside a scoped gallery', () => {
        expect(mediaViewAfterTab('games', true, 'shots')).toBe('games');
        expect(mediaViewAfterTab('games', false, 'shots')).toBe('all');
        expect(mediaViewAfterTab('all', false, 'games')).toBe('games');
    });
    it('reads a bounded decimal GameID from the Media route without numeric coercion', () => {
        expect(mediaGameFromPath('/media/grid?game=18446744073709551615')).toBe('18446744073709551615');
        expect(mediaGameFromPath('/media/grid')).toBeNull();
        expect(mediaGameFromPath('/media/grid?game=12&game=13')).toBeNull();
        expect(mediaHasInvalidGameQuery('/media/grid?game=12&game=13')).toBe(true);
        expect(mediaHasInvalidGameQuery('/media/grid')).toBe(false);
    });
    it('opens a collection on All and remembers the Games card to return to', () => {
        mediaMemory.set({ tab: 'clips', focusId: 'clip_old', view: 'all' });
        mediaMemory.openGame('1262350');
        expect(mediaMemory.get()).toMatchObject({ tab: 'all', focusId: null, view: 'games', gameFocusId: '1262350' });
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

describe('opening one screenshot (Michael, 2026-11-19: a notification goes to that shot)', () => {
    it('reads the shot from Steam\'s item path', async () => {
        const { mediaItemFromPath } = await import('../../src/media/mediaState');
        expect(mediaItemFromPath('/media/item/screenshot/7_12')).toBe('7_12');
        expect(mediaItemFromPath('/media/item/screenshot/1262350_11/')).toBe('1262350_11');
        expect(mediaItemFromPath('/media/item/clip/abc')).toBeNull();
        expect(mediaItemFromPath('/media/grid')).toBeNull();
        expect(mediaItemFromPath(null)).toBeNull();
    });
    it('the opening screen: the viewer on that shot when it exists, else the gallery', async () => {
        const { openingScreen } = await import('../../src/media/mediaState');
        const shot = { kind: 'shot' as const, id: '7_12', appId: 7, gameId: '7', handle: 12, created: 1, width: 1, height: 1, url: '', uploaded: false };
        expect(openingScreen([shot], '7_12')).toEqual({ screen: { kind: 'viewer', id: '7_12' }, tab: 'all', focusId: '7_12' });
        expect(openingScreen([shot], '7_99')).toBeNull();
        expect(openingScreen([shot], null)).toBeNull();
    });
});
