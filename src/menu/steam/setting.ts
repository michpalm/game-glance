import type { Stop } from '../model';
import { createWriteQueue, WriteCancelledError } from './writeQueue';
export type SettingScope = { kind: 'global' } | { kind: 'game'; gameId: string } | { kind: 'unknown' };
export interface SettingSnapshot<T> {
    available: boolean; value: T | null; pending: boolean; scope: SettingScope; error: string | null;
    min?: number; max?: number; step?: number; options?: readonly T[]; disabled?: boolean; reason?: string;
}
export interface SettingAdapter<T> {
    get(): SettingSnapshot<T>; subscribe(listener: Stop): Stop; set(value: T): Promise<void>; dispose(): void;
}
type NativeSnapshot<T> = Omit<SettingSnapshot<T>, 'pending' | 'error'>;
interface Receipt<T> {
    id: number; key: string; epoch: number; value: T; issued: boolean; writeDone: boolean; observed: boolean; revision: number;
    timer?: ReturnType<typeof setTimeout>; resolve(): void; reject(error: Error): void;
}
interface Options<T> {
    read(): NativeSnapshot<T>; subscribe(listener: Stop): Stop; write(value: T, contextKey: string): Promise<void>;
    contextKey(): string; validate(value: T, snapshot: SettingSnapshot<T>): T | null; coalesceMs?: number; timeoutMs?: number;
}
export function createSettingAdapter<T>(options: Options<T>): SettingAdapter<T> {
    let key = options.contextKey(), epoch = 0, revision = 0, latest = 0, disposed = false;
    let error: string | null = null;
    let late: { id: number; key: string; value: T } | undefined;
    let native: NativeSnapshot<T>;
    let snapshot: SettingSnapshot<T>;
    let stopNative: Stop | undefined;
    const listeners = new Set<Stop>(), receipts = new Map<number, Receipt<T>>();
    const message = (value: unknown) => value instanceof Error ? value.message : 'Steam could not apply this change';
    function read() {
        try { native = options.read(); }
        catch (value) { native = { available: false, value: null, scope: { kind: 'unknown' } }; error = message(value); }
    }
    function publish() {
        snapshot = Object.freeze({ ...native, scope: Object.freeze({ ...native.scope }), ...(native.options ? { options: Object.freeze([...native.options]) } : {}), pending: receipts.get(latest)?.key === key && receipts.get(latest)?.epoch === epoch, error });
        listeners.forEach(listener => listener());
    }
    function releaseWhenSettled() {
        if (!disposed || receipts.size || !stopNative) return;
        const stop = stopNative; stopNative = undefined;
        try { stop(); } catch (value) { console.warn('[Game Glance] setting subscription cleanup failed', value); }
    }
    function settle(receipt: Receipt<T>, failure?: Error, showError = true) {
        if (!receipts.delete(receipt.id)) return;
        if (receipt.timer !== undefined) clearTimeout(receipt.timer);
        if (receipt.id === latest && receipt.key === key && receipt.epoch === epoch) error = failure && showError ? failure.message : null;
        publish();
        if (failure) receipt.reject(failure); else receipt.resolve();
        releaseWhenSettled();
    }
    function matches(value: T): boolean {
        return native.available && Object.is(native.value, options.validate(value, snapshot));
    }
    function refresh() {
        const next = options.contextKey();
        if (next !== key) {
            key = next; epoch++; error = null; late = undefined; read(); revision++; queue.contextChanged();
            for (const receipt of [...receipts.values()]) settle(receipt, new WriteCancelledError('context changed'), false);
        } else { read(); revision++; }
        publish();
        if (late && late.id === latest && late.key === key && matches(late.value)) { late = undefined; error = null; publish(); }
        for (const receipt of [...receipts.values()]) {
            if (!receipt.issued || receipt.key !== key || receipt.epoch !== epoch || revision <= receipt.revision) continue;
            if (matches(receipt.value)) receipt.observed = true;
            if (receipt.writeDone && receipt.observed) settle(receipt);
        }
    }
    read(); publish();
    const queue = createWriteQueue<Receipt<T>>({
        contextKey: options.contextKey, coalesceMs: options.coalesceMs,
        async write(receipt, capturedKey) {
            if (!receipts.has(receipt.id) || receipt.epoch !== epoch || capturedKey !== options.contextKey()) throw new WriteCancelledError('context changed');
            const value = options.validate(receipt.value, snapshot);
            if (!snapshot.available || value === null) throw new Error('This control is unavailable');
            receipt.value = value; receipt.issued = true; receipt.revision = revision;
            receipt.timer = setTimeout(() => {
                if (receipt.id === latest && receipt.key === key && receipt.epoch === epoch) late = { id: receipt.id, key: receipt.key, value: receipt.value };
                if (!receipt.writeDone) queue.blockPending(new Error('Steam did not finish the previous change. Try again.'));
                settle(receipt, new Error('Change not confirmed by Steam. It may still apply.'));
            }, options.timeoutMs ?? 3000);
            await options.write(value, capturedKey);
            receipt.writeDone = true;
            // Re-read current native state, never copy a command's value into the snapshot.
            refresh();
        },
    });
    stopNative = options.subscribe(refresh);
    return {
        get: () => snapshot,
        subscribe(listener) { if (disposed) return () => {}; listeners.add(listener); return () => { listeners.delete(listener); }; },
        set(requested) {
            if (disposed) return Promise.reject(new WriteCancelledError('disposed'));
            refresh();
            const value = options.validate(requested, snapshot);
            if (!snapshot.available || value === null) { error = 'This control is unavailable'; publish(); return Promise.reject(new Error(error)); }
            const id = ++latest; error = null; late = undefined;
            const pending = new Promise<void>((resolve, reject) => {
                const receipt: Receipt<T> = { id, key, epoch, value, issued: false, writeDone: false, observed: false, revision, resolve, reject };
                receipts.set(id, receipt);
                void queue.enqueue(receipt, key).catch(failure => settle(receipt, failure instanceof Error ? failure : new Error(message(failure)), !(failure instanceof WriteCancelledError)));
            });
            publish(); return pending;
        },
        dispose() {
            if (disposed) return;
            disposed = true; listeners.clear();
            for (const receipt of [...receipts.values()]) if (!receipt.issued) settle(receipt, new WriteCancelledError('disposed'), false);
            queue.dispose(); releaseWhenSettled();
        },
    };
}
