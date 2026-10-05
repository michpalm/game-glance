import { describe, expect, it } from 'vitest';
import { acceptDownloadList, mergeDownloads, readOverview, clampPercent, readDownloadItems, refineKind, liveInstalled, pillWords, pillToggle, fillPercent, readDownload, sameDownload } from '../../src/home/downloadProgress';

describe('clampPercent', () => {
    it('rounds and keeps 0..100', () => {
        expect(clampPercent(41.6)).toBe(42);
        expect(clampPercent(-5)).toBe(0);
        expect(clampPercent(250)).toBe(100);
        expect(clampPercent(0)).toBe(0);
    });
    it('is null for anything that is not a number', () => {
        for (const v of [NaN, Infinity, undefined, null, '42', {}]) expect(clampPercent(v)).toBeNull();
    });
});

describe('readDownload', () => {
    it('maps the transfer statuses to a state, never a percent (the overview percent is unreliable)', () => {
        expect(readDownload({ display_status: 3, status_percentage: 42 })).toEqual({ kind: 'installing', percent: null });
        expect(readDownload({ display_status: 6, status_percentage: 7 })).toEqual({ kind: 'updating', percent: null });
        expect(readDownload({ display_status: 7, status_percentage: 99.5 })).toEqual({ kind: 'downloading', percent: null });
        expect(readDownload({ display_status: 5 })?.kind).toBe('verifying');
        expect(readDownload({ display_status: 18 })?.kind).toBe('paused');
        expect(readDownload({ display_status: 22 })?.kind).toBe('paused');
        expect(readDownload({ display_status: 19 })?.kind).toBe('queued');
        expect(readDownload({ display_status: 23, status_percentage: 36 })).toEqual({ kind: 'queued', percent: null });
    });
    it('other statuses and broken input are no download', () => {
        for (const status of [0, 4, 11, 20, 24, 99, NaN]) expect(readDownload({ display_status: status, status_percentage: 50 })).toBeNull();
        for (const bad of [null, undefined, 5, 'x', {}, []]) expect(readDownload(bad)).toBeNull();
    });
});

describe('pillWords / pillToggle / fillPercent (Steam words)', () => {
    it('Pause while a transfer runs, whatever the install state', () => {
        for (const kind of ['downloading', 'installing', 'updating', 'verifying', 'finalizing'] as const) {
            expect(pillWords({ kind, percent: 42 }, true)).toBe('Pause');
            expect(pillWords({ kind, percent: 42 }, false)).toBe('Pause');
            expect(pillToggle({ kind, percent: 42 })).toBe('pause');
        }
    });
    it('Download for a paused or queued install, Update for an update; both resume', () => {
        for (const kind of ['paused', 'queued'] as const) {
            expect(pillWords({ kind, percent: 10 }, false)).toBe('Download');
            expect(pillWords({ kind, percent: 10 }, true)).toBe('Update');
            expect(pillToggle({ kind, percent: 10 })).toBe('resume');
        }
    });
    it('follows the display status like Steam: UpdateQueued/Required Update, Download for paused/queued downloads, even for an installed game', () => {
        const q = (status: number) => pillWords({ kind: 'queued', percent: null, status }, true);
        expect([q(19), q(20)]).toEqual(['Update', 'Update']);
        expect([q(18), q(22), q(23), q(24)]).toEqual(['Download', 'Download', 'Download', 'Download']);
        expect(pillWords({ kind: 'queued', percent: null, status: 11 }, false)).toBe('Download');
    });
    it('sameDownload sees a status change', () => {
        expect(sameDownload({ kind: 'queued', percent: 1, status: 19 }, { kind: 'queued', percent: 1, status: 23 })).toBe(false);
        expect(sameDownload({ kind: 'queued', percent: 1 }, { kind: 'queued', percent: 1, status: null })).toBe(true);
    });
    it('fills by the percent, 0 when unknown', () => {
        expect(fillPercent({ kind: 'installing', percent: 42 })).toBe(42);
        expect(fillPercent({ kind: 'queued', percent: null })).toBe(0);
    });
});

describe('sameDownload', () => {
    it('compares state and percent', () => {
        const a = { kind: 'installing', percent: 4 } as const;
        expect(sameDownload(a, { ...a })).toBe(true);
        expect(sameDownload(a, { ...a, percent: 5 })).toBe(false);
        expect(sameDownload(a, { kind: 'paused', percent: 4 })).toBe(false);
        expect(sameDownload(null, null)).toBe(true);
        expect(sameDownload(a, null)).toBe(false);
    });
});

