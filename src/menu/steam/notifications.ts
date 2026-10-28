import type { Stop } from '../model';
import { readTray } from '../notificationsList';
interface BadgeBindings { getUnviewed():number; subscribe(listener:Stop):Stop }
export function createNotificationBadge<T extends BadgeBindings>(bindings:T) {
    const read=()=>{const value=bindings.getUnviewed();return Number.isFinite(value)?Math.max(0,Math.floor(value)):0;};
    let current=read(),disposed=false;const listeners=new Set<Stop>();
    const stop=bindings.subscribe(()=>{if(disposed)return;const next=read();if(next!==current){current=next;listeners.forEach(fn=>fn());}});
    return {get:()=>current,subscribe(listener:Stop):Stop{if(disposed)return()=>{};listeners.add(listener);return()=>{listeners.delete(listener);};},dispose(){if(disposed)return;disposed=true;listeners.clear();stop();}};
}

interface TrayBindings { getTray():unknown; subscribe(listener:Stop):Stop }
/** Steam's tray as menu rows; listeners hear only real changes, not every tray callback. */
export function createNotificationList(bindings:TrayBindings) {
    const read=()=>{try{return readTray(bindings.getTray());}catch{return [];}};
    let current=read(),key=JSON.stringify(current),disposed=false;const listeners=new Set<Stop>();
    const stop=bindings.subscribe(()=>{if(disposed)return;const next=read(),nextKey=JSON.stringify(next);if(nextKey!==key){current=next;key=nextKey;listeners.forEach(fn=>fn());}});
    return {get:()=>current,subscribe(listener:Stop):Stop{if(disposed)return()=>{};listeners.add(listener);return()=>{listeners.delete(listener);};},dispose(){if(disposed)return;disposed=true;listeners.clear();stop();}};
}
