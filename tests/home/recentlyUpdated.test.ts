import { describe, expect, it } from 'vitest';
import {
    completedBytes, completedLabel, formatBytes, fromCompleted, installedGames, pickRecentlyUpdated, UPDATED_MAX, updatedLabel,
} from '../../src/home/recentlyUpdated';
import apps from './fixtures/installed-apps.json';
import completed from './fixtures/recently-completed.json';

// rtLastUpdated values as probed on the Ally (unix seconds); "now" a little later the same day.
const NOW = 1791130000;
const DAY = 86_400;

describe('updatedLabel', () => {
    it('today, yesterday, N days ago (whole days; a future time is today)', () => {
        expect(updatedLabel(1791102363, NOW)).toBe('Updated today');
        expect(updatedLabel(NOW - DAY - 5, NOW)).toBe('Updated yesterday');
        expect(updatedLabel(1790714102, NOW)).toBe('Updated 4 days ago');
        expect(updatedLabel(NOW + 50, NOW)).toBe('Updated today');
    });
});

describe('pickRecentlyUpdated', () => {
    it('newest first, within 30 days, dropping unknown times', () => {
        const cards = pickRecentlyUpdated([
            { appId: 1262350, name: 'SIGNALIS', rtLastUpdated: 1790705899 },
            { appId: 2001, name: 'Cryptmaster', rtLastUpdated: 1791102363 },
            { appId: 2420660, name: 'Neva', rtLastUpdated: 1790939574 },
            { appId: 1, name: 'Old', rtLastUpdated: NOW - 31 * DAY },
            { appId: 2, name: 'Unknown', rtLastUpdated: 0 },
        ], NOW);
        expect(cards.map((c) => c.appId)).toEqual([2001, 2420660, 1262350]);
        expect(cards[0]).toEqual({ appId: 2001, name: 'Cryptmaster', rtLastUpdated: 1791102363, label: 'Updated today' });
    });
    it('one card per game (newest time wins), nameless or broken ids dropped, capped', () => {
        const cards = pickRecentlyUpdated([
            { appId: 5, name: 'A', rtLastUpdated: NOW - 3 * DAY },
            { appId: 5, name: 'A', rtLastUpdated: NOW - DAY },
            { appId: 6, name: '', rtLastUpdated: NOW },
            { appId: -1, name: 'X', rtLastUpdated: NOW },
        ], NOW);
        expect(cards).toEqual([{ appId: 5, name: 'A', rtLastUpdated: NOW - DAY, label: 'Updated yesterday' }]);
        const many = Array.from({ length: 20 }, (_, i) => ({ appId: i + 1, name: `G${i}`, rtLastUpdated: NOW - i * 60 }));
        expect(pickRecentlyUpdated(many, NOW)).toHaveLength(UPDATED_MAX);
        expect(pickRecentlyUpdated([], NOW)).toEqual([]);
    });
});

describe('installedGames', () => {
    it('only installed Steam games (app type 1), no shortcuts or tools', () => {
        const withShortcut = (apps as Array<Record<string, unknown>>).map((a) => ({ ...a, BIsModOrShortcut: () => a.shortcut === true }));
        expect(installedGames(withShortcut)).toEqual([{ appId: 1675830, name: '1000xRESIST' }, { appId: 1588550, name: 'Cairn' }]);
        expect(installedGames(withShortcut, 1)).toHaveLength(1);
        expect(installedGames([null, 5, {}])).toEqual([]);
    });
});

