import { HOME_ROUTE } from '../../home/guard';
import type { NativeRequest, QamTab } from './runtime';
export interface NativeTabs { Notifications:number; Friends:number; Settings:number; Perf:number; Help:number; Music:number; Decky:number }
export interface RouteBindings {
    deactivate(): void; tabs: NativeTabs; openMain(): void; openQam(tab:number): void;
    library(): void; navigate(path:string): void; finishNavigation(): void; power(): void;
    exitGame(gameId:string): void;
    openStore(url:string): void;
    joinGame(url:string): void;
    openUrl(url:string): void;
    profile: { allowed():boolean; resolve():string; open(url:string):void };
    fallback?(request: NativeRequest): Promise<void>;
}
// Steam's in-game overlay routes (sp.js AppOverlay: `/app/${appid}/overlay/...`).
const GAME_PAGES: Record<string,(appId:number)=>string> = {
    achievements:id=>`/app/${id}/overlay/achievements`, recordings:id=>`/app/${id}/overlay/gamerecording`,
    guides:id=>`/app/${id}/overlay/guides`, controller:id=>`/app/${id}/overlay/controller`, 'game-page':id=>`/library/app/${id}`,
};
// The two urls Steam's own friends menu opens for Join Game (home/join.ts builds them); nothing else.
const JOIN_URL = /^steam:\/\/(rungame\/\d+\/\d{17}(\/[A-Za-z0-9%\-_.!~*'()]+)?|joinlobby\/\d+\/\d+\/\d{17})$/;
// Notification links (Steam's account link table, invite urls): Steam pages or steam:// urls only.
const NOTIFICATION_URL = /^(https:\/\/|steam:\/\/)\S+$/;
export const GAME_ACTIONS = [...Object.keys(GAME_PAGES), 'exit'] as const;
const TAB_NAMES: Record<QamTab,keyof NativeTabs> = {notifications:'Notifications',friends:'Friends','quick-settings':'Settings',performance:'Perf',help:'Help',soundtrack:'Music',decky:'Decky'};
export function createRoutes(bindings:RouteBindings) {
    return { async open(request:NativeRequest):Promise<void> {
        bindings.deactivate();
        if(request.kind==='main-menu'){bindings.openMain();return;}
        if(request.kind==='qam'){
            const tab=bindings.tabs[TAB_NAMES[request.tab]];
            if(!Number.isInteger(tab))throw Error('This Steam menu is unavailable');
            bindings.openQam(tab);return;
        }
        if(request.kind==='navigate'){
            switch(request.destination){
                case 'home':bindings.navigate(HOME_ROUTE);break;
                case 'library':bindings.library();break;
                case 'store':bindings.navigate('/steamweb');break;
                // Steam opens Media through its Media.Grid route (/media/grid); the bare /media root keeps a stale list.
                case 'media':bindings.navigate('/media/grid');break;
                case 'downloads':bindings.navigate('/library/downloads');break;
                case 'settings':bindings.navigate('/settings');break;
                case 'power':bindings.power();return;
                case 'profile':{
                    if(!bindings.profile.allowed())throw Error('Profile is unavailable offline or under the current parental restrictions');
                    const url=bindings.profile.resolve();
                    if(!/^https:\/\/steamcommunity\.com\/(profiles|id)\/[a-zA-Z0-9_-]+\/?$/.test(url))throw Error('Current-user profile is unavailable');
                    bindings.profile.open(url);break;
                }
            }
            bindings.finishNavigation();return;
        }
        if(request.kind==='friend-profile'){
            if(!/^\d{17}$/.test(request.steamId))throw Error('Friend profile is unavailable');
            if(!bindings.profile.allowed())throw Error('Profile is unavailable offline or under the current parental restrictions');
            bindings.profile.open(`https://steamcommunity.com/profiles/${request.steamId}`);
            bindings.finishNavigation();return;
        }
        if(request.kind==='join'){
            if(!JOIN_URL.test(request.url))throw Error('This game cannot be joined from here');
            bindings.joinGame(request.url);return;
        }
        if(request.kind==='app'){
            if(!Number.isInteger(request.appId)||request.appId<=0)throw Error('This game is unavailable');
            bindings.navigate(`/library/app/${request.appId}`);bindings.finishNavigation();return;
        }
        if(request.kind==='url'){
            if(!NOTIFICATION_URL.test(request.url))throw Error('This link cannot be opened from here');
            bindings.openUrl(request.url);return;
        }
        if(request.kind==='store'){
            if(request.target==='wishlist'){bindings.openStore('https://store.steampowered.com/wishlist/');return;}
            if(!Number.isInteger(request.appId)||request.appId<=0)throw Error('This store page is unavailable');
            bindings.openStore(`https://store.steampowered.com/app/${request.appId}/`);return;
        }
        if(request.kind==='game-action'){
            if(!Number.isInteger(request.appId)||request.appId<=0||!/^\d{1,20}$/.test(request.gameId))throw Error('This game is unavailable');
            if(request.actionId==='exit'){bindings.exitGame(request.gameId);return;}
            const page=GAME_PAGES[request.actionId];
            if(!page)throw Error('This game destination is unavailable');
            bindings.navigate(page(request.appId));bindings.finishNavigation();return;
        }
        if(!bindings.fallback)throw Error('This native destination is unavailable');
        await bindings.fallback(request);
    }};
}
