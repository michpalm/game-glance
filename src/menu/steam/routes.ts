import { HOME_ROUTE } from '../../home/guard';
import type { NativeRequest, QamTab } from './runtime';
export interface NativeTabs { Notifications:number; Friends:number; Settings:number; Perf:number; Help:number; Music:number; Decky:number }
export interface RouteBindings {
    deactivate(): void; tabs: NativeTabs; openMain(): void; openQam(tab:number): void;
    library(): void; navigate(path:string): void; finishNavigation(): void; power(): void;
    profile: { allowed():boolean; resolve():string; open(url:string):void };
    fallback?(request: NativeRequest): Promise<void>;
}
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
        if(!bindings.fallback)throw Error('This native destination is unavailable');
        await bindings.fallback(request);
    }};
}
