import { describe, expect, it, vi } from 'vitest';
import { cssLayers, eyebrowText, fillMissing, openArtLayers, heroSources, playAction, runGameId, shouldMemoArt, showEmptyMessage, usableSize, wideArt } from '../../src/home/homeView';

describe('eyebrowText', () => {
    it('says continue playing with the last-played label', () => {
        expect(eyebrowText('Today')).toBe('Last played · Today');
    });
    it('a game new to the library says so, with when it was added', () => {
        expect(eyebrowText('Yesterday', false, true)).toBe('New to library · Yesterday');
        expect(eyebrowText(null, false, true)).toBe('New to library');
        expect(eyebrowText('Yesterday', true, true)).toBe('My games');
    });
    it('drops the separator when there is no label', () => {
        expect(eyebrowText(null)).toBe('Recent games');
        expect(eyebrowText('')).toBe('Recent games');
    });
    it('says your library when the Library card is focused', () => {
        expect(eyebrowText('Today', true)).toBe('My games');
    });
});

describe('heroSources', () => {
    const A = 'https://steamloopback.host/assets/1';
    it('uses the hero art full-bleed and keeps the capsules as fallback', () => {
        const s = heroSources([`${A}/hero.jpg`, `${A}/header.jpg`, `${A}/cap.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`]);
        expect(s).toEqual({ full: [`${A}/hero.jpg`], fallback: [`${A}/cap.jpg`, `${A}/header.jpg`] });
    });
    it('never shows a header or capsule full-bleed when the game has no hero art', () => {
        const s = heroSources([`${A}/header.jpg`, `${A}/cap.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`]);
        expect(s.full).toEqual([]);
        expect(s.fallback).toEqual([`${A}/cap.jpg`, `${A}/header.jpg`]);
    });
    it('handles no artwork at all', () => {
        expect(heroSources([], [])).toEqual({ full: [], fallback: [] });
    });
    it('tries every custom hero before the Steam hero (a listed custom file may not exist)', () => {
        const C = 'https://steamloopback.host/customimages';
        const s = heroSources([`${C}/1_hero.jpg`, `${C}/1_hero.png`, `${A}/hero.jpg`, `${A}/header.jpg`, `${A}/cap.jpg`], [`${C}/1p.jpg`, `${A}/cap.jpg`, `${A}/header.jpg`]);
        expect(s.full).toEqual([`${C}/1_hero.jpg`, `${C}/1_hero.png`, `${A}/hero.jpg`]);
        expect(s.fallback).toEqual([`${C}/1p.jpg`, `${A}/cap.jpg`, `${A}/header.jpg`]);
    });
    it('a game with only a custom hero still shows it full-bleed', () => {
        const C = 'https://steamloopback.host/customimages';
        expect(heroSources([`${C}/9_hero.png`], [`${C}/9p.png`]).full).toEqual([`${C}/9_hero.png`]);
    });
});

describe('wideArt', () => {
    const A = 'https://steamloopback.host/assets/1';
    const L = ['https://steamloopback.host/customimages/1.png', `${A}/header.jpg`];
    it('wideArt prefers Steam\'s landscape art, with the hero layered under it as a last resort', () => {
        expect(wideArt(L, [`${A}/hero.jpg`, `${A}/header.jpg`, `${A}/cap.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`]))
            .toEqual([...L, `${A}/hero.jpg`]);
    });
    it('wideArt falls back to the hero when there is no landscape art', () => {
        expect(wideArt([], [`${A}/hero.jpg`, `${A}/header.jpg`, `${A}/cap.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`])).toEqual([`${A}/hero.jpg`]);
    });
    it('wideArt layers every custom hero candidate, then the Steam hero, under the landscape art', () => {
        const C = 'https://steamloopback.host/customimages';
        expect(wideArt(L, [`${C}/1_hero.jpg`, `${C}/1_hero.png`, `${A}/hero.jpg`, `${A}/header.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`]))
            .toEqual([...L, `${C}/1_hero.jpg`, `${C}/1_hero.png`, `${A}/hero.jpg`]);
    });
    it('wideArt is null with neither, so the capsule fallback (blurred base plus sharp capsule) stays', () => {
        expect(wideArt([], [`${A}/header.jpg`, `${A}/cap.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`])).toBeNull();
        expect(wideArt([], [], [])).toBeNull();
    });
});

describe('runGameId', () => {
    it('uses the shortcut game id when Steam has one', () => {
        expect(runGameId(3174519087, '13634455659226333184')).toBe('13634455659226333184');
    });
    it('falls back to the app id', () => {
        expect(runGameId(2420660, undefined)).toBe('2420660');
        expect(runGameId(2420660, '')).toBe('2420660');
        expect(runGameId(2420660, 'abc')).toBe('2420660');
    });
});

