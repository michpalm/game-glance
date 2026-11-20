import { describe, expect, it, vi } from 'vitest';
import { createDownloadsBindings } from '../../src/downloads/steamDownloads';

const sample = (net: number, upload = false) => ({ appid: 1, rt_sample_time: 0, network_bytes_per_second: net, disc_bytes_per_second: 0, is_upload: upload });
function fakes(store: Record<string, unknown> = {}) {
    const calls: unknown[][] = [];
    const record = (name: string) => vi.fn((...args: unknown[]) => { calls.push([name, ...args]); });
    const downloads = { SetQueueIndex: record('SetQueueIndex'), ResumeAppUpdate: record('ResumeAppUpdate'), RemoveFromDownloadList: record('RemoveFromDownloadList'),
        EnableAllDownloads: record('EnableAllDownloads') };
    const s = { LocalDownloadOverview: { update_appid: 7 }, QueuedTransfers: [{ appid: 7 }], CompletedTransfers: [{ appid: 8 }], RecentlyCompleted: [{ appid: 9 }], DownloadHistory: [sample(1), sample(2, true), sample(3)], ...store };
    return { calls, downloads, bindings: createDownloadsBindings(s, { Downloads: downloads }) };
}

describe('createDownloadsBindings', () => {
    it('reads Steam\'s overview, queue, completed transfers (its Downloads page\'s list, not the Home carousel\'s) and download (not upload) history', () => {
        const { bindings } = fakes();
        expect(bindings.available()).toBe(true);
        expect(bindings.read()).toEqual({ overview: { update_appid: 7 }, queued: [{ appid: 7 }], completed: [{ appid: 8 }], history: [sample(1), sample(3)] });
    });
    it('takes the local client\'s history when Steam keys it by client', () => {
        const { bindings } = fakes({ DownloadHistory: new Map([['0', [sample(4)]], ['99', [sample(5)]]]) });
        expect(bindings.read()?.history).toEqual([sample(4)]);
    });
    it('is unavailable without the store or Steam\'s queue call, and reads null when a getter throws (Review Focus)', () => {
        expect(createDownloadsBindings(undefined, { Downloads: {} }).available()).toBe(false);
        expect(createDownloadsBindings({ LocalDownloadOverview: {} }, { Downloads: {} }).available()).toBe(false);
        const throwing = { get QueuedTransfers() { throw new Error('gone'); } };
        expect(createDownloadsBindings(throwing, { Downloads: { SetQueueIndex() {} } }).read()).toBeNull();
    });
    it('calls Steam\'s actions as its own page does, for the local client', () => {
        const { bindings, calls } = fakes();
        expect(bindings.downloadNow(5)).toBe(true);
        expect(bindings.moveUp(5, 3)).toBe(true);
        expect(bindings.remove(5)).toBe(true);
        expect(bindings.pauseAll()).toBe(true);
        expect(bindings.resume(5)).toBe(true);
        expect(calls).toEqual([['SetQueueIndex', 5, 0, '0'], ['ResumeAppUpdate', 5, '0'], ['SetQueueIndex', 5, 2, '0'], ['RemoveFromDownloadList', 5, '0'],
            ['EnableAllDownloads', false, '0'], ['ResumeAppUpdate', 5, '0']]);
    });
    it('answers false when a call is missing or throws', () => {
        const { bindings, downloads } = fakes();
        downloads.RemoveFromDownloadList.mockImplementation(() => { throw new Error('no'); });
        expect(bindings.remove(5)).toBe(false);
        expect(createDownloadsBindings({}, { Downloads: {} }).pauseAll()).toBe(false);
    });
});
