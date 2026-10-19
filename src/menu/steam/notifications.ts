import type { Stop } from '../model';
interface BadgeBindings { getUnviewed():number; subscribe(listener:Stop):Stop }
export function createNotificationBadge<T extends BadgeBindings>(bindings:T) {
    const read=()=>{const value=bindings.getUnviewed();return Number.isFinite(value)?Math.max(0,Math.floor(value)):0;};
    let current=read(),disposed=false;const listeners=new Set<Stop>();
    const stop=bindings.subscribe(()=>{if(disposed)return;const next=read();if(next!==current){current=next;listeners.forEach(fn=>fn());}});
    return {get:()=>current,subscribe(listener:Stop):Stop{if(disposed)return()=>{};listeners.add(listener);return()=>{listeners.delete(listener);};},dispose(){if(disposed)return;disposed=true;listeners.clear();stop();}};
}
