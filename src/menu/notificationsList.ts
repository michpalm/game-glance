import {isValidElement,type ReactNode} from 'react';
import type { NativeRequest } from './steam/runtime';

/** Steam's tray rows with plain metadata and optional supplied plugin presentation. `notificationId` marks an account
 * notification (read state kept by Steam); rows without one are local and their read state is ours. */
export interface TrayRow { id: string; kind: 'wishlist' | 'download' | 'plugin' | 'friend' | 'account' | 'other'; appId: number | null; count: number; time: number; unread: boolean; title?: ReactNode; body?: ReactNode;
    notificationId?: string | number; accountType?: number; accountBody?: Record<string, unknown>; steamId?: string; inviteUrl?: string; onClick?: () => unknown; onClickTarget?: object;
    /** Stable key for our read memory; absent when Steam gave the row no id. */
    readKey?: string }
export interface SaleInfo { name: string; price?: string }

type AnyRecord = Record<string, unknown> | undefined | null;
const record = (value: unknown): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null);
const safe = <T,>(read: () => T): T | undefined => { try { return read(); } catch { return undefined; } };
const parse = (text: unknown): AnyRecord => { try { return typeof text === 'string' ? record(JSON.parse(text)) : null; } catch { return null; } };

function notificationContent(value:unknown,depth=0):ReactNode|undefined {
    if(typeof value==='string')return value.trim()?value:undefined;
    if(typeof value==='number'&&Number.isFinite(value))return String(value);
    if(isValidElement(value))return value;
    if(Array.isArray(value)&&value.length>0&&value.length<=256&&depth<8&&value.every(item=>item==null||typeof item==='boolean'||notificationContent(item,depth+1)!==undefined))return value as ReactNode[];
    return undefined;
}
function nativeField(data:AnyRecord,key:'appid'|'dlc_appid'|'remote_client_name'|'steamid'|'response_steamurl'):unknown {
    try {const value=data?.[key];return typeof value==='function'?value.call(data):value;}catch{return undefined;}
}
const appIdOf=(value:unknown):number|null=>{const id=Number(value);return Number.isInteger(id)&&id>0&&id<=4294967295?id:null;};
function appNameFromSteam(appId:number):string {
    const root=globalThis as unknown as {appStore?:{GetAppOverviewByAppID?(id:number):{display_name?:string}|undefined}};
    return root.appStore?.GetAppOverviewByAppID?.(appId)?.display_name??'';
}
function safeName(appId:number|null,read:(id:number)=>string):string {
    try {const name=appId?read(appId):'';return typeof name==='string'?name.trim():'';}catch{return '';}
}

