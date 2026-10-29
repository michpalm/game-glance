import type { KvBackend } from '../data/kv';
import type { Stop } from './model';
import { rememberIds } from './notificationsList';

const KEY = 'menu:notifications-read';

/** Local notifications (downloads, plugins) have no account read state: their read ids live in the menu preferences. */
export function createNotificationReads(kv: Pick<KvBackend, 'get' | 'set'>) {
    let ids: string[] = [], set: ReadonlySet<string> = new Set(), loaded = false, loading: Promise<void> | undefined;
    const listeners = new Set<Stop>();
    const update = (next: string[]) => { ids = next; set = new Set(next); listeners.forEach(fn => fn()); };
    return {
        ready: () => loaded,
        get: () => set,
        subscribe(listener: Stop): Stop { listeners.add(listener); return () => { listeners.delete(listener); }; },
        load(): Promise<void> {
            loading ??= (async () => {
                let stored: unknown = null;
                try { stored = await kv.get(KEY); } catch { /* nothing remembered */ }
                const valid = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
                loaded = true;
                update(rememberIds(valid, ids));
            })();
            return loading;
        },
        /** Never rejects: ids that could not be saved stay read for this session. */
        async remember(next: readonly string[]): Promise<void> {
            if (next.every(id => set.has(id))) return;
            update(rememberIds(ids, next));
            // Saving before the stored ids arrive would overwrite them; load merges what was remembered meanwhile.
            if (loading && !loaded) await loading;
            try { await kv.set(KEY, ids); } catch { /* not saved */ }
        },
    };
}
export type NotificationReads = ReturnType<typeof createNotificationReads>;
