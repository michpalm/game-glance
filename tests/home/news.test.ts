import { describe, expect, it } from 'vitest';
import { mapWhatsNew, pillFor, RawEvent, readWhatsNew } from '../../src/home/news';
import fixture from './fixtures/whatsnew.json';

const events = fixture as RawEvent[];
const NOW = 1790957280 + 3 * 86400;
const name = (id: number) => (id === 1371980 ? 'No Rest for the Wicked' : `Game ${id}`);

describe('mapWhatsNew', () => {
    it('marks only the first card featured', () => {
        const cards = mapWhatsNew(events, name, NOW);
        expect(cards.map((c) => c.featured)).toEqual([true, false, false, false, false, false]);
    });
    it('maps each known event type to its pill label', () => {
        expect(pillFor(13)).toEqual({ label: 'Regular update', key: 'regular' });
        expect(pillFor(14)).toEqual({ label: 'Major update', key: 'major' });
        expect(pillFor(28)).toEqual({ label: 'News', key: 'news' });
        expect(mapWhatsNew(events, name, NOW)[1].pill).toBe('Regular update');
    });
    it('labels unknown types News', () => {
        expect(pillFor(9999)).toEqual({ label: 'News', key: 'news' });
    });
    it('sub line reads GAME NAME - N DAYS AGO', () => {
        const [first] = mapWhatsNew(events, name, NOW);
        expect(first.sub).toBe('NO REST FOR THE WICKED - 3 DAYS AGO');
        expect(mapWhatsNew(events, name, NOW - 2 * 86400)[0].sub).toBe('NO REST FOR THE WICKED - 1 DAY AGO');
        expect(mapWhatsNew(events, name, 1790957280)[0].sub).toBe('NO REST FOR THE WICKED - TODAY');
    });
    it('omits the age when the event has no start time', () => {
        const none = { ...events[0], startTime: 0 };
        const missing = { ...events[0], startTime: undefined as unknown as number };
        expect(mapWhatsNew([none], name, NOW)[0].sub).toBe('NO REST FOR THE WICKED');
        expect(mapWhatsNew([missing], name, NOW)[0].sub).toBe('NO REST FOR THE WICKED');
    });
    it('skips events with no title or app', () => {
        const bad: RawEvent[] = [
            { ...events[0], title: '' },
            { ...events[1], appId: 0 },
            events[2],
        ];
        expect(mapWhatsNew(bad, name, NOW).map((c) => c.gid)).toEqual([events[2].gid]);
    });
    it('keeps the event art only when it is an https url', () => {
        const art = 'https://clan.steamstatic.com/images/1/0000000000000000000000000000000000000001.png';
        const [withArt, noArt, notHttps, junk] = mapWhatsNew([
            { ...events[0], imageUrl: art },
            { ...events[1], imageUrl: null },
            { ...events[2], imageUrl: 'javascript:alert(1)' },
            { ...events[3], imageUrl: 42 as unknown as string },
        ], name, NOW);
        expect(withArt.imageUrl).toBe(art);
        expect(noArt.imageUrl).toBeNull();
        expect(notHttps.imageUrl).toBeNull();
        expect(junk.imageUrl).toBeNull();
        // Fixture events carry no art field at all.
        expect(mapWhatsNew(events, name, NOW)[0].imageUrl).toBeNull();
    });
    it('respects the limit and handles an empty list', () => {
        expect(mapWhatsNew(events, name, NOW, 2)).toHaveLength(2);
        expect(mapWhatsNew([], name, NOW)).toEqual([]);
    });
});

describe('readWhatsNew', () => {
    it('returns an empty list when Steam globals are absent', () => {
        expect(readWhatsNew()).toEqual([]);
    });
});
