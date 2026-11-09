import { findModuleExport, QuickAccessTab, Router } from '@decky/ui';
import type { Audio } from '@decky/ui/dist/globals/steam-client/system/Audio';
import type { Display } from '@decky/ui/dist/globals/steam-client/system/Display';
import type { Stop } from '../model';
import type { AudioState, QuickSettingsBindings, ValueBinding } from './quickSettings';
import type { NativeOwner, NativeRequest } from './runtime';
import { HOME_ROUTE } from '../../home/guard';
import { markLeaving } from '../../home/homeMemory';
import type { RouteBindings } from './routes';
interface Registration { unregister?():void; Unregister?():void }
interface DisplaySettings { strDisplayName?:string; bDisplayIsExternal?:boolean; bDisplayIsUsingAutoScale?:boolean }
interface CoreGlobals {
    SteamClient?: { System?:{Audio?:Audio;Display?:Display};Window?:{SetGamepadUIAutoDisplayScale?(value:boolean):void};WebChat?:{ShowFriendChatDialog?(id:string):void;OpenURLInClient?(url:string,pid:number,external:boolean):void};Apps?:{TerminateApp?(gameId:string,force:boolean):void};URL?:{ExecuteSteamURL?(url:string):void} };
    SystemStoragStore?: { DisplayBrightness?:number|{Value?:number};AirplaneModeEnabled?:boolean|{Value?:boolean};msgSettings?:{display_nightmode_enabled?:boolean;is_display_brightness_available?:boolean};SetDisplayBrightness?(value:number):void;SetAirplaneMode?(value:boolean):void;SetNightModeEnabled?(value:boolean):void };
    SystemNetworkStore?:{hasWirelessDevice?:boolean;isWifiEnabled?:boolean;SetWifiEnabled?(value:boolean):void};
    settingsStore?:{GetClientSetting(key:string):[unknown,((value:unknown)=>unknown)?]};
    NotificationStore?:{m_nUnviewedNotifications?:number;m_rgNotificationTray?:unknown;m_cbkNotificationTray?:{Register(callback:Stop):Registration}};
    urlStore?:{ResolveURL(key:string):string};
    g_FriendsUIApp?:{m_bReadyToRender?:boolean;m_CMInterface?:{m_bConnected?:boolean;m_bLoggedOn?:boolean};FriendStore?:{m_self?:{m_unAccountID?:number};GetUserDoNotDisturb?():boolean;SetUserDoNotDisturb?(value:boolean):void}};
}
const globals=()=>globalThis as unknown as CoreGlobals;
const release=(r:Registration|undefined)=>{r?.unregister?.();r?.Unregister?.();};
let parentalPolicy: { BIsFeatureBlocked(feature:number):boolean } | null | undefined;
function parentalAllowed(feature:number):boolean {
    try {if(parentalPolicy===undefined)parentalPolicy=findModuleExport(value=>typeof value?.BIsFeatureBlocked==='function')??null;return !!parentalPolicy&&!parentalPolicy.BIsFeatureBlocked(feature);} catch{return false;}
}
function friendsOnline(root:CoreGlobals):boolean {const f=root.g_FriendsUIApp;return f?.m_bReadyToRender===true&&f.m_CMInterface?.m_bConnected===true&&f.m_CMInterface?.m_bLoggedOn===true;}
let displaySource: {settings?:DisplaySettings}|null|undefined;
function displaySettings():DisplaySettings|undefined {
    try{if(displaySource===undefined)displaySource=findModuleExport(value=>typeof value?.settings?.bDisplayIsUsingAutoScale==='boolean')??null;return displaySource?.settings;}catch{return undefined;}
}
export function nativeRouteBindings(owner:NativeOwner,deactivate:Stop,fallback:(request:NativeRequest)=>Promise<void>):RouteBindings {
    const root=globals();
    const window=owner as NativeOwner&{Navigate?(path:string):void;Navigator?:{LibraryTab?(tab?:string):void;ExternalWeb?(url:string):void}};
    const rememberHome = () => {
        if (owner.History?.location?.pathname === HOME_ROUTE) markLeaving();
    };
    function navigate(path: string) {
        if (!window.Navigate) throw Error('Steam navigation is unavailable');
        if (path !== HOME_ROUTE) rememberHome();
        window.Navigate(path);
    }
    return {deactivate,tabs:QuickAccessTab,openMain(){owner.MenuStore.OpenMainMenu?owner.MenuStore.OpenMainMenu():owner.MenuStore.OpenSideMenu(1);},openQam:tab=>owner.MenuStore.OpenQuickAccessMenu(tab),
        library(){navigate('/library');},
        libraryTab(tab){if(typeof window.Navigator?.LibraryTab==='function'){rememberHome();window.Navigator.LibraryTab(tab);}else navigate('/library');},navigate,finishNavigation:()=>owner.MenuStore.CloseSideMenus(),
        power(){if(typeof Router?.OpenPowerMenu!=='function')throw Error('Steam Power menu is unavailable');Router.OpenPowerMenu();},
        joinGame(url){const steamUrl=root.SteamClient?.URL;if(typeof steamUrl?.ExecuteSteamURL!=='function')throw Error('Steam cannot join this game');steamUrl.ExecuteSteamURL(url);},
        // As Steam's own notification list opens invite urls and account links.
        openUrl(url){const chat=root.SteamClient?.WebChat;if(typeof chat?.OpenURLInClient!=='function')throw Error('Steam cannot open this link');chat.OpenURLInClient(url,0,false);},
        openStore(url){const steamUrl=root.SteamClient?.URL;if(typeof steamUrl?.ExecuteSteamURL!=='function')throw Error('The Steam store is unavailable');steamUrl.ExecuteSteamURL(`steam://openurl/${url}`);},
        exitGame(gameId){const apps=root.SteamClient?.Apps;if(typeof apps?.TerminateApp!=='function')throw Error('Steam cannot exit this game');apps.TerminateApp(gameId,false);},
        profile:{allowed:()=>friendsOnline(root)&&parentalAllowed(3),resolve:()=>root.urlStore?.ResolveURL('SteamIDMyProfile')??'',open(url){if(!window.Navigator?.ExternalWeb)throw Error('Steam Profile is unavailable');rememberHome();window.Navigator.ExternalWeb(url);}},
        async fallback(request){
            if(request.kind==='friend-chat'&&root.SteamClient?.WebChat?.ShowFriendChatDialog){if(!/^\d{17}$/.test(request.steamId))throw Error('Invalid Steam ID');root.SteamClient.WebChat.ShowFriendChatDialog(request.steamId);return;}
            await fallback(request);
        },
    };
}

