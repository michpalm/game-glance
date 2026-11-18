import { sizeText } from '../storage/storageModel';

/**
 * The Downloads page (spec 2026-11-18-downloads-design, mock-up A2 with Completed) from Steam's own `downloadsStore`
 * (read on the PS5 2026-11-19). Pure; anything unexpected reads as nothing.
 */

export interface RawStage { bytes_in_progress?: unknown; bytes_total?: unknown; estimated_time_remaining_sec?: unknown }
export interface RawUpdateType { has_update?: unknown; completed?: unknown; progress?: unknown; overall_percent_complete?: unknown }
export interface RawItem {
    appid?: unknown; active?: unknown; paused?: unknown; completed?: unknown; queue_index?: unknown; completed_time?: unknown;
    overall_percent_complete?: unknown; update_type_info?: unknown;
}
export interface RawOverview {
    update_appid?: unknown; update_state?: unknown; paused?: unknown; overall_percent_complete?: unknown; overall_estimated_time_remaining_sec?: unknown;
    update_network_bytes_per_second?: unknown; update_peak_network_bytes_per_second?: unknown; update_disc_bytes_per_second?: unknown; progress?: unknown;
}
export interface RawSample { appid?: unknown; rt_sample_time?: unknown; network_bytes_per_second?: unknown; disc_bytes_per_second?: unknown; is_upload?: unknown }
export interface DownloadsInput { overview: RawOverview | null; queued: RawItem[]; completed: RawItem[]; history: RawSample[] }

export interface CurrentCard {
    mode: 'active' | 'paused' | 'idle'; appId: number | null; name: string; percent: number; line: string;
    /** 0..1: Steam's Download and Staging stages. */
    download: number; install: number; action: 'pause' | 'resume' | null;
}
export interface NetworkCard {
    mbps: string; peak: string; disk: string;
    /** Network bytes/s, oldest first. */ samples: number[];
    /** Disk bytes/s for the same seconds. */ diskSamples: number[];
    /** Steam's peak network bytes/s for this download (the dashed Peak line). */ peakBytes: number;
}
export interface QueueRow { appId: number; name: string; line: string; percent: number; ratio: number; tag: 'NEXT' | 'PAUSED' | null; queueIndex: number; canMoveUp: boolean }
export interface CompletedRow { appId: number; name: string; line: string }
export interface DownloadsView { current: CurrentCard; network: NetworkCard; queue: QueueRow[]; completed: CompletedRow[] }

/** Steam's k_EAppUpdateProgress: the Download and Staging (written to disk) stages. */
const DOWNLOAD = 2, STAGING = 3;
const GRAPH_SAMPLES = 300;
const GB = 1e9;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const appIdOf = (v: unknown) => { const n = num(v); return Number.isInteger(n) && n > 0 ? n : 0; };
const list = <T>(v: unknown): T[] => (Array.isArray(v) ? v : []);
const stage = (progress: unknown, index: number) => { const s = list<RawStage | null>(progress)[index]; return [num(s?.bytes_in_progress), num(s?.bytes_total)] as const; };
const ratio = (done: number, total: number) => (total > 0 ? Math.min(1, Math.max(0, done / total)) : 0);
const percentOf = (v: unknown) => Math.round(Math.min(100, Math.max(0, num(v))));

/** An item's bytes for one stage (Download by default) over its update types that have an update (as Steam's own rows add them). */
function itemBytes(item: RawItem, which = DOWNLOAD): [number, number] {
    let done = 0, total = 0;
    for (const t of list<RawUpdateType | null>(item.update_type_info)) {
        if (t?.has_update !== true) continue;
        const [d, n] = stage(t.progress, which);
        done += d; total += n;
    }
    return [done, total];
}
function itemPercent(item: RawItem): number {
    if (typeof item.overall_percent_complete === 'number') return percentOf(item.overall_percent_complete);
    const first = list<RawUpdateType | null>(item.update_type_info).find(t => t?.has_update === true);
    return percentOf(first?.overall_percent_complete);
}

/** "7.1 of 9.5 GB" when both are gigabytes, "120 MB of 12.0 GB" otherwise; '' without a total. */
function bytesLine(done: number, total: number): string {
    if (total <= 0) return '';
    return done >= GB && total >= GB ? `${(done / GB).toFixed(1)} of ${sizeText(total)}` : `${sizeText(done)} of ${sizeText(total)}`;
}

export function timeLeftText(seconds: number): string {
    if (!(seconds >= 0)) return '';
    if (seconds < 60) return 'under a minute left';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `about ${minutes} min left`;
    return `about ${Math.floor(minutes / 60)} h ${minutes % 60} min left`;
}
function agoText(seconds: number): string {
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
}
const mbps = (bytesPerSecond: number) => String(Math.round(bytesPerSecond * 8 / 1e6));
const joined = (...parts: string[]) => parts.filter(Boolean).join(' · ');

