import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSettingAdapter, type SettingSnapshot } from '../../src/menu/steam/setting';
type Native = Omit<SettingSnapshot<number>, 'pending' | 'error'>;
function harness(coalesceMs = 0) {
    let key = 'display:A', native: Native = { available: true, value: 23, min: 0, max: 120, scope: { kind: 'global' } };
    let signal!: () => void; const unsubscribe = vi.fn(); const write = vi.fn(async (_value: number, _key: string) => {});
    const adapter = createSettingAdapter<number>({ read: () => native, subscribe: fn => { signal = fn; return unsubscribe; }, write, contextKey: () => key,
        validate: (value, snapshot) => snapshot.available && Number.isFinite(value) ? Math.min(snapshot.max ?? value, Math.max(snapshot.min ?? value, value)) : null, coalesceMs });
    return { adapter, write, unsubscribe, update(value: number, rest: Partial<Native> = {}) { native = { ...native, value, ...rest }; signal(); },
        context(next: string, value: number) { key = next; native = { ...native, value }; signal(); } };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
afterEach(() => vi.useRealTimers());
describe('authoritative setting adapter', () => {
    it('waits for native readback, including updated native clamping bounds', async () => {
        const h = harness(); const pending = h.adapter.set(62); await tick();
        expect(h.write).toHaveBeenCalledWith(62, 'display:A'); expect(h.adapter.get()).toMatchObject({ value: 23, pending: true });
        h.update(60, { max: 60 }); await pending; expect(h.adapter.get()).toMatchObject({ value: 60, pending: false, error: null });
        expect(Object.isFrozen(h.adapter.get())).toBe(true); expect(Object.isFrozen(h.adapter.get().scope)).toBe(true); h.adapter.dispose();
    });
    it('does not treat an unrelated native update or RPC completion as confirmation', async () => {
        const h = harness(); const result = h.adapter.set(62); await tick(); h.update(50);
        expect(h.adapter.get()).toMatchObject({ value: 50, pending: true }); h.update(62); await result; h.adapter.dispose();
    });
    it('rejects unavailable controls without issuing a write', async () => {
        const h = harness(); h.update(23, { available: false }); await expect(h.adapter.set(60)).rejects.toThrow();
        expect(h.write).not.toHaveBeenCalled(); expect(h.adapter.get().pending).toBe(false); h.adapter.dispose();
    });
    it('surfaces rejection while retaining the authoritative value', async () => {
        const h = harness(); h.write.mockRejectedValue(Error('permission denied')); await expect(h.adapter.set(60)).rejects.toThrow('permission denied');
        expect(h.adapter.get()).toMatchObject({ value: 23, pending: false, error: 'permission denied' }); h.adapter.dispose();
    });
    it('times out as unconfirmed, then accepts late native updates without restoring old state', async () => {
        vi.useFakeTimers(); const h = harness(); const pending = h.adapter.set(60).catch(error => error.message); await tick();
        await vi.advanceTimersByTimeAsync(3000); expect(await pending).toContain('not confirmed');
        expect(h.adapter.get()).toMatchObject({ value: 23, pending: false }); expect(h.adapter.get().error).toContain('not confirmed');
        h.update(60); expect(h.adapter.get()).toMatchObject({ value: 60, pending: false, error: null });
        h.update(71); h.adapter.dispose(); expect(h.write).not.toHaveBeenCalledWith(23, 'display:A'); expect(h.write).toHaveBeenCalledTimes(1);
    });
    it('coalesces 60→61→62 without showing optimistic values', async () => {
        vi.useFakeTimers(); const h = harness(50);
        const a = h.adapter.set(60).catch(() => {}), b = h.adapter.set(61).catch(() => {}), c = h.adapter.set(62);
        expect(h.adapter.get().value).toBe(23); await vi.advanceTimersByTimeAsync(50);
        expect(h.write).toHaveBeenCalledTimes(1); expect(h.write).toHaveBeenCalledWith(62, 'display:A');
        h.update(62); await Promise.all([a,b,c]); expect(h.adapter.get().pending).toBe(false); h.adapter.dispose();
    });
    it('stale completion cannot replace the new context or send old queued intent there', async () => {
        const h = harness(); let finish!: () => void; h.write.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
        const first = h.adapter.set(60).catch(() => {}); await tick(); const oldQueuedValue = 61;
        const next = h.adapter.set(oldQueuedValue).catch(() => {}); h.context('display:B', 88);
        finish(); await Promise.all([first,next]); await tick(); expect(h.adapter.get().value).toBe(88);
        expect(h.write).not.toHaveBeenCalledWith(oldQueuedValue, 'display:B'); expect(h.write).toHaveBeenCalledTimes(1); h.adapter.dispose();
    });
    it('never emits an old-context value while cancelling old receipts', async () => {
        const h = harness(); let finish!: () => void;
        h.write.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
        const pending = h.adapter.set(60).catch(() => {}); await tick();
        const values: (number | null)[] = []; h.adapter.subscribe(() => values.push(h.adapter.get().value));
        h.context('display:B', 88); expect(values.every(value => value === 88)).toBe(true);
        finish(); await pending; h.adapter.dispose();
    });
    it('clears queued pending state when the earlier native RPC hangs, without overlapping sends', async () => {
        vi.useFakeTimers(); const h = harness(); h.write.mockImplementation(() => new Promise(() => {}));
        const first = h.adapter.set(60).catch(() => {}); await tick();
        const queued = h.adapter.set(61).catch(() => {});
        await vi.advanceTimersByTimeAsync(3000); await first;
        expect(h.adapter.get().pending).toBe(false); await queued;
        await expect(h.adapter.set(62)).rejects.toThrow('previous change');
        expect(h.write).toHaveBeenCalledTimes(1); h.adapter.dispose(); expect(h.unsubscribe).toHaveBeenCalledTimes(1);
    });
    it('does not overwrite a later native change when an older RPC completes', async () => {
        const h = harness(); let finish!: () => void;
        h.write.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
        const pending = h.adapter.set(60); await tick(); h.update(60);
        expect(h.adapter.get().pending).toBe(true); h.update(71); finish(); await pending;
        expect(h.adapter.get()).toMatchObject({ value: 71, pending: false }); h.adapter.dispose();
    });
    it('keeps an issued write observed after disposal until native acknowledgement', async () => {
        const h = harness(); const pending = h.adapter.set(60); await tick(); h.adapter.dispose(); h.adapter.dispose();
        expect(h.unsubscribe).not.toHaveBeenCalled(); h.update(60); await pending; expect(h.unsubscribe).toHaveBeenCalledTimes(1);
        expect(h.write).not.toHaveBeenCalledWith(23, 'display:A'); await expect(h.adapter.set(61)).rejects.toThrow('disposed');
    });
    it('releases a disposed listener on timeout, even when the native RPC never settles', async () => {
        vi.useFakeTimers(); const h = harness(); h.write.mockImplementation(() => new Promise(() => {}));
        const pending = h.adapter.set(60).catch(() => {}); await tick(); h.adapter.dispose(); await vi.advanceTimersByTimeAsync(3000); await pending;
        expect(h.unsubscribe).toHaveBeenCalledTimes(1);
    });
});