let settingsStoreClass:{Get():unknown}|undefined;
/** Steam creates SystemStoragStore (sic) only when its own Quick Access settings first
 * draws, through the class's Get(); until then brightness, airplane and night mode
 * have no store. Create it the same way Steam does, found by Get()'s own source. */
function ensureSystemSettingsStore(root:CoreGlobals){
    if(root.SystemStoragStore)return;
    try{
        settingsStoreClass??=findModuleExport(value=>typeof value==='function'&&typeof (value as {Get?:unknown}).Get==='function'&&Function.prototype.toString.call((value as {Get:()=>unknown}).Get).includes('SystemStoragStore'));
        settingsStoreClass?.Get();
    }catch{/* The display API still reads and writes brightness. */}
}
/** One lazy source per enabled menu session; callbacks remain alive for unsettled issued writes. */
export function discoverQuickSettingsBindings():QuickSettingsBindings {
    const root=globals(),audio=root.SteamClient?.System?.Audio,display=root.SteamClient?.System?.Display;
    ensureSystemSettingsStore(root);
    const initialBrightness=root.SystemStoragStore?.DisplayBrightness;
    let devices:AudioState|null=null,brightness:number|null=(typeof initialBrightness==='number'?initialBrightness:initialBrightness?.Value)??null,alive=false,generation=0,scanning=false,fingerprint='';
    let interval:ReturnType<typeof setInterval>|undefined;
    const listeners=new Set<Stop>(),registrations:Registration[]=[];
    const account=()=>String(root.g_FriendsUIApp?.FriendStore?.m_self?.m_unAccountID??'unknown');
    const displayKey=()=>{const d=displaySettings();return `display:${d?.strDisplayName??'unknown'}:${d?.bDisplayIsExternal??'unknown'}`;};
    const toggles:Record<string,ValueBinding<boolean>>={};
    const add=(id:string,read:()=>boolean|null,write:((value:boolean)=>unknown)|undefined,contextKey:()=>string=()=>`global:${id}`)=>{
        if(write)toggles[id]={read,async write(value){await write(value);},contextKey};
    };
    const net=root.SystemNetworkStore,store=root.SystemStoragStore;
    add('wifi',()=>net?.hasWirelessDevice&&typeof net.isWifiEnabled==='boolean'?net.isWifiEnabled:null,typeof net?.SetWifiEnabled==='function'?value=>net.SetWifiEnabled!(value):undefined);
    const bluetooth=()=>{try{return root.settingsStore?.GetClientSetting?.('system_bluetooth_enabled');}catch{return undefined;}};
    add('bluetooth',()=>{const value=bluetooth()?.[0];return typeof value==='boolean'?value:null;},typeof bluetooth()?.[1]==='function'?value=>{const setter=bluetooth()?.[1];if(!setter)throw Error('Bluetooth settings are unavailable');return setter(value);}:undefined);
    add('airplane',()=>{const state=store?.AirplaneModeEnabled;const value=typeof state==='boolean'?state:state?.Value;return typeof value==='boolean'?value:null;},typeof store?.SetAirplaneMode==='function'?value=>store.SetAirplaneMode!(value):undefined);
    add('night',()=>typeof store?.msgSettings?.display_nightmode_enabled==='boolean'?store.msgSettings.display_nightmode_enabled:null,typeof store?.SetNightModeEnabled==='function'?value=>store.SetNightModeEnabled!(value):undefined);
    add('ui-scale',()=>{const value=displaySettings()?.bDisplayIsUsingAutoScale;return typeof value==='boolean'?value:null;},typeof root.SteamClient?.Window?.SetGamepadUIAutoDisplayScale==='function'?value=>root.SteamClient!.Window!.SetGamepadUIAutoDisplayScale!(value):undefined,displayKey);
    const getFriend=()=>root.g_FriendsUIApp?.FriendStore;
    add('friends-dnd',()=>{const friend=getFriend();return friendsOnline(root)&&parentalAllowed(4)&&typeof friend?.GetUserDoNotDisturb==='function'?friend.GetUserDoNotDisturb():null;},typeof getFriend()?.SetUserDoNotDisturb==='function'?value=>{const friend=getFriend();if(!friendsOnline(root)||!parentalAllowed(4)||!friend?.SetUserDoNotDisturb)throw Error('Friends settings are unavailable');friend.SetUserDoNotDisturb(value);}:undefined,()=>`friends:${account()}`);
    function emit(){
        if(!alive)return;
        const next=JSON.stringify({devices,brightness,brightnessAvailable:store?.msgSettings?.is_display_brightness_available,display:displayKey(),toggles:Object.fromEntries(Object.entries(toggles).map(([id,binding])=>[id,[binding.contextKey(),binding.read()]]))});
        if(next===fingerprint)return;fingerprint=next;listeners.forEach(listener=>listener());
    }
    async function scan(){
        if(!alive||scanning||!audio?.GetDevices)return;
        scanning=true;const ticket=generation;
        try {const next=await audio.GetDevices();if(alive&&ticket===generation){devices=next;emit();}}
        catch{if(alive&&ticket===generation){devices=null;emit();}}
        finally{if(ticket===generation)scanning=false;}
    }
    function start(){
        alive=true;generation++;scanning=false;
        const keep=(registration:Registration|undefined)=>{if(registration)registrations.push(registration);};
        try {
            if(audio){keep(audio.RegisterForDeviceAdded?.(()=>{void scan();}));keep(audio.RegisterForDeviceRemoved?.(()=>{void scan();}));keep(audio.RegisterForServiceConnectionStateChanges?.(()=>{void scan();}));
                keep(audio.RegisterForDeviceVolumeChanged?.((id,type,value)=>{if(devices){devices={...devices,vecDevices:devices.vecDevices.map(device=>device.id===id?{...device,...(type===1?{flOutputVolume:value}:type===0?{flInputVolume:value}:{})}:device)};emit();}}));}
            if(display?.RegisterForBrightnessChanges)keep(display.RegisterForBrightnessChanges(state=>{brightness=Number.isFinite(state.flBrightness)?state.flBrightness:null;emit();}));
            void scan();let ticks=0;
            interval=setInterval(()=>{try{emit();if(++ticks%2===0)void scan();}catch(error){console.warn('[Game Glance] quick-setting refresh failed',error);}},500);
        }catch(error){stop();throw error;}
    }
    function stop(){alive=false;generation++;scanning=false;if(interval!==undefined)clearInterval(interval);interval=undefined;for(const r of registrations.splice(0)){try{release(r);}catch{}}}
    const bindings:QuickSettingsBindings={subscribe(listener){listeners.add(listener);if(listeners.size===1)start();return()=>{listeners.delete(listener);if(!listeners.size)stop();};},toggles};
    if(audio?.GetDevices&&audio?.SetDeviceVolume)bindings.audio={read:()=>devices,async write(id,type,value){const ticket=generation,requestedAt=Date.now();const current=await audio.GetDevices();if(!alive||ticket!==generation||Date.now()-requestedAt>=3000)throw Error('Audio device confirmation expired. Try again.');devices=current;emit();if((type===1?current.activeOutputDeviceId:current.activeInputDeviceId)!==id)throw Error('Active audio device changed. Try again.');const result=await audio.SetDeviceVolume(id,type,value);if(result&&result.result!==1)throw Error(result.message||'Steam rejected the volume change');}};
    // Steam creates SystemStoragStore lazily, when its own Quick Access settings first
    // draws; until then the display API alone reads (on registration) and writes.
    const settingsStore=()=>root.SystemStoragStore;
    const setBrightness=typeof store?.SetDisplayBrightness==='function'?(value:number)=>store.SetDisplayBrightness!(value):typeof display?.SetBrightness==='function'?(value:number)=>display.SetBrightness(value):undefined;
    if(display?.RegisterForBrightnessChanges&&setBrightness)bindings.brightness={read:()=>brightness,contextKey:displayKey,available:()=>settingsStore()?.msgSettings?.is_display_brightness_available??displaySettings()?.bDisplayIsExternal===false,write:value=>setBrightness(value)};
    return bindings;
}
export function nativeNotificationBindings(){
    const getStore=()=>globals().NotificationStore;
    return {getUnviewed:()=>getStore()?.m_nUnviewedNotifications??0,getTray:():unknown=>getStore()?.m_rgNotificationTray,subscribe(listener:Stop):Stop{
        const registration=getStore()?.m_cbkNotificationTray?.Register(listener);
        let previous=getStore()?.m_nUnviewedNotifications;
        const timer=setInterval(()=>{const next=getStore()?.m_nUnviewedNotifications;if(next!==previous){previous=next;listener();}},500);
        return()=>{clearInterval(timer);release(registration);};
    }};
}