describe('liveInstalled', () => {
    it('follows the overview, so a finished install reads Play without a remount', () => {
        expect(liveInstalled({ installed: true }, false)).toBe(true);
        expect(liveInstalled({ installed: false }, true)).toBe(false);
    });
    it('keeps the snapshot when the overview does not say', () => {
        for (const o of [undefined, null, {}, { installed: 1 }, 'x']) expect(liveInstalled(o, true)).toBe(true);
        expect(liveInstalled({}, false)).toBe(false);
    });
});

// Shape probed on the Ally (SteamClient.Downloads.RegisterForDownloadItems), trimmed to the fields read.
const item = (over: Record<string, unknown>) => ({
    appid: 1, active: false, paused: false, completed: false, queue_index: -1, buildid: 0,
    update_type_info: [
        { has_update: false, completed_update: false, overall_percent_complete: 0 },
        { has_update: false, completed_update: false, overall_percent_complete: 0 },
    ],
    ...over,
});
const live = (pct: number) => [
    { has_update: true, completed_update: false, overall_percent_complete: pct },
    { has_update: false, completed_update: false, overall_percent_complete: 0 },
    { has_update: false, completed_update: false, overall_percent_complete: 0 },
];

describe('readDownloadItems', () => {
    it('reads a running install from the real item shape (Ally, 9% of a new install)', () => {
        const items = [{ remote_client_id: '0', item_data: [
            item({ appid: 894020, completed: true, update_type_info: [{ has_update: true, completed_update: true, overall_percent_complete: 100 }] }),
            item({ appid: 3892270, active: true, queue_index: 0, update_type_info: live(9) }),
        ] }];
        const map = readDownloadItems(items);
        expect([...map.keys()]).toEqual([3892270]);
        expect(map.get(3892270)).toEqual({ kind: 'downloading', percent: 9 });
    });
    it('completed items are not downloads, even with a queue index', () => {
        expect(readDownloadItems([{ item_data: [item({ completed: true, queue_index: 0 })] }]).size).toBe(0);
    });
    it('queued: not active, not paused, not completed, queue index >= 0; keeps the percent so far (probed: queued at 10)', () => {
        expect(readDownloadItems([{ item_data: [item({ appid: 5, queue_index: 1 })] }]).get(5)).toEqual({ kind: 'queued', percent: null });
        expect(readDownloadItems([{ item_data: [item({ appid: 5, queue_index: 0, update_type_info: live(10) })] }]).get(5)).toEqual({ kind: 'queued', percent: 10 });
        expect(readDownloadItems([{ item_data: [item({ appid: 5, queue_index: -1 })] }]).size).toBe(0);
    });
    it('paused keeps the percent', () => {
        expect(readDownloadItems([{ item_data: [item({ appid: 6, paused: true, queue_index: 0, update_type_info: live(41) })] }]).get(6)).toEqual({ kind: 'paused', percent: 41 });
    });
    it('takes the percent from the entry that has an update and is not complete, clamped', () => {
        const types = [
            { has_update: true, completed_update: true, overall_percent_complete: 100 },
            { has_update: true, completed_update: false, overall_percent_complete: 130 },
        ];
        expect(readDownloadItems([{ item_data: [item({ appid: 7, active: true, update_type_info: types })] }]).get(7)?.percent).toBe(100);
        expect(readDownloadItems([{ item_data: [item({ appid: 7, active: true })] }]).get(7)).toEqual({ kind: 'downloading', percent: null });
    });
    it('broken input is empty', () => {
        for (const bad of [null, undefined, 5, {}, [null], [{}], [{ item_data: 'x' }], [{ item_data: [null, { appid: 'x', active: true }] }]]) expect(readDownloadItems(bad).size).toBe(0);
    });
});

describe('refineKind', () => {
    it('a transfer is an update when installed, an install otherwise; other kinds stay', () => {
        expect(refineKind({ kind: 'downloading', percent: 9 }, false)).toEqual({ kind: 'installing', percent: 9 });
        expect(refineKind({ kind: 'downloading', percent: 9 }, true)).toEqual({ kind: 'updating', percent: 9 });
        expect(refineKind({ kind: 'paused', percent: 9 }, true)).toEqual({ kind: 'paused', percent: 9 });
    });
});

