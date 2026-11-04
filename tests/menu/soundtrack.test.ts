import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSoundtrack, nativeSoundtrackBindings, soundtrackSnapshot, type MusicState, type SoundtrackBindings } from '../../src/menu/steam/soundtrack';

// Payloads as SteamClient.Music delivered them on the Ally (2026-11-04, Blasphemous - OST).
const playing: MusicState = { uSoundtrackAppId: 1143852, ePlaybackStatus: 1, eRepeatStatus: 0, bShuffle: false, nVolume: 12, nActiveTrack: 3, nLengthInMsec: 288317 };
const info = { album: 'Blasphemous - OST', tracks: ['Dame Tu Tormento', 'La Muerte de los Relinchos', 'Tierras de Azafrán', 'Que las Campanas Me Doblen'], coverHash: '85ed68cb95eede61246d15e29f036d8b3de8fd6a' };

describe('soundtrackSnapshot', () => {
    it('names the album and the active track (0-based), with Steam’s cover address', () => {
        expect(soundtrackSnapshot(playing, info, 125443)).toEqual({
            status: 'playing', appId: 1143852, album: 'Blasphemous - OST', track: 'Que las Campanas Me Doblen',
            cover: 'https://steamloopback.host/assets/1143852/85ed68cb95eede61246d15e29f036d8b3de8fd6a.jpg',
            lengthMs: 288317, positionMs: 125443, shuffle: false, repeat: 'off', volume: 12,
        });
    });
    it('maps paused, the repeat modes and shuffle', () => {
        expect(soundtrackSnapshot({ ...playing, ePlaybackStatus: 2 }, info, 0).status).toBe('paused');
        expect(soundtrackSnapshot({ ...playing, eRepeatStatus: 1 }, info, 0).repeat).toBe('all');
        expect(soundtrackSnapshot({ ...playing, eRepeatStatus: 2 }, info, 0).repeat).toBe('one');
        expect(soundtrackSnapshot({ ...playing, bShuffle: true }, info, 0).shuffle).toBe(true);
    });
    it('is idle with nothing playing', () => {
        expect(soundtrackSnapshot(null, null, 0).status).toBe('idle');
        expect(soundtrackSnapshot({ ...playing, ePlaybackStatus: 0 }, info, 0).status).toBe('idle');
        expect(soundtrackSnapshot({ ...playing, uSoundtrackAppId: 0 }, info, 0).status).toBe('idle');
    });
    it('keeps the page usable before the album details arrive', () => {
        const s = soundtrackSnapshot(playing, null, 0);
        expect(s).toMatchObject({ status: 'playing', album: '', track: '', cover: null });
    });
    it('clamps the position into the track and ignores a nonsense volume', () => {
        expect(soundtrackSnapshot(playing, info, 999999999).positionMs).toBe(288317);
        expect(soundtrackSnapshot({ ...playing, nVolume: Number.NaN }, info, 0).volume).toBe(0);
    });
});

function harness() {
    vi.useFakeTimers();
    let change: ((s: MusicState) => void) | undefined, position: ((ms: number) => void) | undefined;
    const unregister = vi.fn();
    const music = {
        registerChanges: vi.fn((fn: (s: MusicState) => void) => { change = fn; return { unregister }; }),
        registerPosition: vi.fn((fn: (ms: number) => void) => { position = fn; return { unregister }; }),
        togglePlayPause: vi.fn(), previous: vi.fn(), next: vi.fn(), setShuffled: vi.fn(), setRepeat: vi.fn(), setVolume: vi.fn(), setPosition: vi.fn(),
    };
    const bindings: SoundtrackBindings = { music, details: vi.fn(async () => ({ tracks: info.tracks })), overview: vi.fn(() => ({ name: info.album, coverHash: info.coverHash })) };
    const service = createSoundtrack(bindings);
    return { service, music, bindings, unregister, change: (s: MusicState) => change!(s), position: (ms: number) => position!(ms) };
}
afterEach(() => vi.useRealTimers());

