import { describe, expect, it } from 'vitest';
import { lastPlayedText, moveQuestion, nextGameFocus, refocusKey, refusal, sizeText, storageView, uninstallQuestion } from '../../src/storage/storageModel';
import type { StorageDrive, StorageGame, StorageSnapshot } from '../../src/menu/steam/storage';

const GB = 1e9;
// Noon local time, so day buckets never straddle midnight.
const NOW = new Date(2026, 10, 17, 12, 0, 0).getTime();
const daysAgo = (days: number) => Math.floor((NOW - days * 86_400_000) / 1000);
const game = (appId: number, name: string, gb: number, lastPlayed = 0): StorageGame => ({ appId, name, bytes: gb * GB, lastPlayed });
const drive = (index: number, name: string, kind: StorageDrive['kind'], freeGb: number, capGb: number, games: StorageGame[]): StorageDrive =>
    ({ index, name, kind, freeBytes: freeGb * GB, capacityBytes: capGb * GB, games });
const big = game(1, 'Big', 39.6, daysAgo(3)), small = game(2, 'Small', 2);
const snap = (extra: Partial<StorageSnapshot> = {}, drives?: StorageDrive[]): StorageSnapshot => ({
    available: true, loading: false, move: null, runningAppId: null, failedMove: null,
    drives: drives ?? [drive(0, 'Internal drive', 'internal', 111, 465, [big, small, ...Array.from({ length: 22 }, (_, i) => game(100 + i, `G${i}`, 1))]),
        drive(1, 'SD card', 'sd', 12, 512, [])], ...extra });

describe('lastPlayedText', () => {
    it('buckets by day', () => {
        expect(lastPlayedText(0, NOW)).toBe('Not played yet');
        expect(lastPlayedText(daysAgo(0), NOW)).toBe('Played today');
        expect(lastPlayedText(daysAgo(1), NOW)).toBe('Played yesterday');
        expect(lastPlayedText(daysAgo(4), NOW)).toBe('Played 4 days ago');
        expect(lastPlayedText(daysAgo(7), NOW)).toBe('Played last week');
        expect(lastPlayedText(daysAgo(13), NOW)).toBe('Played last week');
        expect(lastPlayedText(daysAgo(21), NOW)).toBe('Played 3 weeks ago');
        expect(lastPlayedText(daysAgo(65), NOW)).toBe('Played 2 months ago');
        expect(lastPlayedText(daysAgo(400), NOW)).toBe('Played over a year ago');
    });
});

describe('sizeText', () => {
    it('shows GB with one decimal, MB below 1 GB', () => {
        expect(sizeText(65 * GB)).toBe('65.0 GB');
        expect(sizeText(39.64 * GB)).toBe('39.6 GB');
        expect(sizeText(850e6)).toBe('850 MB');
        expect(sizeText(0)).toBe('0 MB');
    });
});

