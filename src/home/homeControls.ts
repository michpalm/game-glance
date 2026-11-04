import type {GamepadEvent} from '@decky/ui';
export type HomeControlId='search'|'download'|'connection'|'battery'|'clock'|'profile'|`controller:${number}`|'controllers-more';
export interface HomeStatusControls {register(id:HomeControlId,node:HTMLElement|null):void;focused(id:HomeControlId):void;button(id:HomeControlId,event:GamepadEvent):void;buttonUp?(id:HomeControlId,event:GamepadEvent):void}
const rank=(id:HomeControlId)=>id==='search'?-1:id==='download'?0:id==='connection'?1:id.startsWith('controller:')?2+Number(id.split(':')[1]):id==='controllers-more'?100:id==='battery'?101:id==='clock'?102:103;
export const orderHomeControls=(ids:readonly HomeControlId[]):HomeControlId[]=>[...new Set(ids)].sort((a,b)=>rank(a)-rank(b));
export function nextHomeControl(current:HomeControlId,direction:'left'|'right',order:readonly HomeControlId[]):HomeControlId|null {
    if(!order.length)return null;const at=Math.max(0,order.indexOf(current));return order[Math.max(0,Math.min(order.length-1,at+(direction==='left'?-1:1)))];
}
export function repairHomeControl(current:HomeControlId,previous:readonly HomeControlId[],next:readonly HomeControlId[]):HomeControlId|null {
    return next.includes(current)?current:next[Math.min(Math.max(0,previous.indexOf(current)),next.length-1)]??null;
}
