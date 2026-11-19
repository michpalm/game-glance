/** A screenshot as Steam lists it (SteamClient.Screenshots.GetAllAppsLocalScreenshotsRange). */
export interface RawShot { nAppID: number; strGameID: string; hHandle: number; nWidth: number; nHeight: number; nCreated: number; strUrl: string; bUploaded: boolean; ePrivacy: number }
/** A recording's summary as Steam's CGameRecordingStore (window.g_GRS) holds it. */
export interface RawClip { clip_id: string; game_id: string; name?: string; date_recorded: number; duration_ms: string | number }

export type MediaItem =
    | { kind: 'shot'; id: string; appId: number; gameId: string; handle: number; created: number; width: number; height: number; url: string; uploaded: boolean }
    | { kind: 'clip'; id: string; appId: number; gameId: string; created: number; durationMs: number; title: string };
export type ShotItem = Extract<MediaItem, { kind: 'shot' }>;
export type MediaTab = 'all' | 'shots' | 'clips';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Steam's own helper (sp.js): a relative screenshot path is served from its loopback host. */
export function shotUrl(strUrl: string): string {
    return strUrl.startsWith('https://') ? strUrl : `https://steamloopback.host/${strUrl}`;
}

function clipAppId(gameId: string): number {
    const n = Number(gameId);
    return Number.isInteger(n) && n > 0 && n <= 0xffffffff ? n : 0;
}

export function buildItems(shots: RawShot[], clips: RawClip[]): MediaItem[] {
    const items: MediaItem[] = [
        ...shots.map((s): MediaItem => ({
            kind: 'shot', id: `${s.strGameID}_${s.hHandle}`, appId: s.nAppID, gameId: s.strGameID, handle: s.hHandle,
            created: s.nCreated, width: s.nWidth, height: s.nHeight, url: shotUrl(s.strUrl), uploaded: !!s.bUploaded,
        })),
        ...clips.map((c): MediaItem => ({
            kind: 'clip', id: `clip_${c.clip_id}`, appId: clipAppId(c.game_id), gameId: c.game_id, created: c.date_recorded,
            durationMs: Number(c.duration_ms) || 0, title: c.name ?? '',
        })),
    ];
    return items.sort((a, b) => b.created - a.created || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function tabItems(items: MediaItem[], tab: MediaTab): MediaItem[] {
    if (tab === 'all') return items;
    const kind = tab === 'shots' ? 'shot' : 'clip';
    return items.filter(i => i.kind === kind);
}

export function mediaTabs(items: MediaItem[]): { key: MediaTab; label: string; count: number | null }[] {
    return [
        { key: 'all', label: 'All', count: items.length },
        { key: 'shots', label: 'Screenshots', count: tabItems(items, 'shots').length },
        { key: 'clips', label: 'Recordings', count: tabItems(items, 'clips').length },
    ];
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "Today", "Yesterday", else "12 November", with the year when it isn't this year; local time. */
export function dayLabel(unixSeconds: number, now: Date): string {
    const d = new Date(unixSeconds * 1000);
    if (dayKey(d) === dayKey(now)) return 'Today';
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (dayKey(d) === dayKey(y)) return 'Yesterday';
    const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return d.getFullYear() === now.getFullYear() ? day : `${day} ${d.getFullYear()}`;
}

/** The viewer's "12 November, 21:14" (the year when not this year); local time. */
export function formatWhen(unixSeconds: number, now: Date): string {
    const d = new Date(unixSeconds * 1000);
    const day = `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`;
    return `${day}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function dayGroups(items: MediaItem[], now: Date): { label: string; items: MediaItem[] }[] {
    const groups: { key: string; label: string; items: MediaItem[] }[] = [];
    for (const item of items) {
        const key = dayKey(new Date(item.created * 1000));
        const last = groups[groups.length - 1];
        if (last && last.key === key) last.items.push(item);
        else groups.push({ key, label: dayLabel(item.created, now), items: [item] });
    }
    return groups.map(({ label, items: list }) => ({ label, items: list }));
}

export function formatDuration(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** The item before or after `id`, wrapping at both ends; null when the list is empty or `id` isn't in it. */
export function stepItem(items: MediaItem[], id: string, step: -1 | 1): string | null {
    const i = items.findIndex(it => it.id === id);
    if (i < 0) return null;
    return items[(i + step + items.length) % items.length].id;
}

/** Where focus goes once `deletedId` is gone: the next item, else the previous, else nowhere. */
export function focusAfterDelete(items: MediaItem[], deletedId: string): string | null {
    const i = items.findIndex(it => it.id === deletedId);
    if (i < 0) return null;
    return items[i + 1]?.id ?? items[i - 1]?.id ?? null;
}