export function downloadsView(input: DownloadsInput, nameOf: (appId: number) => string, nowMs: number): DownloadsView {
    const o = input.overview && typeof input.overview === 'object' ? input.overview : null;
    const queued = list<RawItem | null>(input.queued)
        .filter((i): i is RawItem => !!i && appIdOf(i.appid) > 0 && typeof i.queue_index === 'number' && i.queue_index >= 0 && i.completed !== true)
        .sort((a, b) => num(a.queue_index) - num(b.queue_index));
    const activeId = o && o.update_state !== 'None' && typeof o.update_state === 'string' ? appIdOf(o.update_appid) : 0;

    let current: CurrentCard = { mode: 'idle', appId: null, name: 'Nothing downloading', percent: 0, line: '', download: 0, install: 0, action: null };
    let currentId = 0;
    if (activeId && o) {
        currentId = activeId;
        const [d, t] = stage(o.progress, DOWNLOAD), [sd, st] = stage(o.progress, STAGING);
        const paused = o.paused === true;
        current = { mode: paused ? 'paused' : 'active', appId: activeId, name: nameOf(activeId), percent: percentOf(o.overall_percent_complete),
            line: joined(bytesLine(d, t), paused ? '' : timeLeftText(num(o.overall_estimated_time_remaining_sec))),
            download: ratio(d, t), install: ratio(sd, st), action: paused ? 'resume' : 'pause' };
    } else if (queued.length > 0) {
        // Steam's Pause download (or nothing started yet): the first in line is what A starts.
        const first = queued[0];
        currentId = appIdOf(first.appid);
        const [d, t] = itemBytes(first), [sd, st] = itemBytes(first, STAGING);
        current = { mode: 'paused', appId: currentId, name: nameOf(currentId), percent: itemPercent(first), line: bytesLine(d, t),
            download: ratio(d, t), install: ratio(sd, st), action: 'resume' };
    }

    const queue = queued.filter(i => appIdOf(i.appid) !== currentId).map((i, index): QueueRow => {
        const appId = appIdOf(i.appid), [d, t] = itemBytes(i), percent = itemPercent(i);
        return { appId, name: nameOf(appId), line: bytesLine(d, t), percent, ratio: percent / 100,
            tag: i.paused === true ? 'PAUSED' : index === 0 ? 'NEXT' : null, queueIndex: num(i.queue_index), canMoveUp: index > 0 };
    });

    const completed = list<RawItem | null>(input.completed)
        .filter((i): i is RawItem => !!i && appIdOf(i.appid) > 0)
        .sort((a, b) => (num(b.completed_time) || -1) - (num(a.completed_time) || -1))
        .map((i): CompletedRow => {
            const appId = appIdOf(i.appid), [, t] = itemBytes(i), at = num(i.completed_time);
            return { appId, name: nameOf(appId), line: joined(t > 0 ? sizeText(t) : '', at > 0 ? `finished ${agoText(Math.max(0, nowMs / 1000 - at))}` : '') };
        });

    const history = list<RawSample | null>(input.history).filter((s): s is RawSample => !!s && s.is_upload !== true).slice(-GRAPH_SAMPLES);
    const peakBytes = num(o?.update_peak_network_bytes_per_second);
    const network: NetworkCard = { mbps: mbps(num(o?.update_network_bytes_per_second)), peak: `Peak ${mbps(peakBytes)}`,
        disk: `Disk ${mbps(num(o?.update_disc_bytes_per_second))}`, samples: history.map(s => num(s.network_bytes_per_second)),
        diskSamples: history.map(s => num(s.disc_bytes_per_second)), peakBytes };
    return { current, network, queue, completed };
}

/** The graph's top: the highest of network, disk and Steam's peak, with room so a line at the top is not clipped. */
const GRAPH_HEADROOM = 1.08;
export function graphScale(network: NetworkCard): number {
    return Math.max(0, ...network.samples, ...network.diskSamples, network.peakBytes) * GRAPH_HEADROOM;
}

/** SVG path data for the speed graph: scaled to `top` (the tallest sample by default), the area closed along the bottom. */
export function graphPath(samples: number[], width: number, height: number, top = Math.max(...samples)): { line: string; area: string } {
    if (samples.length < 2) return { line: '', area: '' };
    const r = (n: number) => Math.round(n * 10) / 10;
    const points = samples.map((v, i) => `${r(i * width / (samples.length - 1))} ${r(top > 0 ? height - v / top * height : height)}`);
    const line = `M${points.join(' L')}`;
    return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
}
