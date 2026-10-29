import { Focusable } from '@decky/ui';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LuArrowUpRight, LuBell } from 'react-icons/lu';
import { rowText, type SaleInfo, type TrayRow } from '../notificationsList';
import type { createNotificationList } from '../steam/notifications';
import type { NativeRequest } from '../steam/runtime';
import { lookupSale } from '../steam/storeSale';
import { MenuAction } from './MenuAction';

const art = (appId: number) => `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
const destination = (row: TrayRow): NativeRequest => row.kind !== 'wishlist' || !row.appId ? { kind: 'qam', tab: 'notifications' }
    : row.count > 1 ? { kind: 'store', target: 'wishlist' } : { kind: 'store', target: 'app', appId: row.appId };

/** Stateless presentation of Steam's tray: one row per notification, each opening what it is about. */
export function NotificationsContents({ rows, sales, handoff }: { rows: TrayRow[]; sales: Record<number, SaleInfo | null>; handoff(request: NativeRequest): void }) {
    return <div className="gg-notifications">
        <div className="gg-menu-heading"><h2>Notifications</h2>
            <MenuAction id="notifications:native" onAction={() => handoff({ kind: 'qam', tab: 'notifications' })}><LuArrowUpRight aria-hidden="true" />Steam</MenuAction></div>
        <Focusable className="gg-notifications-list" flow-children="column">
            {rows.map(row => {
                const text = rowText(row, row.kind==='wishlist'&&row.appId ? sales[row.appId] : null);
                return <MenuAction key={row.id} id={`notification:${row.id}`} className={`gg-notification${row.unread ? ' gg-notification-unread' : ''}`} onAction={() => handoff(destination(row))}>
                    {row.appId ? <img className="gg-notification-art" src={art(row.appId)} alt="" /> : <span className="gg-notification-art"><LuBell aria-hidden="true" /></span>}
                    <span className="gg-notification-text"><small>{text.label}</small><strong>{text.title}</strong>{text.body!=null&&<span className="gg-notification-body">{text.body}</span>}</span>
                    <span className="gg-notification-action">{text.action}</span>
                </MenuAction>;
            })}
            {!rows.length && <p className="gg-notifications-empty">No notifications</p>}
        </Focusable>
    </div>;
}

export function NotificationsPanel({ list, handoff }: { list: ReturnType<typeof createNotificationList>; handoff(request: NativeRequest): void }) {
    const rows = useSyncExternalStore(list.subscribe, list.get);
    const [sales, setSales] = useState<Record<number, SaleInfo | null>>({});
    useEffect(() => {
        let alive = true;
        for (const row of rows) {
            if (row.kind!=='wishlist' || !row.appId || row.appId in sales) continue;
            const appId = row.appId;
            void lookupSale(appId).then(sale => { if (alive) setSales(current => ({ ...current, [appId]: sale })); });
        }
        return () => { alive = false; };
    }, [rows]);
    return <NotificationsContents rows={rows} sales={sales} handoff={handoff} />;
}
