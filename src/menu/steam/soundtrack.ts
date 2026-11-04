import type { Stop } from '../model';

/** SteamClient.Music's playback payload (read on the Ally 2026-11-04). */
export interface MusicState {
    uSoundtrackAppId: number; ePlaybackStatus: number; eRepeatStatus: number; bShuffle: boolean;
    nVolume: number; nActiveTrack: number; nLengthInMsec: number;
}
export type RepeatMode = 'off' | 'all' | 'one';
export interface SoundtrackSnapshot {
    status: 'idle' | 'playing' | 'paused'; appId: number; album: string; track: string; cover: string | null;
    lengthMs: number; positionMs: number; shuffle: boolean; repeat: RepeatMode; volume: number;
}
export interface AlbumInfo { album: string; tracks: string[]; coverHash: string | null }
interface Registration { unregister(): void }
export interface SoundtrackBindings {
    music: {
        registerChanges(fn: (state: MusicState) => void): Registration; registerPosition(fn: (ms: number) => void): Registration;
        togglePlayPause(): void; previous(): void; next(): void; setShuffled(on: boolean): void; setRepeat(mode: number): void;
        setVolume(volume: number): void; setPosition(ms: number): void;
    };
    details(appId: number): Promise<{ tracks: string[] }>;
    overview(appId: number): { name: string; coverHash: string | null } | null;
}

const REPEAT: RepeatMode[] = ['off', 'all', 'one'];
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** What the page shows. Steam's status 1 plays, 2 pauses; anything else, or no soundtrack, is nothing playing. */
export function soundtrackSnapshot(state: MusicState | null, info: AlbumInfo | null, positionMs: number): SoundtrackSnapshot {
    const appId = finite(state?.uSoundtrackAppId);
    const status = !state || appId <= 0 ? 'idle' : state.ePlaybackStatus === 1 ? 'playing' : state.ePlaybackStatus === 2 ? 'paused' : 'idle';
    const lengthMs = Math.max(0, finite(state?.nLengthInMsec));
    return {
        status, appId,
        album: info?.album ?? '',
        track: info?.tracks[finite(state?.nActiveTrack)] ?? '',
        cover: info?.coverHash ? `https://steamloopback.host/assets/${appId}/${info.coverHash}.jpg` : null,
        lengthMs, positionMs: Math.min(lengthMs, Math.max(0, finite(positionMs))),
        shuffle: state?.bShuffle === true, repeat: REPEAT[finite(state?.eRepeatStatus)] ?? 'off',
        volume: Math.min(100, Math.max(0, finite(state?.nVolume))),
    };
}

/** Steam's soundtrack player while the Soundtrack page is open: playback, position, the album's names, and the controls. */
export function createSoundtrack(bindings: SoundtrackBindings) {
    let state: MusicState | null = null, position = 0, info: AlbumInfo | null = null, infoFor = 0, disposed = false;
    let snapshot = soundtrackSnapshot(null, null, 0);
    let registrations: Registration[] = [];
    const listeners = new Set<Stop>();
    const publish = () => { snapshot = soundtrackSnapshot(state, info, position); listeners.forEach(fn => fn()); };
    const safely = (send: () => void) => { try { send(); } catch (error) { console.warn('[Game Glance] soundtrack control failed', error); } };
    function album(appId: number) {
        if (appId <= 0 || appId === infoFor) return;
        infoFor = appId; info = null;
        const overview = (() => { try { return bindings.overview(appId); } catch { return null; } })();
        void bindings.details(appId).then(details => {
            if (infoFor !== appId) return;
            info = { album: overview?.name ?? '', tracks: Array.isArray(details?.tracks) ? details.tracks : [], coverHash: overview?.coverHash ?? null };
            publish();
        }, () => { if (infoFor === appId) { info = { album: overview?.name ?? '', tracks: [], coverHash: overview?.coverHash ?? null }; publish(); } });
    }
    function start() {
        try {
            registrations = [
                bindings.music.registerChanges(next => { state = next; album(finite(next?.uSoundtrackAppId)); publish(); }),
                bindings.music.registerPosition(ms => { position = finite(ms); publish(); }),
            ];
        } catch (error) { console.warn('[Game Glance] soundtrack unavailable', error); }
    }
    function stop() { for (const r of registrations.splice(0)) safely(() => r.unregister()); }
    // Volume follows the slider live but sends at most every 100ms; a seek waits until the slider is still.
    let volumeTimer: ReturnType<typeof setTimeout> | undefined, volumePending: number | undefined;
    const sendVolume = (v: number) => safely(() => bindings.music.setVolume(Math.round(Math.min(100, Math.max(0, v)))));
    const flushVolume = () => {
        volumeTimer = undefined;
        if (volumePending === undefined) return;
        const v = volumePending; volumePending = undefined; sendVolume(v); volumeTimer = setTimeout(flushVolume, 100);
    };
    let seekTimer: ReturnType<typeof setTimeout> | undefined;
    return {
        get: () => snapshot,
        subscribe(listener: Stop): Stop {
            if (disposed) return () => {};
            listeners.add(listener);
            if (listeners.size === 1) start();
            return () => { listeners.delete(listener); if (!listeners.size) stop(); };
        },
        togglePlay: () => safely(() => bindings.music.togglePlayPause()),
        previous: () => safely(() => bindings.music.previous()),
        next: () => safely(() => bindings.music.next()),
        toggleShuffle: () => safely(() => bindings.music.setShuffled(!(state?.bShuffle === true))),
        cycleRepeat: () => safely(() => bindings.music.setRepeat((finite(state?.eRepeatStatus) + 1) % REPEAT.length)),
        setVolume(volume: number) {
            if (volumeTimer) { volumePending = volume; return; }
            sendVolume(volume); volumeTimer = setTimeout(flushVolume, 100);
        },
        seek(ms: number) {
            if (seekTimer) clearTimeout(seekTimer);
            seekTimer = setTimeout(() => { seekTimer = undefined; safely(() => bindings.music.setPosition(Math.max(0, Math.round(ms)))); }, 300);
        },
        dispose() {
            if (disposed) return;
            disposed = true; listeners.clear(); stop();
            if (volumeTimer) clearTimeout(volumeTimer);
            if (seekTimer) clearTimeout(seekTimer);
        },
    };
}
export type SoundtrackService = ReturnType<typeof createSoundtrack>;

