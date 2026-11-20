import { describe, expect, it, vi } from 'vitest';
import { createMediaBindings } from '../../src/media/steamMedia';
import type { MediaItem, RawShot } from '../../src/media/mediaModel';

const raw = (h: number): RawShot => ({ nAppID: 7, strGameID: '7', hHandle: h, nWidth: 1920, nHeight: 1080, nCreated: 1794958645, strUrl: `s/${h}.jpg`, bUploaded: false, ePrivacy: 2 });
const shot: MediaItem = { kind: 'shot', id: '7_2', appId: 7, gameId: '7', handle: 2, created: 1, width: 1920, height: 1080, url: '', uploaded: false };
const clip: MediaItem = { kind: 'clip', id: 'clip_abc', appId: 1145360, gameId: '1145360', created: 1, durationMs: 42000, title: '' };

function fakeSteam(count: number) {
    const Range = vi.fn(async (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => raw(start + i)));
    const Screenshots = {
        GetAllAppsLocalScreenshotsCount: vi.fn(async () => count),
        GetAllAppsLocalScreenshotsRange: Range,
        UploadLocalScreenshot: vi.fn(async () => true),
        DeleteLocalScreenshots: vi.fn(async () => ({ bSuccess: true, rgFailedRequestIndices: [] })),
    };
    const unregister = vi.fn();
    let handler: ((n: { strOperation: string }) => void) | null = null;
    const GameSessions = { RegisterForScreenshotNotification: vi.fn((cb: typeof handler) => { handler = cb; return { unregister }; }) };
    return { steam: { Screenshots, GameSessions }, Screenshots, unregister, fire: (op: string) => handler?.({ strOperation: op }) };
}

describe('list', () => {
    it('reads 1,500 shots in pages of 1000', async () => {
        const f = fakeSteam(1500);
        const r = await createMediaBindings(f.steam, {}).list();
        expect(f.Screenshots.GetAllAppsLocalScreenshotsRange.mock.calls).toEqual([[0, 999], [1000, 1499]]);
        expect(r!.shots).toHaveLength(1500);
        expect(r!.clips).toEqual([]);
    });
    it('no Range call for 0 shots', async () => {
        const f = fakeSteam(0);
        expect(await createMediaBindings(f.steam, {}).list()).toEqual({ shots: [], clips: [] });
        expect(f.Screenshots.GetAllAppsLocalScreenshotsRange).not.toHaveBeenCalled();
    });
    it('null when Count throws, logged once', async () => {
        const f = fakeSteam(1);
        f.Screenshots.GetAllAppsLocalScreenshotsCount.mockRejectedValue(new Error('gone'));
        const log = vi.fn();
        const b = createMediaBindings(f.steam, {}, log);
        expect(await b.list()).toBeNull();
        expect(await b.list()).toBeNull();
        expect(log).toHaveBeenCalledTimes(1);
    });
    it("reads clips from Steam's recording store", async () => {
        const c = { clip_id: 'abc', game_id: '1', date_recorded: 5, duration_ms: '1000' };
        const viaSummaries = { GetClipIDs: () => ['abc'], GetClipSummaries: vi.fn(() => [c]) };
        expect((await createMediaBindings(fakeSteam(0).steam, { grs: viaSummaries }).list())!.clips).toEqual([c]);
        expect(viaSummaries.GetClipSummaries).toHaveBeenCalledWith(['abc']);
        const viaMap = { m_clips: new Map([['abc', c]]) };
        expect((await createMediaBindings(fakeSteam(0).steam, { grs: viaMap }).list())!.clips).toEqual([c]);
    });
    it("waits for Steam's lazy clip load before reading", async () => {
        const c = { clip_id: 'abc', game_id: '1', date_recorded: 5, duration_ms: '1000' };
        const m_clips = new Map<string, typeof c>();
        let loading = true;
        const grs = {
            m_clips,
            LazyLoadClips: vi.fn(async () => { await Promise.resolve(); m_clips.set('abc', c); loading = false; }),
            BLoadingClips: () => loading,
            GetClipIDs: () => [...m_clips.keys()],
            GetClipSummaries: (ids: string[]) => ids.map(id => m_clips.get(id)!),
        };
        expect((await createMediaBindings(fakeSteam(0).steam, { grs }).list())!.clips).toEqual([c]);
        expect(grs.LazyLoadClips).toHaveBeenCalled();
    });
    it('unavailable without SteamClient.Screenshots', () => {
        expect(createMediaBindings({}, {}).available()).toBe(false);
        expect(createMediaBindings(fakeSteam(0).steam, {}).available()).toBe(true);
    });
});