describe('Steam\'s recently completed list (downloadsStore.RecentlyCompleted, real shapes)', () => {
    // Synthetic values in the shape Steam gives, rendered in UTC so the test does not depend on the machine's timezone.
    const NOW_MS = Date.parse('2026-10-04T12:00:00Z');
    const installed: Record<number, string> = { 2001: 'Cryptmaster', 2002: 'Proton Experimental', 2003: 'Well Dweller' };
    it('sizes as Steam sums them (progress[2] of each update type), binary units, one decimal', () => {
        expect(completedBytes(completed[0])).toBe(1800000000);
        expect(completedBytes(completed[2])).toBe(1400000000 + 400000);
        expect(formatBytes(1800000000, 'en-US')).toBe('1.7 GB');
        expect(formatBytes(51200, 'sv-SE')).toBe('50,0 KB');
        expect(formatBytes(0)).toBe('');
        expect(completedBytes({})).toBe(0);
    });
    it('Steam\'s lines: Today at time, Yesterday, then weekday and date (local time)', () => {
        expect(completedLabel(1791105720, NOW_MS, 'en-US', 'UTC')).toBe('Updated Today at 9:22 AM');
        expect(completedLabel(1791021600, NOW_MS, 'en-US', 'UTC')).toBe('Updated Yesterday');
        expect(completedLabel(1790951400, NOW_MS, 'en-US', 'UTC')).toBe('Updated Fri, Oct 2');
    });
    it('installed games only, newest first, with size and line, as stock', () => {
        const cards = fromCompleted(completed, (id) => installed[id] ?? '', NOW_MS, 12, 'en-US', 'UTC');
        expect(cards.map((c) => [c.name, c.size, c.label])).toEqual([
            ['Cryptmaster', '1.7 GB', 'Updated Today at 9:22 AM'],
            ['Proton Experimental', '50.0 KB', 'Updated Yesterday'],
            ['Well Dweller', '1.3 GB', 'Updated Fri, Oct 2'],
        ]);
        expect(fromCompleted(completed, () => '', NOW_MS)).toEqual([]);
        expect(fromCompleted(null, () => 'x', NOW_MS)).toEqual([]);
        expect(fromCompleted(completed, (id) => installed[id] ?? '', NOW_MS, 1)).toHaveLength(1);
    });
});

describe('loadRecentlyUpdated cancellation (the fallback scan)', () => {
    it('stops scanning between games once cancelled, returns [] and does not memoise', async () => {
        const { loadRecentlyUpdated, resetRecentlyUpdated } = await import('../../src/home/recentlyUpdated');
        resetRecentlyUpdated();
        const asked: number[] = [];
        let cancelled = false;
        const api = {
            RegisterForAppDetails: (id: number, cb: (d: { rtLastUpdated: number }) => void) => {
                asked.push(id);
                cancelled = true;
                setTimeout(() => cb({ rtLastUpdated: 1 }), 0);
                return { unregister: () => undefined };
            },
        };
        const many = Array.from({ length: 30 }, (_, i) => ({ appid: 5000 + i, display_name: `G${i}`, installed: true, app_type: 1 }));
        (globalThis as unknown as Record<string, unknown>).SteamClient = { Apps: api };
        (globalThis as unknown as Record<string, unknown>).appStore = { allApps: many };
        try {
            expect(await loadRecentlyUpdated(() => 1_000_000, () => cancelled)).toEqual([]);
            expect(asked.length).toBeLessThan(30);
            cancelled = false;
            asked.length = 0;
            await loadRecentlyUpdated(() => 1_000_000, () => false);
            expect(asked.length).toBeGreaterThan(0); // not served from a memo of the partial scan
        } finally {
            delete (globalThis as unknown as Record<string, unknown>).SteamClient;
            delete (globalThis as unknown as Record<string, unknown>).appStore;
            resetRecentlyUpdated();
        }
    });
});

describe('hidden runtime tools in the Recently updated row', () => {
    it('Steamworks Common Redistributables is skipped; Proton and the Linux runtime stay', async () => {
        const { fromCompleted, installedGames, isHiddenTool } = await import('../../src/home/recentlyUpdated');
        expect(isHiddenTool(228980, 'Steamworks Common Redistributables')).toBe(true);
        expect(isHiddenTool(1493710, 'Proton Experimental')).toBe(false);
        expect(isHiddenTool(1628350, 'Steam Linux Runtime 3.0 (sniper)')).toBe(false);
        const names: Record<number, string> = { 228980: 'Steamworks Common Redistributables', 1493710: 'Proton Experimental' };
        const done = [{ appid: 228980, completed_time: 1791105720 }, { appid: 1493710, completed_time: 1791021600 }];
        expect(fromCompleted(done, (id) => names[id] ?? '', Date.parse('2026-10-04T12:00:00Z')).map((c) => c.appId)).toEqual([1493710]);
        expect(installedGames([{ appid: 228980, display_name: 'Steamworks Common Redistributables', installed: true, app_type: 1 }])).toEqual([]);
    });
});
