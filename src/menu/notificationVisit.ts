import type { Stop } from './model';
import type { NotificationReads } from './notificationReads';
import { entryHidden, isLocalRow, rowAction, rowUnread, STEAM_NOTIFICATIONS, visibleRows, type TrayRow } from './notificationsList';
import type { NotificationActions } from './steam/notificationActions';
import type { NativeRequest } from './steam/runtime';

export interface VisitDeps {
    reads?: Pick<NotificationReads, 'get' | 'ready' | 'remember'>;
    actions?: NotificationActions;
    handoff(request: NativeRequest): Promise<void> | void;
    close(): void;
    /** Our own Social chat with this friend; false when Social cannot open it. */
    openChat(steamId: string): boolean;
    failed?(): void;
}
const NOTHING: ReadonlySet<string> = new Set();
const NO_LINK = () => null;

/** One visit to the Notifications page: the entry snapshot, rows marked during the visit, and what opening a row does. */
export function createNotificationVisit(deps: () => VisitDeps) {
    let hidden: ReadonlySet<string> | null = null, marked: ReadonlySet<string> = NOTHING, version = 0;
    const listeners = new Set<Stop>();
    const remembered = () => deps().reads?.get() ?? NOTHING;
    const mark = (ids: string[]) => { marked = new Set([...marked, ...ids]); version++; listeners.forEach(fn => fn()); };
    const unread = (row: TrayRow) => !marked.has(row.id) && rowUnread(row, remembered());
    const attempt = (request: NativeRequest) => { try { return Promise.resolve(deps().handoff(request)); } catch (error) { return Promise.reject(error); } };
    const go = (request: NativeRequest) => {
        const fail = () => deps().failed?.();
        void attempt(request).catch(() => request === STEAM_NOTIFICATIONS ? fail() : attempt(STEAM_NOTIFICATIONS).catch(fail));
    };
    function markRead(row: TrayRow) {
        mark([row.id]);
        const { reads, actions } = deps();
        try {
            if (isLocalRow(row)) void reads?.remember([row.id]);
            else actions?.markRead(row.notificationId!);
        } catch (error) { console.warn('[Game Glance] notification read-mark failed', error); }
    }
    return {
        subscribe(listener: Stop): Stop { listeners.add(listener); return () => { listeners.delete(listener); }; },
        version: () => version,
        visible(rows: TrayRow[]): TrayRow[] {
            if (!hidden && (deps().reads?.ready() ?? true)) hidden = entryHidden(rows, remembered());
            return visibleRows(rows, hidden ?? entryHidden(rows, remembered()));
        },
        unread,
        anyUnread: (rows: TrayRow[]) => rows.some(unread),
        action: (row: TrayRow) => rowAction(row, deps().actions?.link ?? NO_LINK),
        open(row: TrayRow) {
            const { run } = rowAction(row, deps().actions?.link ?? NO_LINK);
            markRead(row);
            if (run.kind === 'native') go(run.request);
            else if (run.kind === 'chat') { let opened = false; try { opened = deps().openChat(run.steamId); } catch { opened = false; } if (!opened) go(STEAM_NOTIFICATIONS); }
            else if (run.kind === 'plugin') {
                // As Steam does: data.onClick(), a method call on the plugin's notification data.
                try { deps().close(); run.onClick.call(run.target); } catch (error) { console.warn('[Game Glance] plugin notification action failed', error); go(STEAM_NOTIFICATIONS); }
            }
        },
        markAll(rows: TrayRow[]) {
            if (!rows.some(unread)) return;
            const { reads, actions } = deps();
            try { actions?.markAllRead(); } catch (error) { console.warn('[Game Glance] mark all read failed', error); }
            void reads?.remember(rows.filter(isLocalRow).map(row => row.id));
            mark(rows.map(row => row.id));
        },
        seeAll: () => go(STEAM_NOTIFICATIONS),
    };
}
export type NotificationVisit = ReturnType<typeof createNotificationVisit>;
