import { beforeEach, describe, expect, it } from 'vitest';
import { clearReturn, noteMorphOpen, peekReturn, takeReturn } from '../../src/home/returnNote';
import { RESTORE_MAX_AGE_MS } from '../../src/home/homeMemory';

const V = { width: 1920, height: 1080 };
const q = (over = {}) => ({ appId: 292030 as number | null, zone: 'actions' as const, viewport: V, atTop: true, ...over });

describe('returnNote', () => {
    beforeEach(clearReturn);

    it('glides back to the game a morph opened', () => {
        noteMorphOpen(292030, 'spotlight', V, 1000);
        expect(takeReturn(q(), 2000)).toEqual({ way: 'glide', look: 'spotlight' });
    });

    it('is taken once', () => {
        noteMorphOpen(292030, 'clean', V, 1000);
        takeReturn(q(), 2000);
        expect(takeReturn(q(), 2001).way).toBe('fade');
    });

    it.each([
        ['no note', () => undefined, {}],
        ['another game', () => noteMorphOpen(1, 'spotlight', V, 1000), {}],
        ['the feed zone', () => noteMorphOpen(292030, 'spotlight', V, 1000), { zone: 'feed' }],
        ['the tabs zone', () => noteMorphOpen(292030, 'spotlight', V, 1000), { zone: 'tabs' }],
        ['a scrolled page', () => noteMorphOpen(292030, 'spotlight', V, 1000), { atTop: false }],
        ['another viewport', () => noteMorphOpen(292030, 'spotlight', V, 1000), { viewport: { width: 1280, height: 800 } }],
        ['the Library card', () => noteMorphOpen(292030, 'spotlight', V, 1000), { appId: null }],
    ])('fades with %s', (_name, arrange, over) => {
        arrange();
        expect(takeReturn(q(over), 2000).way).toBe('fade');
    });

    it('fades when stale or from the future', () => {
        noteMorphOpen(292030, 'spotlight', V, 1000);
        expect(takeReturn(q(), 1000 + RESTORE_MAX_AGE_MS + 1).way).toBe('fade');
        noteMorphOpen(292030, 'spotlight', V, 1000);
        expect(takeReturn(q(), 999).way).toBe('fade');
    });

    it('a fading take still clears the note', () => {
        noteMorphOpen(292030, 'spotlight', V, 1000);
        takeReturn(q({ atTop: false }), 2000);
        expect(takeReturn(q(), 2001).way).toBe('fade');
    });

    it('clearReturn drops it', () => {
        noteMorphOpen(292030, 'spotlight', V, 1000);
        clearReturn();
        expect(peekReturn(292030, 'actions', 2000)).toBeNull();
    });

    it('peeks without taking, by game and zone only', () => {
        noteMorphOpen(292030, 'clean', V, 1000);
        expect(peekReturn(292030, 'recents', 2000)).toBe('clean');
        expect(peekReturn(1, 'recents', 2000)).toBeNull();
        expect(peekReturn(292030, 'feed', 2000)).toBeNull();
        expect(takeReturn(q(), 2000).way).toBe('glide');
    });

    it('ignores an invalid appId or viewport', () => {
        noteMorphOpen(0, 'spotlight', V, 1000);
        noteMorphOpen(292030, 'spotlight', { width: 0, height: 0 }, 1000);
        expect(peekReturn(292030, 'actions', 2000)).toBeNull();
    });
});