/** Steam rolls notifications up per kind; each group's first entry is what its own tab shows. */
export function readTray(tray: unknown, appName:(id:number)=>string=appNameFromSteam): TrayRow[] {
    if (!Array.isArray(tray)) return [];
    const rows: TrayRow[] = [];
    for (const group of tray) {
      try {
        const first = record(Array.isArray(record(group)?.notifications) ? (record(group)!.notifications as unknown[])[0] : null);
        if (!first) continue;
        const data = record(first.data);
        const type=Number(first.eType??record(group)?.eType);
        const time = Number(type===31?(first.rtCreated??data?.timestamp):(data?.timestamp??first.rtCreated));
        const item = record(data?.item);
        const rawId = item?.notification_id;
        const notificationId = typeof rawId === 'string' && rawId ? rawId : typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : undefined;
        // Account notifications are read through the account store; bNewIndicator only says Steam has not shown them yet.
        // Missing or unreadable read fields count as unread: our memory can still mark the row read, nothing is hidden by accident.
        const rgunread = safe(() => data?.rgunread), isNew = safe(() => first.bNewIndicator);
        const unread = notificationId === undefined ? isNew !== false || (Array.isArray(rgunread) && rgunread.length > 0)
            : Array.isArray(rgunread) ? rgunread.length > 0 : safe(() => item?.read) !== true;
        // A wishlist sale carries the game and how many wishlist games are on sale (the shape Steam's
        // own tab renders as "Wishlist Sale"); classify by that shape, not by an enum number.
        const body = parse(item?.body_data);
        const appId = Number(body?.appid), count = Number(body?.count);
        const wishlist = Number.isInteger(appId) && appId > 0 && Number.isInteger(count) && count > 0 && Array.isArray(body?.appids);
        const rawIdent=first.notificationID??first.nNotificationID;
        const id=String(rawIdent??rows.length);
        const readKey=rawIdent==null?{}:{readKey:`${type}:${notificationId??first.rtCreated??''}:${rawIdent}`};
        const base={id,appId:null,count:1,time:Number.isFinite(time)?time:0,unread,...readKey};
        const account=notificationId===undefined?{}:{notificationId};
        const downloadId=type===1?appIdOf(nativeField(data,'appid')):null;
        if(wishlist)rows.push({...base,kind:'wishlist',appId,count,...account});
        // Steam eType 1 uses CClientNotificationDownloadCompleted protobuf getters, not body_data JSON.
        else if(downloadId){
            const gameId=downloadId;
            const dlc=appIdOf(nativeField(data,'dlc_appid'));
            const name=safeName(dlc,appName)||safeName(gameId,appName);
            const remote=nativeField(data,'remote_client_name');
            rows.push({...base,kind:'download',appId:gameId,title:name||'Game download complete',body:typeof remote==='string'&&remote.trim()?`Ready to play on ${remote.trim()}`:'Ready to play'});
        }else if(type===31){
            // Keep supplied React translation elements intact; no component is invoked while reading the tray.
            const onClick=typeof data?.onClick==='function'?{onClick:data.onClick as ()=>unknown,onClickTarget:data as object}:{};
            rows.push({...base,id:`plugin:${id}`,kind:'plugin',title:notificationContent(data?.title)||'Plugin notification',body:notificationContent(data?.body),...onClick});
        }else if(notificationId!==undefined){
            const accountType=Number(item?.notification_type??data?.type);
            rows.push({...base,kind:'account',notificationId,accountType:Number.isFinite(accountType)?accountType:-1,accountBody:body??{}});
        }else{
            // Friend notifications are protobuf messages with a steamid() getter; classify by that shape, not by eType.
            const steamId=String(nativeField(data,'steamid')??'');
            const invite=nativeField(data,'response_steamurl');
            if(/^\d{17}$/.test(steamId)&&!appIdOf(nativeField(data,'appid')))rows.push({...base,kind:'friend',steamId,...(typeof invite==='string'&&invite.trim()?{inviteUrl:invite.trim()}:{})});
            else rows.push({...base,kind:'other'});
        }
      }catch{ /* A malformed entry must not discard every other notification. */ }
    }
    return rows;
}

