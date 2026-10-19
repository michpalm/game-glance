import { LuLibrary, LuStore, LuDownload, LuSettings, LuUser, LuPower } from 'react-icons/lu';
import type { NativeRequest, NavigateDestination } from '../steam/runtime';
import { MenuAction } from './MenuAction';
const DESTINATIONS = [
    ['library','Library',LuLibrary],['store','Store',LuStore],['downloads','Downloads',LuDownload],
    ['settings','Settings',LuSettings],['profile','Profile',LuUser],['power','Power',LuPower],
] as const;
export function NavigatePanel({handoff}:{handoff(request:NativeRequest):void}) {
    return <><h2>Navigate</h2><div className="gg-menu-grid">{DESTINATIONS.map(([destination,label,Icon])=><MenuAction key={destination} id={`navigate:${destination}`} onAction={()=>handoff({kind:'navigate',destination:destination as NavigateDestination})}><Icon/><span>{label}</span></MenuAction>)}</div><div className="gg-menu-secondary"><MenuAction id="navigate:native" onAction={()=>handoff({kind:'main-menu'})}>Open Steam menu</MenuAction></div></>;
}