describe('createSoundtrack', () => {
    it('listens to Steam only while subscribed', () => {
        const h = harness();
        expect(h.music.registerChanges).not.toHaveBeenCalled();
        const stop = h.service.subscribe(() => {});
        expect(h.music.registerChanges).toHaveBeenCalledTimes(1);
        expect(h.music.registerPosition).toHaveBeenCalledTimes(1);
        stop();
        expect(h.unregister).toHaveBeenCalledTimes(2);
    });
    it('reads the album once per soundtrack and follows playback', async () => {
        const h = harness();
        const seen = vi.fn(); h.service.subscribe(seen);
        h.change(playing); await vi.runAllTimersAsync();
        h.position(125443);
        expect(h.service.get()).toMatchObject({ status: 'playing', track: 'Que las Campanas Me Doblen', positionMs: 125443 });
        h.change({ ...playing, nActiveTrack: 0 }); await vi.runAllTimersAsync();
        expect(h.service.get().track).toBe('Dame Tu Tormento');
        expect(h.bindings.details).toHaveBeenCalledTimes(1);
        expect(seen).toHaveBeenCalled();
    });
    it('sends the controls as Steam expects them', () => {
        const h = harness(); h.service.subscribe(() => {}); h.change({ ...playing, bShuffle: false, eRepeatStatus: 2 });
        h.service.togglePlay(); h.service.previous(); h.service.next();
        h.service.toggleShuffle(); expect(h.music.setShuffled).toHaveBeenCalledWith(true);
        h.service.cycleRepeat(); expect(h.music.setRepeat).toHaveBeenCalledWith(0);
        expect(h.music.togglePlayPause).toHaveBeenCalledTimes(1);
        expect(h.music.previous).toHaveBeenCalledTimes(1);
        expect(h.music.next).toHaveBeenCalledTimes(1);
    });
    it('sends volume at most every 100ms while moving, and the last value', () => {
        const h = harness(); h.service.subscribe(() => {});
        h.service.setVolume(20); h.service.setVolume(22); h.service.setVolume(24);
        expect(h.music.setVolume.mock.calls).toEqual([[20]]);
        vi.advanceTimersByTime(100);
        expect(h.music.setVolume.mock.calls).toEqual([[20], [24]]);
        vi.advanceTimersByTime(300);
        expect(h.music.setVolume).toHaveBeenCalledTimes(2);
    });
    it('seeks once the position slider has been still for 300ms', () => {
        const h = harness(); h.service.subscribe(() => {});
        h.service.seek(1000); vi.advanceTimersByTime(200); h.service.seek(5000);
        expect(h.music.setPosition).not.toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(h.music.setPosition.mock.calls).toEqual([[5000]]);
    });
    it('keeps a failed Steam call from breaking the page', () => {
        const h = harness(); h.service.subscribe(() => {});
        h.music.next.mockImplementation(() => { throw Error('x'); });
        expect(() => h.service.next()).not.toThrow();
    });
});

describe('nativeSoundtrackBindings', () => {
    const fn = () => vi.fn();
    const music = () => ({ RegisterForMusicPlaybackChanges: fn(), RegisterForMusicPlaybackPosition: fn(), TogglePlayPause: fn(), PlayPrevious: fn(), PlayNext: fn(), SetPlayingShuffled: fn(), SetPlayingRepeatStatus: fn(), SetVolume: fn(), SetPlaybackPosition: fn() });
    it('is null on a Steam without the music API', () => {
        expect(nativeSoundtrackBindings({})).toBeNull();
        expect(nativeSoundtrackBindings({ SteamClient: { Music: { ...music(), SetVolume: undefined }, Apps: { GetSoundtrackDetails: vi.fn() } } })).toBeNull();
    });
    it('reads track names and the album cover hash in Steam’s shapes', async () => {
        const b = nativeSoundtrackBindings({
            SteamClient: { Music: music(), Apps: { GetSoundtrackDetails: vi.fn(async () => ({ tracks: [{ trackDisplayName: 'A' }, { trackDisplayName: 7 }] })) } },
            appStore: { GetAppOverviewByAppID: () => ({ display_name: 'Blasphemous - OST', album_cover_hash: '85ed68cb95eede61246d15e29f036d8b3de8fd6a' }) },
        })!;
        expect(await b.details(1)).toEqual({ tracks: ['A', ''] });
        expect(b.overview(1)).toEqual({ name: 'Blasphemous - OST', coverHash: '85ed68cb95eede61246d15e29f036d8b3de8fd6a' });
    });
});
