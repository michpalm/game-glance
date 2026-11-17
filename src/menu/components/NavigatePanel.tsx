import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import type { ComponentType } from 'react';
import { FaGamepad } from 'react-icons/fa';
import { LuHouse, LuLibrary, LuShoppingBag, LuImage, LuDownload, LuSettings, LuPower, LuHardDrive } from 'react-icons/lu';
import { GAME_GLANCE_TILE } from '../views';
import type { NativeRequest, NavigateDestination } from '../steam/runtime';
import { MenuAction } from './MenuAction';
// Steam's own main-menu order; Power stays last (NavigatePanel puts Game Glance before it).
const DESTINATIONS = [
    ['home','Home',LuHouse],['library','Library',LuLibrary],['store','Store',LuShoppingBag],['media','Media',LuImage],
    ['downloads','Downloads',LuDownload],['settings','Settings',LuSettings],['power','Power',LuPower],
] as const;
/** Steam's destinations, with Game Glance's own settings before Power (they open in the menu, not in Steam); eight tiles fill both rows.
 * Storage, Game Glance's own screen, starts a third row after Power (Michael, 2026-11-16), only when Steam offers its install folders. */
export function NavigatePanel({handoff,openGameGlance,storage=false}:{handoff(request:NativeRequest):void; openGameGlance():void; storage?:boolean}) {
    const steam=([destination,label,Icon]:readonly [string,string,ComponentType])=><MenuAction key={destination} id={`navigate:${destination}`} onAction={()=>handoff({kind:'navigate',destination:destination as NavigateDestination})}><Icon/><span>{label}</span></MenuAction>;
    const power=DESTINATIONS.length-1;
    return <><div className="gg-menu-heading"><h2>Navigate</h2></div><Focusable className="gg-menu-grid gg-menu-grid-navigate" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
        {DESTINATIONS.slice(0,power).map(steam)}
        <MenuAction key="game-glance" id={GAME_GLANCE_TILE} onAction={openGameGlance}><FaGamepad/><span>Game Glance</span></MenuAction>
        {steam(DESTINATIONS[power])}
        {storage&&steam(['storage','Storage',LuHardDrive])}
    </Focusable></>;
}
