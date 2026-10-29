import {isValidElement,type ReactNode} from 'react';

/** Steam's tray rows with plain metadata and optional supplied plugin presentation. */
export interface TrayRow { id: string; kind: 'wishlist' | 'download' | 'plugin' | 'other'; appId: number | null; count: number; time: number; unread: boolean; title?: ReactNode; body?: ReactNode }
export interface SaleInfo { name: string; price?: string }

type AnyRecord = Record<string, unknown> | undefined | null;
const record = (value: unknown): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null);
const parse = (text: unknown): AnyRecord => { try { return typeof text === 'string' ? record(JSON.parse(text)) : null; } catch { return null; } };

function notificationContent(value:unknown,depth=0):ReactNode|undefined {
    if(typeof value==='string')return value.trim()?value:undefined;
    if(typeof value==='number'&&Number.isFinite(value))return String(value);
    if(isValidElement(value))return value;
    if(Array.isArray(value)&&value.length>0&&value.length<=256&&depth<8&&value.every(item=>item==null||typeof item==='boolean'||notificationContent(item,depth+1)!==undefined))return value as ReactNode[];
    return undefined;
}
function nativeField(data:AnyRecord,key:'appid'|'dlc_appid'|'remote_client_name'):unknown {
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
        const unread = first.bNewIndicator === true || (Array.isArray(data?.rgunread) && data!.rgunread.length > 0);
        // A wishlist sale carries the game and how many wishlist games are on sale (the shape Steam's
        // own tab renders as "Wishlist Sale"); classify by that shape, not by an enum number.
        const body = parse(record(data?.item)?.body_data);
        const appId = Number(body?.appid), count = Number(body?.count);
        const wishlist = Number.isInteger(appId) && appId > 0 && Number.isInteger(count) && count > 0 && Array.isArray(body?.appids);
        const id=String(first.notificationID??first.nNotificationID??rows.length);
        const base={id,appId:null,count:1,time:Number.isFinite(time)?time:0,unread};
        const downloadId=type===1?appIdOf(nativeField(data,'appid')):null;
        if(wishlist)rows.push({...base,kind:'wishlist',appId,count});
        // Steam eType 1 uses CClientNotificationDownloadCompleted protobuf getters, not body_data JSON.
        else if(downloadId){
            const gameId=downloadId;
            const dlc=appIdOf(nativeField(data,'dlc_appid'));
            const name=safeName(dlc,appName)||safeName(gameId,appName);
            const remote=nativeField(data,'remote_client_name');
            rows.push({...base,kind:'download',appId:gameId,title:name||'Game download complete',body:typeof remote==='string'&&remote.trim()?`Ready to play on ${remote.trim()}`:'Ready to play'});
        }else if(type===31){
            // Keep supplied React translation elements intact; no component is invoked while reading the tray.
            rows.push({...base,id:`plugin:${id}`,kind:'plugin',title:notificationContent(data?.title)||'Plugin notification',body:notificationContent(data?.body)});
        }else rows.push({...base,kind:'other'});
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

export function rowText(row: TrayRow, sale: SaleInfo | null | undefined, now = new Date()): { label: string; title: ReactNode; action: string; body?: ReactNode } {
    const when = rowTime(row.time, now);
    if(row.kind==='download'||row.kind==='plugin'){
        const category=row.kind==='download'?'Download complete':'Plugin';
        return {label:when?`${category} · ${when}`:category,title:row.title||(row.kind==='download'?'Game download complete':'Plugin notification'),body:row.body,action:'Open in Steam'};
    }
    if (row.kind === 'other') return { label: when ? `Steam · ${when}` : 'Steam', title: 'Steam notification', action: 'Open in Steam' };
    const label = when ? `Wishlist sale · ${when}` : 'Wishlist sale';
    if (row.count > 1) return { label, action: `See all ${row.count}`, title: sale ? `${sale.name} and ${row.count - 1} other games are on sale` : `${row.count} games on your wishlist are on sale` };
    return { label, action: 'View in store', title: !sale ? 'A game on your wishlist is on sale' : sale.price ? `${sale.name} is on sale for ${sale.price}` : `${sale.name} is on sale` };
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
