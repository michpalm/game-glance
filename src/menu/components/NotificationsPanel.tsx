import { Focusable } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import { LuArrowUpRight, LuBell, LuCheckCheck } from 'react-icons/lu';
import { rowText, type SaleInfo, type TrayRow } from '../notificationsList';
import type { NotificationReads } from '../notificationReads';
import { createNotificationVisit, type VisitDeps } from '../notificationVisit';
import { installNotificationScroll } from '../socialScroll';
import type { NotificationActions } from '../steam/notificationActions';
import type { createNotificationList } from '../steam/notifications';
import type { NativeRequest } from '../steam/runtime';
import { lookupSale } from '../steam/storeSale';
import { MenuAction } from './MenuAction';

const art = (appId: number) => `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
interface ContentsProps {
    rows: TrayRow[]; sales: Record<number, SaleInfo | null>;
    unread(row: TrayRow): boolean; action(row: TrayRow): { label?: string };
    open(row: TrayRow): void; markAll(): void; seeAll(): void;
    rootRef?: Ref<HTMLDivElement>;
}

/** Stateless presentation of this visit's rows: each opens what it is about; Mark all read clears every dot. */
export function NotificationsContents({ rows, sales, unread, action, open, markAll, seeAll, rootRef }: ContentsProps) {
    const anyUnread = rows.some(unread);
    return <div className="gg-notifications" ref={rootRef}>
        <div className="gg-menu-heading"><h2>Notifications</h2>
            {rows.length > 0 && <MenuAction id="notifications:mark-all" className={`gg-notifications-mark-all${anyUnread ? '' : ' gg-notifications-mark-all-dim'}`} onAction={markAll}><LuCheckCheck aria-hidden="true" />Mark all read</MenuAction>}</div>
        {rows.length ? <Focusable className="gg-notifications-list" flow-children="column">
            {rows.map(row => {
                const text = rowText(row, row.kind==='wishlist'&&row.appId ? sales[row.appId] : null), label = action(row).label;
                return <MenuAction key={row.id} id={`notification:${row.id}`} className={`gg-notification${unread(row) ? ' gg-notification-unread' : ''}`} onAction={() => open(row)}>
                    {row.appId ? <img className="gg-notification-art" src={art(row.appId)} alt="" /> : <span className="gg-notification-art"><LuBell aria-hidden="true" /></span>}
                    <span className="gg-notification-text"><small>{text.label}</small><strong>{text.title}</strong>{text.body!=null&&<span className="gg-notification-body">{text.body}</span>}</span>
                    {label && <span className="gg-notification-action">{label}</span>}
                </MenuAction>;
            })}
        </Focusable> : <div className="gg-notifications-empty">
            <strong>You're all caught up</strong>
            <p>Read notifications are still in Steam.</p>
            <MenuAction id="notifications:native" onAction={seeAll}><LuArrowUpRight aria-hidden="true" />See all in Steam</MenuAction>
        </div>}
    </div>;
}

const NO_SUBSCRIBE = () => () => {};
const NOTHING: ReadonlySet<string> = new Set();
const nothing = () => NOTHING;
interface PanelProps extends Omit<VisitDeps, 'reads' | 'actions'> {
    list: ReturnType<typeof createNotificationList>;
    reads?: NotificationReads;
    actions?: NotificationActions;
    handoff(request: NativeRequest): Promise<void> | void;
}
/** One mount is one visit: rows read on entry stay out until the page is opened again. */
export function NotificationsPanel({ list, reads, actions, handoff, close, openChat, failed }: PanelProps) {
    const all = useSyncExternalStore(list.subscribe, list.get);
    useSyncExternalStore(reads?.subscribe ?? NO_SUBSCRIBE, reads?.get ?? nothing);
    const deps = useRef<VisitDeps>({ reads, actions, handoff, close, openChat, failed });
    deps.current = { reads, actions, handoff, close, openChat, failed };
    const [visit] = useState(() => createNotificationVisit(() => deps.current));
    useSyncExternalStore(visit.subscribe, visit.version);
    const rows = visit.visible(all);
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const panel = root.current?.closest<HTMLElement>('.gg-menu-panel');
        return panel ? installNotificationScroll(panel) : undefined;
    }, []);
    const [sales, setSales] = useState<Record<number, SaleInfo | null>>({});
    useEffect(() => {
        let alive = true;
        for (const row of rows) {
            if (row.kind!=='wishlist' || !row.appId || row.appId in sales) continue;
            const appId = row.appId;
            void lookupSale(appId).then(sale => { if (alive) setSales(current => ({ ...current, [appId]: sale })); });
        }
        return () => { alive = false; };
    }, [all]);
    return <NotificationsContents rows={rows} sales={sales} unread={visit.unread} action={visit.action} open={visit.open} markAll={() => visit.markAll(all)} seeAll={visit.seeAll} rootRef={root} />;
}
