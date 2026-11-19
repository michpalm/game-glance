import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import type { ComponentType } from 'react';
import { FaGamepad } from 'react-icons/fa';
import { LuHouse, LuLibrary, LuShoppingBag, LuImage, LuDownload, LuSettings, LuPower, LuHardDrive } from 'react-icons/lu';
import { GAME_GLANCE_TILE } from '../views';
import type { NativeRequest, NavigateDestination } from '../steam/runtime';
import { MenuAction } from './MenuAction';
const tile=(destination:string,label:string,Icon:ComponentType)=>[destination,label,Icon] as const;
/** Michael's order (2026-11-19): Home, Library, Game Glance, Store, Media, Downloads, Storage (only when Steam offers its
 * install folders), Settings, then Power, always last. Game Glance opens its settings in the menu, not in Steam. */
export function NavigatePanel({handoff,openGameGlance,storage=false}:{handoff(request:NativeRequest):void; openGameGlance():void; storage?:boolean}) {
    const steam=([destination,label,Icon]:readonly [string,string,ComponentType])=><MenuAction key={destination} id={`navigate:${destination}`} onAction={()=>handoff({kind:'navigate',destination:destination as NavigateDestination})}><Icon/><span>{label}</span></MenuAction>;
    return <><div className="gg-menu-heading"><h2>Navigate</h2></div><Focusable className="gg-menu-grid gg-menu-grid-navigate" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
        {steam(tile('home','Home',LuHouse))}
        {steam(tile('library','Library',LuLibrary))}
        <MenuAction key="game-glance" id={GAME_GLANCE_TILE} onAction={openGameGlance}><FaGamepad/><span>Game Glance</span></MenuAction>
        {steam(tile('store','Store',LuShoppingBag))}
        {steam(tile('media','Media',LuImage))}
        {steam(tile('downloads','Downloads',LuDownload))}
        {storage&&steam(tile('storage','Storage',LuHardDrive))}
        {steam(tile('settings','Settings',LuSettings))}
        {steam(tile('power','Power',LuPower))}
    </Focusable></>;
}
