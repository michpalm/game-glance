import { describe, expect, it } from 'vitest';
import { downloadsView, graphPath, graphScale, timeLeftText, type DownloadsInput, type RawItem, type RawOverview, type RawSample } from '../../src/downloads/downloadsModel';

const NOW = 1_795_000_000_000;
const name = (id: number) => `Game ${id}`;
type Stage = [number, number];
const stages = (set: Record<number, Stage>) => Array.from({ length: 7 }, (_, i) => ({ bytes_in_progress: set[i]?.[0] ?? 0, bytes_total: set[i]?.[1] ?? 0, estimated_time_remaining_sec: 0 }));
const uti = (set: Record<number, Stage>, hasUpdate = true) => ({ has_update: hasUpdate, completed: false, progress: stages(set), overall_percent_complete: 0 });
const item = (appid: number, extra: Partial<RawItem> = {}): RawItem => ({ appid, active: false, paused: false, completed: false, queue_index: -1, completed_time: 0,
    update_type_info: [uti({ 2: [0, 1e9] })], ...extra });
const overview = (extra: Partial<RawOverview> = {}): RawOverview => ({ update_appid: 0, update_state: 'None', paused: false, overall_percent_complete: 0,
    overall_estimated_time_remaining_sec: -1, update_network_bytes_per_second: 0, update_peak_network_bytes_per_second: 0, update_disc_bytes_per_second: 0,
    progress: stages({}), ...extra });
const sample = (net: number, disc = 0): RawSample => ({ appid: 1, rt_sample_time: 0, network_bytes_per_second: net, disc_bytes_per_second: disc, is_upload: false });
const input = (extra: Partial<DownloadsInput>): DownloadsInput => ({ overview: null, queued: [], completed: [], history: [], ...extra });

describe('downloadsView', () => {
    it('shows the active download: percent, bytes of the Download stage, time left, both bars', () => {
        const v = downloadsView(input({ overview: overview({ update_appid: 10, update_state: 'Downloading', overall_percent_complete: 74,
            overall_estimated_time_remaining_sec: 120, progress: stages({ 2: [7.1e9, 9.5e9], 3: [7.0e9, 9.5e9] }) }) }), name, NOW);
        expect(v.current).toMatchObject({ mode: 'active', appId: 10, name: 'Game 10', percent: 74, line: '7.1 of 9.5 GB · about 2 min left', action: 'pause' });
        expect(v.current.download).toBeCloseTo(7.1 / 9.5);
        expect(v.current.install).toBeCloseTo(7.0 / 9.5);
    });
    it('an active download Steam has paused: Paused, A resumes it', () => {
        const v = downloadsView(input({ overview: overview({ update_appid: 10, update_state: 'Downloading', paused: true }) }), name, NOW);
        expect(v.current).toMatchObject({ mode: 'paused', appId: 10, action: 'resume' });
    });
    it('a finished item Steam leaves a queue place (PS5: Steamworks Common Redistributables) is not in Up next', () => {
        const v = downloadsView(input({ queued: [item(10, { queue_index: 0 }), item(20, { queue_index: 1 }), item(228980, { queue_index: 2, completed: true })] }), name, NOW);
        expect(v.queue.map(r => r.appId)).toEqual([20]);
    });
    it('the all-paused card keeps its INSTALL bar from the item\'s staging bytes', () => {
        const v = downloadsView(input({ overview: overview({ paused: true }),
            queued: [item(30, { queue_index: 0, update_type_info: [uti({ 2: [6e9, 12e9], 3: [3e9, 12e9] })] })] }), name, NOW);
        expect(v.current.install).toBeCloseTo(0.25);
    });
    it('all paused, nothing active: the card is the first queued game, Paused, A resumes it (Review Focus)', () => {
        const v = downloadsView(input({ overview: overview({ update_appid: 0, update_state: 'None', paused: true }),
            queued: [item(20, { queue_index: 1 }), item(30, { queue_index: 0, overall_percent_complete: 1, update_type_info: [uti({ 2: [120e6, 12e9] })] })] }), name, NOW);
        expect(v.current).toMatchObject({ mode: 'paused', appId: 30, name: 'Game 30', percent: 1, line: '120 MB of 12.0 GB', action: 'resume' });
        expect(v.queue.map(r => r.appId)).toEqual([20]);
    });
    it('nothing queued or active: idle card, empty queue (Review Focus)', () => {
        const v = downloadsView(input({}), name, NOW);
        expect(v.current).toMatchObject({ mode: 'idle', appId: null, action: null, name: 'Nothing downloading' });
        expect(v.queue).toEqual([]);
    });
    it('queue rows in queue order without the current game: Download-stage bytes summed, NEXT on the first, PAUSED on paused ones', () => {
        const v = downloadsView(input({ overview: overview({ update_appid: 10, update_state: 'Downloading' }),
            queued: [item(10, { queue_index: 0 }), item(40, { queue_index: 2, paused: true }),
                item(30, { queue_index: 1, update_type_info: [uti({ 2: [120e6, 12e9] }), uti({ 2: [0, 1e9] }, false)] })] }), name, NOW);
        expect(v.queue.map(r => [r.appId, r.tag, r.canMoveUp, r.queueIndex])).toEqual([[30, 'NEXT', false, 1], [40, 'PAUSED', true, 2]]);
        expect(v.queue[0].line).toBe('120 MB of 12.0 GB');
        expect(v.queue[0].ratio).toBe(v.queue[0].percent / 100);
    });
    it('a queue row\'s bar follows Steam\'s percent, as Steam\'s own rows, even when the bytes disagree (PS5: Batman 52%, 266 MB of 8.2 GB)', () => {
        const v = downloadsView(input({ queued: [item(10, { queue_index: 0 }),
            item(35140, { queue_index: 1, overall_percent_complete: 52, update_type_info: [uti({ 2: [266e6, 8.2e9] })] })] }), name, NOW);
        expect(v.queue.find(r => r.appId === 35140)).toMatchObject({ percent: 52, ratio: 0.52, line: '266 MB of 8.2 GB' });
    });
    it('a 0-byte item shows no "of 0 MB" (Review Focus)', () => {
        const v = downloadsView(input({ queued: [item(10, { queue_index: 0 }), item(50, { queue_index: 1, update_type_info: [uti({})], overall_percent_complete: 40 })] }), name, NOW);
        expect(v.queue.find(r => r.appId === 50)).toMatchObject({ line: '', percent: 40 });
    });
    it('completed newest first: size and how long ago', () => {
        const v = downloadsView(input({ completed: [
            item(70, { completed: true, completed_time: 0 }),
            item(60, { completed: true, completed_time: NOW / 1000 - 720, update_type_info: [uti({ 2: [7.6e9, 7.6e9] })] }),
        ] }), name, NOW);
        expect(v.completed[0]).toEqual({ appId: 60, name: 'Game 60', line: '7.6 GB · finished 12 min ago' });
        expect(v.completed[1]).toEqual({ appId: 70, name: 'Game 70', line: '1.0 GB' });
    });
    it('network in Mbps, the last 300 samples for the graph', () => {
        const history = Array.from({ length: 320 }, (_, i) => sample(i * 1000));
        const v = downloadsView(input({ overview: overview({ update_network_bytes_per_second: 31e6, update_peak_network_bytes_per_second: 31e6, update_disc_bytes_per_second: 32.6e6 }), history }), name, NOW);
        expect(v.network).toMatchObject({ mbps: '248', peak: 'Peak 248', disk: 'Disk 261' });
        expect(v.network.samples).toHaveLength(300);
        expect(v.network.samples[0]).toBe(20 * 1000);
    });
    it('the disk speeds run alongside the network samples, and the peak is Steam\'s (graph: Disk line, Peak line)', () => {
        const history = Array.from({ length: 320 }, (_, i) => sample(i * 1000, i * 2000));
        const v = downloadsView(input({ overview: overview({ update_peak_network_bytes_per_second: 31e6 }), history }), name, NOW);
        expect(v.network.diskSamples).toHaveLength(300);
        expect(v.network.diskSamples[0]).toBe(20 * 2000);
        expect(v.network.peakBytes).toBe(31e6);
    });
    it('reads broken input as nothing', () => {
        const v = downloadsView({ overview: { update_appid: 'x' } as unknown as RawOverview, queued: [null as unknown as RawItem, { appid: 5 } as RawItem], completed: [], history: [] }, name, NOW);
        expect(v.current.mode).toBe('idle');
        expect(v.queue).toEqual([]);
    });
});