export function rowTime(time: number, now = new Date()): string {
    if (!time) return '';
    const date = new Date(time * 1000);
    const today = date.toDateString() === now.toDateString();
    return today ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function rowText(row: TrayRow, sale: SaleInfo | null | undefined, now = new Date(), friendName?: (steamId: string) => string | undefined): { label: string; title: ReactNode; body?: ReactNode } {
    const when = rowTime(row.time, now);
    const labelled = (category: string) => when ? `${category} · ${when}` : category;
    if(row.kind==='download'||row.kind==='plugin'){
        return {label:labelled(row.kind==='download'?'Download complete':'Plugin'),title:row.title||(row.kind==='download'?'Game download complete':'Plugin notification'),body:row.body};
    }
    if (row.kind === 'friend') {
        let name: string | undefined;
        try { name = row.steamId ? friendName?.(row.steamId)?.trim() : undefined; } catch { name = undefined; }
        return { label: labelled('Friends'), title: name || (row.inviteUrl ? 'Game invite' : 'Friend notification'), ...(row.inviteUrl ? { body: 'Invited you to play' } : {}) };
    }
    if (row.kind === 'other' || row.kind === 'account') return { label: labelled('Steam'), title: 'Steam notification' };
    const label = labelled('Wishlist sale');
    if (row.count > 1) return { label, title: sale ? `${sale.name} and ${row.count - 1} other games are on sale` : `${row.count} games on your wishlist are on sale` };
    return { label, title: !sale ? 'A game on your wishlist is on sale' : sale.price ? `${sale.name} is on sale for ${sale.price}` : `${sale.name} is on sale` };
}

export const STEAM_NOTIFICATIONS: NativeRequest = { kind: 'qam', tab: 'notifications' };
export type RowRun = { kind: 'native'; request: NativeRequest } | { kind: 'plugin'; onClick: () => unknown; target?: object } | { kind: 'chat'; steamId: string } | { kind: 'mark' };
/** Steam's account link table lookup: the in-Steam URL for an account notification, or null. */
export type AccountLink = (type: number, body: Record<string, unknown>) => string | null;
/** What opening a row does, and its right-hand label (none when it only marks read). */
export function rowAction(row: TrayRow, link: AccountLink): { label?: string; run: RowRun } {
    const steam = { label: 'Open in Steam', run: { kind: 'native', request: STEAM_NOTIFICATIONS } as RowRun };
    switch (row.kind) {
        case 'download': return row.appId ? { label: 'View game', run: { kind: 'native', request: { kind: 'app', appId: row.appId } } } : steam;
        case 'plugin': return row.onClick ? { label: 'Open', run: { kind: 'plugin', onClick: row.onClick, target: row.onClickTarget } } : { run: { kind: 'mark' } };
        case 'wishlist': return !row.appId ? steam : row.count > 1 ? { label: 'View in store', run: { kind: 'native', request: { kind: 'store', target: 'wishlist' } } }
            : { label: 'View in store', run: { kind: 'native', request: { kind: 'store', target: 'app', appId: row.appId } } };
        case 'friend': return !row.steamId ? steam : row.inviteUrl ? { label: 'Join game', run: { kind: 'native', request: { kind: 'url', url: row.inviteUrl } } } : { label: 'Open chat', run: { kind: 'chat', steamId: row.steamId } };
        case 'account': {
            let url: string | null = null;
            try { url = row.accountType !== undefined ? link(row.accountType, row.accountBody ?? {}) : null; } catch { url = null; }
            return typeof url === 'string' && url ? { label: 'Open', run: { kind: 'native', request: { kind: 'url', url } } } : steam;
        }
        default: return steam;
    }
}

export const isLocalRow = (row: TrayRow) => row.notificationId === undefined;
/** Unread while Steam says so and we have not remembered the row read (account rows too, in case Steam's tray lags). */
export const rowUnread = (row: TrayRow, remembered: ReadonlySet<string>) => row.unread && !(row.readKey !== undefined && remembered.has(row.readKey));
/** The page-entry snapshot: rows already read when the page opens stay out for this visit. */
export const entryHidden = (rows: TrayRow[], remembered: ReadonlySet<string>): ReadonlySet<string> => new Set(rows.filter(row => !rowUnread(row, remembered)).map(row => row.id));
export const visibleRows = (rows: TrayRow[], hiddenAtEntry: ReadonlySet<string>) => rows.filter(row => !hiddenAtEntry.has(row.id));
export const READ_MEMORY_CAP = 200;
/** Newest last, no repeats, only the most recent `cap` ids. */
export function rememberIds(previous: readonly string[], ids: readonly string[], cap = READ_MEMORY_CAP): string[] {
    const added = new Set(ids);
    return [...previous.filter(id => !added.has(id)), ...added].slice(-cap);
}

/** Steam's store appdetails answer for one app: its name, and its price while discounted. */
export function parseSale(json: unknown, appId: number): SaleInfo | null {
    const entry = record(record(json)?.[String(appId)]);
    const data = record(entry?.data);
    if (entry?.success !== true || typeof data?.name !== 'string' || !data.name) return null;
    const overview = record(data.price_overview);
    const price = Number(overview?.discount_percent) > 0 && typeof overview?.final_formatted === 'string' && overview.final_formatted ? overview.final_formatted : undefined;
    return price ? { name: data.name, price } : { name: data.name };
}
