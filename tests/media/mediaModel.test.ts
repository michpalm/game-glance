import { describe, expect, it } from 'vitest';
import {
    buildItems, dayGroups, dayLabel, focusAfterDelete, formatDuration, formatWhen, mediaTabs, shotUrl, stepItem, tabItems,
    type RawClip, type RawShot,
} from '../../src/media/mediaModel';

// The PS5's real screenshots (2026-11-19).
const steamShot: RawShot = { nAppID: 7, strGameID: '7', hHandle: 2, nWidth: 1920, nHeight: 1080, nCreated: 1794958645, strUrl: 'screenshots/7/screenshots/20261118003725_1.jpg', bUploaded: false, ePrivacy: 2 };
const gameShot: RawShot = { nAppID: 9055727, strGameID: '9055727', hHandle: 1, nWidth: 2560, nHeight: 1440, nCreated: 1794957806, strUrl: 'screenshots/9055727/screenshots/1.jpg', bUploaded: false, ePrivacy: 2 };
const clipNew: RawClip = { clip_id: 'abc', game_id: '1145360', name: 'Hades', date_recorded: 1794958000, duration_ms: '42000' };
const clipOld: RawClip = { clip_id: 'def', game_id: '18446744073709551615', date_recorded: 1794900000, duration_ms: 75000 };

const local = (s: string) => Math.floor(new Date(s).getTime() / 1000);
const now = new Date('2026-11-19T12:00:00');

describe('shotUrl', () => {
    it("prefixes Steam's loopback host", () => {
        expect(shotUrl('screenshots/7/x.jpg')).toBe('https://steamloopback.host/screenshots/7/x.jpg');
    });
    it('leaves a full url alone', () => {
        expect(shotUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    });
});

describe('buildItems', () => {
    const items = buildItems([gameShot, steamShot], [clipOld, clipNew]);
    it('orders newest first, clips among shots', () => {
        expect(items.map(i => i.id)).toEqual(['7_2', 'clip_abc', '9055727_1', 'clip_def']);
    });
    it('maps a shot', () => {
        expect(items[0]).toEqual({ kind: 'shot', id: '7_2', appId: 7, gameId: '7', handle: 2, created: 1794958645, width: 1920, height: 1080, url: 'https://steamloopback.host/screenshots/7/screenshots/20261118003725_1.jpg', uploaded: false });
    });
    it('maps a clip; a 64-bit game id gives appId 0', () => {
        expect(items[1]).toEqual({ kind: 'clip', id: 'clip_abc', appId: 1145360, gameId: '1145360', created: 1794958000, durationMs: 42000, title: 'Hades' });
        expect(items[3]).toMatchObject({ appId: 0, durationMs: 75000, title: '' });
    });
    it('breaks ties by id', () => {
        const a = { ...steamShot, hHandle: 3 }, b = { ...steamShot, hHandle: 1 };
        expect(buildItems([a, b], []).map(i => i.id)).toEqual(['7_1', '7_3']);
    });
});

describe('tabs', () => {
    const items = buildItems([gameShot, steamShot], [clipOld, clipNew]);
    it('counts each tab', () => {
        expect(mediaTabs(items)).toEqual([
            { key: 'all', label: 'All', count: 4 },
            { key: 'shots', label: 'Screenshots', count: 2 },
            { key: 'clips', label: 'Recordings', count: 2 },
        ]);
    });
    it('filters by tab', () => {
        expect(tabItems(items, 'shots').every(i => i.kind === 'shot')).toBe(true);
        expect(tabItems(items, 'clips').map(i => i.id)).toEqual(['clip_abc', 'clip_def']);
        expect(tabItems(items, 'all')).toHaveLength(4);
    });
});

describe('days', () => {
    it('labels days', () => {
        expect(dayLabel(local('2026-11-19T00:30:00'), now)).toBe('Today');
        expect(dayLabel(local('2026-11-18T23:59:00'), now)).toBe('Yesterday');
        expect(dayLabel(local('2026-11-12T10:00:00'), now)).toBe('12 November');
        expect(dayLabel(local('2025-10-27T10:00:00'), now)).toBe('27 October 2025');
    });
    it('groups by local day keeping order', () => {
        const shot = (h: number, t: string): RawShot => ({ ...steamShot, hHandle: h, nCreated: local(t) });
        const items = buildItems([shot(1, '2026-11-19T09:00:00'), shot(2, '2026-11-19T08:00:00'), shot(3, '2026-11-18T20:00:00')], []);
        const groups = dayGroups(items, now);
        expect(groups.map(g => g.label)).toEqual(['Today', 'Yesterday']);
        expect(groups[0].items.map(i => i.id)).toEqual(['7_1', '7_2']);
        expect(groups[1].items.map(i => i.id)).toEqual(['7_3']);
        expect(dayGroups([], now)).toEqual([]);
    });
});

describe('formatDuration', () => {
    it('formats m:ss and h:mm:ss', () => {
        expect(formatDuration(42000)).toBe('0:42');
        expect(formatDuration(75000)).toBe('1:15');
        expect(formatDuration(3723000)).toBe('1:02:03');
    });
});

describe('navigation', () => {
    const items = buildItems([gameShot, steamShot], [clipNew]);
    it('steps and wraps', () => {
        expect(stepItem(items, '7_2', 1)).toBe('clip_abc');
        expect(stepItem(items, '9055727_1', 1)).toBe('7_2');
        expect(stepItem(items, '7_2', -1)).toBe('9055727_1');
    });
    it('null when empty or unknown', () => {
        expect(stepItem([], 'x', 1)).toBeNull();
        expect(stepItem(items, 'nope', 1)).toBeNull();
    });
    it('focus after delete: next, else previous, else null', () => {
        expect(focusAfterDelete(items, 'clip_abc')).toBe('9055727_1');
        expect(focusAfterDelete(items, '9055727_1')).toBe('clip_abc');
        expect(focusAfterDelete(items.slice(0, 1), '7_2')).toBeNull();
        expect(focusAfterDelete(items, 'nope')).toBeNull();
    });
});

describe('formatWhen', () => {
    it('date and time, the year only when not this year', () => {
        expect(formatWhen(local('2026-11-12T21:14:00'), now)).toBe('12 November, 21:14');
        expect(formatWhen(local('2025-10-27T09:05:00'), now)).toBe('27 October 2025, 09:05');
    });
});
