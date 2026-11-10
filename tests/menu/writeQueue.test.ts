import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWriteQueue } from '../../src/menu/steam/writeQueue';
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
afterEach(() => vi.useRealTimers());
describe('native setting write queue', () => {
    it('writes during continuous slider movement and flushes the latest value', async () => {
        vi.useFakeTimers();
        try {
            const write = vi.fn(async (_value: number) => {});
            const q = createWriteQueue({ write, contextKey: () => 'display:A', liveIntervalMs: 50 });
            const push = (value: number) => { void q.enqueue(value).catch(() => {}); };
            push(10);
            await vi.advanceTimersByTimeAsync(0);
            expect(write.mock.calls.map(([value]) => value)).toEqual([10]);
            for (const value of [20, 30, 40, 50, 60, 70]) {
                await vi.advanceTimersByTimeAsync(10);
                push(value);
            }
            expect(write.mock.calls.map(([value]) => value)).toEqual([10, 50]);
            await vi.advanceTimersByTimeAsync(40);
            expect(write.mock.calls.map(([value]) => value)).toEqual([10, 50, 70]);
            q.dispose();
        } finally { vi.useRealTimers(); }
    });
    it('coalesces unsent slider values and serializes issued writes', async () => {
        vi.useFakeTimers(); let finish!: () => void;
        const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
        const q = createWriteQueue({ write, contextKey: () => 'display:A', coalesceMs: 50 });
        const first = q.enqueue(60).catch(error => error.message);
        const second = q.enqueue(61).catch(error => error.message);
        const latest = q.enqueue(62);
        await vi.advanceTimersByTimeAsync(50); expect(write).toHaveBeenCalledTimes(1); expect(write).toHaveBeenLastCalledWith(62, 'display:A');
        expect(await first).toContain('superseded'); expect(await second).toContain('superseded');
        const next = q.enqueue(63); await vi.advanceTimersByTimeAsync(100); expect(write).toHaveBeenCalledTimes(1);
        finish(); await latest; await tick(); expect(write).toHaveBeenCalledTimes(2);
        finish(); await next; q.dispose();
    });
    it('drops queued values across a changed context while observing the issued promise', async () => {
        let key = 'audio:A', finish!: () => void;
        const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
        const q = createWriteQueue({ write, contextKey: () => key });
        const first = q.enqueue(40); await tick(); const queued = q.enqueue(41).catch(error => error.message);
        key = 'audio:B'; q.contextChanged(); expect(await queued).toContain('context');
        finish(); await first; await tick(); expect(write).not.toHaveBeenCalledWith(41, 'audio:B'); expect(write).toHaveBeenCalledTimes(1); q.dispose();
    });
    it('does not issue an immediate command if disposed before its send microtask', async () => {
        const write = vi.fn(async () => {}), q = createWriteQueue({ write, contextKey: () => 'A' });
        const pending = q.enqueue(60).catch(error => error.message); q.dispose(); await tick();
        expect(write).not.toHaveBeenCalled(); expect(await pending).toContain('disposed');
    });
    it('disposal cancels unsent work and never restores the original value', async () => {
        vi.useFakeTimers(); const write = vi.fn(async () => {});
        const q = createWriteQueue({ write, contextKey: () => 'global', coalesceMs: 50 });
        const pending = q.enqueue(60).catch(error => error.message); q.dispose();
        expect(await pending).toContain('disposed'); await vi.advanceTimersByTimeAsync(100); expect(write).not.toHaveBeenCalled();
    });
});