describe('gameName (Review Focus 4)', () => {
    const appStore = { GetAppOverviewByAppID: (id: number) => (id === 1145360 ? { display_name: 'Hades' } : null) };
    const screenshotStore = { GetShortcutDisplayName: (g: string) => (g === '9055727' ? 'Emu' : undefined) };
    const b = createMediaBindings(fakeSteam(0).steam, { appStore, screenshotStore });
    it("a Steam game's display name", () => expect(b.gameName(clip)).toBe('Hades'));
    it("a shortcut's name", () => expect(b.gameName({ ...shot, appId: 9055727, gameId: '9055727' })).toBe('Emu'));
    it('Steam itself', () => expect(b.gameName(shot)).toBe('Steam'));
    it('unknown → null', () => expect(b.gameName({ ...shot, appId: 5, gameId: '5' })).toBeNull());
});

describe('actions', () => {
    it("upload passes Steam's arguments and answer", async () => {
        const f = fakeSteam(0);
        const b = createMediaBindings(f.steam, {});
        expect(await b.upload(shot as Extract<MediaItem, { kind: 'shot' }>, 2)).toBe(true);
        expect(f.Screenshots.UploadLocalScreenshot).toHaveBeenCalledWith('7', 2, 2);
        f.Screenshots.UploadLocalScreenshot.mockResolvedValue(false);
        expect(await b.upload(shot as Extract<MediaItem, { kind: 'shot' }>, 0)).toBe(false);
        f.Screenshots.UploadLocalScreenshot.mockRejectedValue(new Error('x'));
        expect(await b.upload(shot as Extract<MediaItem, { kind: 'shot' }>, 0)).toBe(false);
    });
    it('remove a shot (Review Focus 3)', async () => {
        const f = fakeSteam(0);
        const b = createMediaBindings(f.steam, {});
        expect(await b.remove(shot)).toBe(true);
        expect(f.Screenshots.DeleteLocalScreenshots).toHaveBeenCalledWith([{ gameID: '7', rgHandles: [2] }]);
        f.Screenshots.DeleteLocalScreenshots.mockResolvedValue({ bSuccess: false, rgFailedRequestIndices: [0] });
        expect(await b.remove(shot)).toBe(false);
        f.Screenshots.DeleteLocalScreenshots.mockRejectedValue(new Error('x'));
        expect(await b.remove(shot)).toBe(false);
    });
    it('remove a clip: success only once it is gone', async () => {
        const m_clips = new Map([['abc', {}]]);
        const grs = { m_clips, DeleteClip: vi.fn(async (id: string) => { m_clips.delete(id); }) };
        expect(await createMediaBindings(fakeSteam(0).steam, { grs }).remove(clip)).toBe(true);
        expect(grs.DeleteClip).toHaveBeenCalledWith('abc');
        const stuck = { m_clips: new Map([['abc', {}]]), DeleteClip: vi.fn(async () => undefined) };
        expect(await createMediaBindings(fakeSteam(0).steam, { grs: stuck }).remove(clip)).toBe(false);
    });
    it("onNewShot fires on 'written' only and stops", () => {
        const f = fakeSteam(0);
        const cb = vi.fn();
        const stop = createMediaBindings(f.steam, {}).onNewShot(cb);
        f.fire('started');
        f.fire('written');
        expect(cb).toHaveBeenCalledTimes(1);
        stop();
        expect(f.unregister).toHaveBeenCalled();
    });
});
