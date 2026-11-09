import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import { LuHouse, LuLibrary, LuShoppingBag, LuImage, LuDownload, LuSettings, LuPower } from 'react-icons/lu';
import type { NativeRequest, NavigateDestination } from '../steam/runtime';
import { MenuAction } from './MenuAction';
// Steam's own main-menu order; four across so the seven tiles fill two rows.
const DESTINATIONS = [
    ['home','Home',LuHouse],['library','Library',LuLibrary],['store','Store',LuShoppingBag],['media','Media',LuImage],
    ['downloads','Downloads',LuDownload],['settings','Settings',LuSettings],['power','Power',LuPower],
] as const;
export function NavigatePanel({handoff}:{handoff(request:NativeRequest):void}) {
    return <><div className="gg-menu-heading"><h2>Navigate</h2></div><Focusable className="gg-menu-grid gg-menu-grid-navigate" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{DESTINATIONS.map(([destination,label,Icon])=><MenuAction key={destination} id={`navigate:${destination}`} onAction={()=>handoff({kind:'navigate',destination:destination as NavigateDestination})}><Icon/><span>{label}</span></MenuAction>)}</Focusable></>;
}