describe('storageView', () => {
    it('builds drive cards', () => {
        const view = storageView(snap(), null, NOW, null);
        expect(view.available).toBe(true);
        expect(view.cards.map(c => [c.index, c.name, c.kind, c.free, c.line, c.moving])).toEqual([
            [0, 'Internal drive', 'internal', '111', '354 of 465 GB used · 24 games', null],
            [1, 'SD card', 'sd', '12', '500 of 512 GB used · 0 games', null],
        ]);
        expect(view.cards[0].usedRatio).toBeCloseTo(354 / 465);
        const one = storageView(snap({}, [drive(0, 'Internal drive', 'internal', 1, 2, [small])]), null, NOW, null);
        expect(one.cards[0].line).toBe('1 of 2 GB used · 1 game');
    });
    it('picks the first drive when none or a gone one is picked', () => {
        expect(storageView(snap(), null, NOW, null).picked).toBe(0);
        expect(storageView(snap(), 7, NOW, null).picked).toBe(0);
        const view = storageView(snap(), 1, NOW, null);
        expect(view.picked).toBe(1);
        expect(view.eyebrow).toBe('On SD card · biggest first');
        expect(view.rows).toEqual([]);
        expect(view.empty).toBe('No games on this drive');
        expect(storageView(snap(), 0, NOW, null).eyebrow).toBe('On the internal drive · biggest first');
        expect(storageView(snap(), 0, NOW, null).empty).toBe(null);
    });
    it('gives a normal game its buttons', () => {
        const row = storageView(snap(), 0, NOW, null).rows[0];
        expect(row).toMatchObject({ appId: 1, name: 'Big', status: 'Played 3 days ago', size: '39.6 GB', progress: null,
            a: { label: 'Game page', run: 'page' }, x: { label: 'Move to SD card', run: 'move' }, y: { label: 'Uninstall', run: 'uninstall' } });
        const three = snap({}, [...snap().drives, drive(2, 'USB disk', 'other', 50, 100, [])]);
        expect(storageView(three, 0, NOW, null).rows[0].x).toEqual({ label: 'Move to…', run: 'pick-drive' });
        const alone = snap({}, [snap().drives[0]]);
        expect(storageView(alone, 0, NOW, null).rows[0].x).toBe(null);
    });
    it('holds back the running game', () => {
        const row = storageView(snap({ runningAppId: 2 }), 0, NOW, null).rows[1];
        expect(row).toMatchObject({ status: 'Running now · Close the game first', x: null, y: null, a: { label: 'Game page', run: 'page' } });
    });
    it('shows a move on the row and both cards', () => {
        const move = { appId: 1, toIndex: 1, movedBytes: 24.1 * GB, totalBytes: 39.6 * GB, secondsLeft: null };
        const view = storageView(snap({ move }), 0, NOW, null);
        expect(view.rows[0]).toMatchObject({ status: 'Moving to SD card · 61%', x: { label: 'Cancel move', run: 'cancel' }, y: null });
        expect(view.rows[0].progress).toBeCloseTo(0.61, 2);
        expect(view.rows[1]).toMatchObject({ x: null, y: { label: 'Uninstall', run: 'uninstall' } });
        expect(view.cards[0].moving).toBe('Moving out · 24.1 of 39.6 GB');
        expect(view.cards[1].moving).toBe('Moving in · 15.5 GB to go');
        const timed = storageView(snap({ move: { ...move, secondsLeft: 110 } }), 0, NOW, null);
        expect(timed.rows[0].status).toBe('Moving to SD card · 61% · about 2 min left');
        const unknown = storageView(snap({ move: { ...move, toIndex: -1 } }), 0, NOW, null);
        expect(unknown.rows[0].status).toBe('Moving · 61%');
        expect(unknown.cards[1].moving).toBe(null);
    });
    it('says when a move failed', () => {
        const row = storageView(snap({ failedMove: 1 }), 0, NOW, null).rows[0];
        expect(row.status).toBe("Couldn't move Big.");
        expect(row.x).toEqual({ label: 'Move to SD card', run: 'move' });
    });
    it('passes the note and handles an unavailable snapshot', () => {
        expect(storageView(snap(), 0, NOW, 'One move at a time.').note).toBe('One move at a time.');
        const none = storageView({ available: false, loading: false, drives: [], move: null, runningAppId: null, failedMove: null }, null, NOW, null);
        expect(none).toMatchObject({ available: false, loading: false, cards: [], rows: [], picked: null, empty: null });
        expect(storageView({ available: false, loading: true, drives: [], move: null, runningAppId: null, failedMove: null }, null, NOW, null).loading).toBe(true);
    });
});

describe('refusal', () => {
    const sd = drive(1, 'SD card', 'sd', 12, 512, []);
    it('words each refusal', () => {
        expect(refusal('no-space', big, sd)).toBe('Not enough space on SD card: needs 39.6 GB, 12.0 GB free.');
        expect(refusal('busy', big, sd)).toBe('One move at a time.');
        expect(refusal('running', big, sd)).toBe('Close the game first.');
        expect(refusal('failed', big, sd)).toBe("Couldn't move Big.");
        expect(refusal('started', big, sd)).toBe(null);
        expect(refusal('cancelled', big, sd)).toBe(null);
    });
});

describe('nextGameFocus', () => {
    it('stays, takes the row in its place, else the last, else null', () => {
        expect(nextGameFocus([1, 2, 3], [1, 2, 3], 2)).toBe(2);
        expect(nextGameFocus([1, 2, 3], [1, 3], 2)).toBe(3);
        expect(nextGameFocus([1, 2, 3], [1, 2], 3)).toBe(2);
        expect(nextGameFocus([1], [], 1)).toBe(null);
        expect(nextGameFocus([1, 2], [1, 2], null)).toBe(null);
    });
});

describe('refocusKey', () => {
    it('acts only when the list changed and focus was lost', () => {
        expect(refocusKey([1, 2], [1, 2], 2, true, 0)).toBe(null);
        expect(refocusKey([1, 2], [1], 2, false, 0)).toBe(null);
        expect(refocusKey([1, 2], [1], 2, true, 0)).toBe('storage:game:1');
        expect(refocusKey([1], [], 1, true, 0)).toBe('storage:drive:0');
    });
});

describe('questions', () => {
    const internalDrive = drive(0, 'Internal drive', 'internal', 111, 465, [big]), sd = drive(1, 'SD card', 'sd', 331, 469, []);
    it('asks before a move', () => {
        expect(moveQuestion(big, internalDrive, sd)).toEqual({ title: 'Move Big to SD card?', text: '39.6 GB moves from Internal drive to SD card. You can keep playing other games while it moves.', ok: 'Move' });
    });
    it('asks before an uninstall', () => {
        expect(uninstallQuestion(big, internalDrive)).toEqual({ title: 'Uninstall Big?', text: '39.6 GB on Internal drive will be freed.', ok: 'Uninstall' });
    });
});