describe('graphPath', () => {
    it('scales to the tallest sample and closes the area at the bottom', () => {
        const p = graphPath([0, 50, 100], 200, 100);
        expect(p.line).toBe('M0 100 L100 50 L200 0');
        expect(p.area).toBe('M0 100 L100 50 L200 0 L200 100 L0 100 Z');
    });
    it('draws nothing without two samples, and a flat line at the bottom for all zeros', () => {
        expect(graphPath([5], 200, 100)).toEqual({ line: '', area: '' });
        expect(graphPath([0, 0], 200, 100).line).toBe('M0 100 L200 100');
    });
    it('draws against a given top, so network and disk share one scale', () => {
        expect(graphPath([0, 50], 200, 100, 200).line).toBe('M0 100 L200 75');
    });
});

describe('graphScale', () => {
    it('the top of the graph: the highest of network, disk and Steam\'s peak, with 8% headroom so a line at the top is not clipped', () => {
        expect(graphScale({ mbps: '', peak: '', disk: '', samples: [10, 50], diskSamples: [80, 20], peakBytes: 60 })).toBeCloseTo(86.4);
        expect(graphScale({ mbps: '', peak: '', disk: '', samples: [10], diskSamples: [5], peakBytes: 100 })).toBeCloseTo(108);
        expect(graphScale({ mbps: '', peak: '', disk: '', samples: [], diskSamples: [], peakBytes: 0 })).toBe(0);
    });
});

describe('timeLeftText', () => {
    it('as Steam rounds it', () => {
        expect(timeLeftText(45)).toBe('under a minute left');
        expect(timeLeftText(120)).toBe('about 2 min left');
        expect(timeLeftText(3 * 3600 + 600)).toBe('about 3 h 10 min left');
        expect(timeLeftText(-1)).toBe('');
    });
});
