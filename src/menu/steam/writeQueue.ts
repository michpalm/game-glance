/** Cancelling unsent work does not imply an already-issued native write was undone. */
export class WriteCancelledError extends Error {
    constructor(readonly reason: 'superseded' | 'context changed' | 'disposed') { super(`Setting request ${reason}`); }
}
interface Queued<T> { value: T; key: string; due: number; resolve(): void; reject(error: unknown): void }
export function createWriteQueue<T>(options: { write(value: T, contextKey: string): Promise<void>; contextKey(): string; coalesceMs?: number; liveIntervalMs?: number }) {
    let queued: Queued<T> | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    let nextLiveWrite = 0;
    let active = false, disposed = false;
    let blocked: Error | undefined;
    function cancel(reason: WriteCancelledError['reason'] | Error) {
        const item = queued; queued = undefined;
        if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
        item?.reject(reason instanceof Error ? reason : new WriteCancelledError(reason));
    }
    function pump() {
        if (disposed || blocked || active || !queued) return;
        if (queued.key !== options.contextKey()) { cancel('context changed'); return; }
        const delay = Math.max(queued.due, nextLiveWrite) - Date.now();
        if (delay > 0) { timer = setTimeout(() => { timer = undefined; pump(); }, delay); return; }
        const command = queued; queued = undefined; active = true;
        void Promise.resolve().then(() => {
            if (disposed) throw new WriteCancelledError('disposed');
            if (command.key !== options.contextKey()) throw new WriteCancelledError('context changed');
            if (options.liveIntervalMs !== undefined) nextLiveWrite = Date.now() + options.liveIntervalMs;
            return options.write(command.value, command.key);
        }).then(command.resolve, command.reject).finally(() => { active = false; blocked = undefined; pump(); });
    }
    return {
        enqueue(value: T, key = options.contextKey()): Promise<void> {
            if (disposed) return Promise.reject(new WriteCancelledError('disposed'));
            if (blocked) return Promise.reject(blocked);
            cancel('superseded');
            const pending = new Promise<void>((resolve, reject) => {
                // Live sliders keep a fixed deadline as new values replace the queued write.
                const due = options.liveIntervalMs === undefined
                    ? Date.now() + Math.max(0, options.coalesceMs ?? 0)
                    : nextLiveWrite;
                queued = { value, key, due, resolve, reject };
            });
            pump(); return pending;
        },
        blockPending(error: Error) { if (active) { blocked = error; cancel(error); } },
        contextChanged() { if (queued && queued.key !== options.contextKey()) cancel('context changed'); },
        dispose() { if (disposed) return; disposed = true; cancel('disposed'); },
    };
}
