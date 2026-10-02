import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startAutoPreload } from '../../src/data/autoPreload';

describe('startAutoPreload', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('runs a minute after the plugin starts, then every 30 minutes', async () => {
        const run = vi.fn(async () => undefined);
        const stop = startAutoPreload({ run, isEnabled: () => true });
        await vi.advanceTimersByTimeAsync(59_000);
        expect(run).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_000);
        expect(run).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(30 * 60_000);
        expect(run).toHaveBeenCalledTimes(2);
        stop();
    });
    it('skips runs while the setting is off, and resumes when it is turned back on', async () => {
        let enabled = false;
        const run = vi.fn(async () => undefined);
        const stop = startAutoPreload({ run, isEnabled: () => enabled });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(run).not.toHaveBeenCalled();
        enabled = true;
        await vi.advanceTimersByTimeAsync(30 * 60_000);
        expect(run).toHaveBeenCalledTimes(1);
        stop();
    });
    it('stops when the plugin unloads', async () => {
        const run = vi.fn(async () => undefined);
        startAutoPreload({ run, isEnabled: () => true })();
        await vi.advanceTimersByTimeAsync(2 * 60 * 60_000);
        expect(run).not.toHaveBeenCalled();
    });
    it('keeps its schedule when a run fails', async () => {
        const run = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
        const stop = startAutoPreload({ run, isEnabled: () => true });
        await vi.advanceTimersByTimeAsync(60_000 + 30 * 60_000);
        expect(run).toHaveBeenCalledTimes(2);
        stop();
    });
});