interface MusicClient {
    RegisterForMusicPlaybackChanges?(fn: (state: MusicState) => void): Registration;
    RegisterForMusicPlaybackPosition?(fn: (ms: number) => void): Registration;
    TogglePlayPause?(): void; PlayPrevious?(): void; PlayNext?(): void; SetPlayingShuffled?(on: boolean): void;
    SetPlayingRepeatStatus?(mode: number): void; SetVolume?(volume: number): void; SetPlaybackPosition?(ms: number): void;
}
interface SoundtrackRoot {
    SteamClient?: { Music?: MusicClient; Apps?: { GetSoundtrackDetails?(appId: number): Promise<{ tracks?: { trackDisplayName?: unknown }[] }> } };
    appStore?: { GetAppOverviewByAppID?(appId: number): { display_name?: unknown; album_cover_hash?: unknown } | null | undefined };
}
/** Steam's own music player and soundtrack details; null when this Steam has none. */
export function nativeSoundtrackBindings(root: SoundtrackRoot = globalThis as SoundtrackRoot): SoundtrackBindings | null {
    const m = root.SteamClient?.Music, apps = root.SteamClient?.Apps;
    const needed = [m?.RegisterForMusicPlaybackChanges, m?.RegisterForMusicPlaybackPosition, m?.TogglePlayPause, m?.PlayPrevious, m?.PlayNext,
        m?.SetPlayingShuffled, m?.SetPlayingRepeatStatus, m?.SetVolume, m?.SetPlaybackPosition, apps?.GetSoundtrackDetails];
    if (!m || !apps || needed.some(fn => typeof fn !== 'function')) return null;
    return {
        music: {
            registerChanges: fn => m.RegisterForMusicPlaybackChanges!(fn), registerPosition: fn => m.RegisterForMusicPlaybackPosition!(fn),
            togglePlayPause: () => m.TogglePlayPause!(), previous: () => m.PlayPrevious!(), next: () => m.PlayNext!(),
            setShuffled: on => m.SetPlayingShuffled!(on), setRepeat: mode => m.SetPlayingRepeatStatus!(mode),
            setVolume: volume => m.SetVolume!(volume), setPosition: ms => m.SetPlaybackPosition!(ms),
        },
        async details(appId) {
            const d = await apps.GetSoundtrackDetails!(appId);
            return { tracks: Array.isArray(d?.tracks) ? d.tracks.map(t => typeof t?.trackDisplayName === 'string' ? t.trackDisplayName : '') : [] };
        },
        overview(appId) {
            const o = root.appStore?.GetAppOverviewByAppID?.(appId);
            if (!o) return null;
            return { name: typeof o.display_name === 'string' ? o.display_name : '', coverHash: typeof o.album_cover_hash === 'string' && /^[0-9a-f]{40}$/.test(o.album_cover_hash) ? o.album_cover_hash : null };
        },
    };
}
