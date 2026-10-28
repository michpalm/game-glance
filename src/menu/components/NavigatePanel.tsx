import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import { LuArrowUpRight, LuHouse, LuLibrary, LuShoppingBag, LuDownload, LuSettings, LuPower } from 'react-icons/lu';
import type { NativeRequest, NavigateDestination } from '../steam/runtime';
import { MenuAction } from './MenuAction';
const DESTINATIONS = [
    ['home','Home',LuHouse],['library','Library',LuLibrary],['store','Store',LuShoppingBag],
    ['downloads','Downloads',LuDownload],['settings','Settings',LuSettings],['power','Power',LuPower],
] as const;
export function NavigatePanel({handoff}:{handoff(request:NativeRequest):void}) {
    return <><div className="gg-menu-heading"><h2>Navigate</h2><MenuAction id="navigate:native" onAction={()=>handoff({kind:'main-menu'})}><LuArrowUpRight aria-hidden="true"/>Steam menu</MenuAction></div><Focusable className="gg-menu-grid" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{DESTINATIONS.map(([destination,label,Icon])=><MenuAction key={destination} id={`navigate:${destination}`} onAction={()=>handoff({kind:'navigate',destination:destination as NavigateDestination})}><Icon/><span>{label}</span></MenuAction>)}</Focusable></>;
}