describe('playAction', () => {
    it('launches installed games that are not running', () => {
        expect(playAction(true, false)).toEqual({ label: 'Play', launch: true, fill: null, toggle: null });
    });
    it('sends games that are not installed to their page', () => {
        expect(playAction(false, false)).toEqual({ label: 'Install', launch: false, fill: null, toggle: null });
    });
    it('offers Resume for the running game and opens its page instead of launching again', () => {
        expect(playAction(true, true)).toEqual({ label: 'Resume', launch: false, fill: null, toggle: null });
    });
    it('during a download the pill uses Steam\'s words, fills, and A toggles pause/resume', () => {
        expect(playAction(false, false, { kind: 'installing', percent: 42 })).toEqual({ label: 'Pause', launch: false, fill: 42, toggle: 'pause' });
        expect(playAction(true, false, { kind: 'updating', percent: 7 })).toEqual({ label: 'Pause', launch: false, fill: 7, toggle: 'pause' });
        expect(playAction(true, false, { kind: 'paused', percent: 42 })).toEqual({ label: 'Update', launch: false, fill: 42, toggle: 'resume' });
        expect(playAction(false, false, { kind: 'queued', percent: 10 })).toEqual({ label: 'Download', launch: false, fill: 10, toggle: 'resume' });
    });
    it('a running game stays Resume', () => {
        expect(playAction(true, true, { kind: 'updating', percent: 7 })).toEqual({ label: 'Resume', launch: false, fill: null, toggle: null });
    });
});

describe('shouldMemoArt', () => {
    it('does not keep a result while Steam has not loaded the game details', () => {
        expect(shouldMemoArt(false, false, 'fallback')).toBe(false);
        expect(shouldMemoArt(false, false, 'full')).toBe(false);
    });
    it('keeps the hero when the details have one and it loaded', () => {
        expect(shouldMemoArt(true, true, 'full')).toBe(true);
    });
    it('does not keep a fallback for a game that has hero art (the hero load may just have been slow)', () => {
        expect(shouldMemoArt(true, true, 'fallback')).toBe(false);
    });
    it('keeps the fallback for a game whose details have no hero', () => {
        expect(shouldMemoArt(true, false, 'fallback')).toBe(true);
    });
    it('never keeps a miss', () => {
        expect(shouldMemoArt(true, false, 'none')).toBe(false);
    });
});

describe('showEmptyMessage', () => {
    it('stays quiet while recents are still being retried', () => {
        expect(showEmptyMessage(0, false)).toBe(false);
    });
    it('shows the message once the retries are done and nothing was found', () => {
        expect(showEmptyMessage(0, true)).toBe(true);
    });
    it('never shows it when there are games', () => {
        expect(showEmptyMessage(3, false)).toBe(false);
        expect(showEmptyMessage(3, true)).toBe(false);
    });
});

describe('usableSize', () => {
    it('accepts a real box', () => {
        expect(usableSize(1500, 844)).toBe(true);
    });
    it('ignores zero, tiny, negative and non-finite measures', () => {
        expect(usableSize(0, 0)).toBe(false);
        expect(usableSize(1, 1)).toBe(false);
        expect(usableSize(1500, 0)).toBe(false);
        expect(usableSize(NaN, 800)).toBe(false);
        expect(usableSize(Infinity, 800)).toBe(false);
        expect(usableSize(-1280, 800)).toBe(false);
    });
});

describe('fillMissing', () => {
    it('reads only ids not already known and stores the results', async () => {
        const known = new Map<number, number | null>([[1, 5]]);
        const read = vi.fn(async (id: number) => id * 10);
        await fillMissing([1, 2, 3], known, read);
        expect(read.mock.calls.map((c) => c[0])).toEqual([2, 3]);
        expect([...known.entries()]).toEqual([[1, 5], [2, 20], [3, 30]]);
    });
    it('runs at most batchSize reads at once', async () => {
        let inFlight = 0;
        let peak = 0;
        const read = async (id: number) => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, 1));
            inFlight--;
            return id;
        };
        const ids = Array.from({ length: 21 }, (_, i) => i + 1);
        const known = new Map<number, number>();
        await fillMissing(ids, known, read, 8);
        expect(peak).toBe(8);
        expect(known.size).toBe(21);
    });
    it('a failing read does not stop the rest', async () => {
        const known = new Map<number, number | null>();
        await fillMissing([1, 2], known, async (id) => {
            if (id === 1) throw new Error('kv down');
            return 2;
        }, 8, null);
        expect(known.get(1)).toBeNull();
        expect(known.get(2)).toBe(2);
    });
});

describe('openArtLayers', () => {
    const A = 'https://steamloopback.host/assets/1';
    it('puts the wide art first and the capsule last, once each', () => {
        expect(openArtLayers([`${A}/wide.jpg`, `${A}/header.jpg`], [`${A}/cap.jpg`, `${A}/header.jpg`])).toEqual([
            `${A}/wide.jpg`,
            `${A}/header.jpg`,
            `${A}/cap.jpg`,
        ]);
    });
    it('falls back to the capsule without wide art, and to nothing at all', () => {
        expect(openArtLayers(null, [`${A}/cap.jpg`])).toEqual([`${A}/cap.jpg`]);
        expect(openArtLayers(null, [])).toEqual([]);
    });
});

describe('cssLayers', () => {
    it('stacks urls as one background-image value with quotes escaped', () => {
        expect(cssLayers(['https://a/1.jpg', 'https://a/"2".jpg'])).toBe('url("https://a/1.jpg"), url("https://a/%222%22.jpg")');
    });
    it('is empty without urls and skips blanks', () => {
        expect(cssLayers([])).toBe('');
        expect(cssLayers(['', 'https://a/1.jpg'])).toBe('url("https://a/1.jpg")');
    });
});