describe('download list robustness', () => {
    it('only the local list is accepted', () => {
        const prev = new Map([[1, { kind: 'downloading' as const, percent: 5 }]]);
        const items = [{ item_data: [item({ appid: 2, active: true, update_type_info: live(50) })] }];
        expect(acceptDownloadList(false, items, prev)).toBe(prev);
        expect(acceptDownloadList(undefined, items, prev)).toBe(prev);
        expect(acceptDownloadList(true, items, prev).get(2)).toEqual({ kind: 'downloading', percent: 50 });
    });
    it('prefers active over paused over queued for one app, whatever the order', () => {
        const q = item({ appid: 3, queue_index: 1 });
        const p = item({ appid: 3, paused: true, queue_index: 0 });
        const a = item({ appid: 3, active: true, queue_index: 0, update_type_info: live(20) });
        expect(readDownloadItems([{ item_data: [q, p, a] }]).get(3)).toEqual({ kind: 'downloading', percent: 20 });
        expect(readDownloadItems([{ item_data: [q, p] }]).get(3)?.kind).toBe('paused');
        expect(readDownloadItems([{ item_data: [a, q] }]).get(3)?.kind).toBe('downloading');
    });
    it('a null, missing or string queue index is not queued', () => {
        for (const queue_index of [null, undefined, '', '0']) expect(readDownloadItems([{ item_data: [item({ appid: 4, queue_index })] }]).size).toBe(0);
    });
    it('keeps the last stage percent when the running stage has completed but the item is still active', () => {
        const done = [{ has_update: true, completed_update: true, overall_percent_complete: 100 }, { has_update: false, completed_update: false, overall_percent_complete: 0 }];
        expect(readDownloadItems([{ item_data: [item({ appid: 8, active: true, update_type_info: done })] }]).get(8)).toEqual({ kind: 'downloading', percent: 100 });
    });
});

// Shapes probed on the Ally (RegisterForDownloadOverview, trimmed).
const ov = (over: Record<string, unknown>) => ({ remote_client_id: '0', update_state: 'Downloading', update_appid: 606150, overall_percent_complete: 99, paused: false, ...over });

describe('readOverview', () => {
    it('reads the local overview', () => {
        expect(readOverview(ov({}))).toEqual({ appId: 606150, state: 'Downloading', percent: 99, paused: false });
        expect(readOverview(ov({ update_state: 'None', update_appid: 0, overall_percent_complete: 0, paused: true }))).toEqual({ appId: 0, state: 'None', percent: 0, paused: true });
    });
    it('ignores a remote client and broken input', () => {
        expect(readOverview(ov({ remote_client_id: '5' }))).toBeNull();
        for (const bad of [null, undefined, 3, 'x']) expect(readOverview(bad)).toBeNull();
        expect(readOverview({})).toEqual({ appId: 0, state: 'None', percent: null, paused: false });
    });
});

describe('mergeDownloads (list + live overview, latest wins)', () => {
    // The list snapshot is stale: percent 1 while the overview says 99.
    const list = new Map([[606150, { kind: 'downloading' as const, percent: 1 }], [7, { kind: 'queued' as const, percent: null }], [8, { kind: 'paused' as const, percent: 30 }]]);
    const merge = (o: Record<string, unknown> | null, l = list) => mergeDownloads(l, o ? readOverview(ov(o)) : null);
    it('the overview gives the live percent for the running app; other entries stay from the list', () => {
        const m = merge({});
        expect(m.get(606150)).toEqual({ kind: 'downloading', percent: 99 });
        expect(m.get(7)).toEqual({ kind: 'queued', percent: null });
        expect(m.get(8)).toEqual({ kind: 'paused', percent: 30 });
    });
    it('without an overview the list stands alone', () => {
        expect(merge(null).get(606150)).toEqual({ kind: 'downloading', percent: 1 });
    });
    it('queued -> active: the app the overview names becomes active', () => {
        const m = merge({ update_appid: 7, overall_percent_complete: 4 });
        expect(m.get(7)).toEqual({ kind: 'downloading', percent: 4 });
    });
    it('pause -> resume -> active: the overview paused flag shows paused, and a resume clears it', () => {
        expect(merge({ paused: true, overall_percent_complete: 50 }).get(606150)).toEqual({ kind: 'paused', percent: 50 });
        const resumed = merge({ paused: false, overall_percent_complete: 51 }, new Map([[606150, { kind: 'paused' as const, percent: 50 }]]));
        expect(resumed.get(606150)).toEqual({ kind: 'downloading', percent: 51 });
    });
    it('active -> finalizing -> none', () => {
        expect(merge({ update_state: 'Finalizing', overall_percent_complete: 100 }).get(606150)).toEqual({ kind: 'finalizing', percent: 100 });
        expect(merge({ update_state: 'Finalizing', overall_percent_complete: 97 }).get(606150)?.percent).toBe(100);
        const none = merge({ update_state: 'None', update_appid: 0, overall_percent_complete: 0 });
        expect(none.has(606150)).toBe(false); // nothing is active: the list's stale active entry goes
        expect(none.get(7)?.kind).toBe('queued');
        expect(none.get(8)?.kind).toBe('paused');
    });
    it('does not mutate the list', () => {
        merge({ update_appid: 7 });
        expect(list.get(7)).toEqual({ kind: 'queued', percent: null });
    });
});
