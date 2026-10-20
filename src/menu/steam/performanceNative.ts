import { findModuleExport } from '@decky/ui';
import { readBattery } from '../../home/statusItems';
import type { Stop } from '../model';
import { PERFORMANCE_CLIENT_KEYS, type GamescopeCapabilities, type PerformanceBindings, type PerformanceState, type PerformanceValue, type PlatformCapabilities } from './performance';
type Registration={unregister?():void;Unregister?():void}|null|undefined;
interface Service {
    GetState(request:object):Promise<{BSuccess?():boolean;GetEResult?():number;Body():{toObject():{state?:unknown}}}>;
    RegisterForNotifyStateChanged?(callback:()=>void):Registration;
}
interface PerfStore {
    nCurrentGameID?:string|number;nActiveProfileGameID?:string|number;
    msgLimits?:Record<string,unknown>;msgSettingsPerApp?:Record<string,unknown>;msgSettingsGlobal?:Record<string,unknown>;
    SetVRREnabled?(value:boolean):unknown;SetSplitScalingScaler?(value:number):unknown;SetSplitScalingFilter?(value:number):unknown;
    SetPerfOverlayLevel?(value:number):unknown;SetShowPerfOverlayOverSteamEnabled?(value:boolean):unknown;SetGameSpecificProfileEnabled?(value:boolean):unknown;
}
interface NativeRoot {
    SystemPerfStore?:PerfStore;
    SystemPowerStore?:{batteryState?:unknown};
    settingsStore?:{GetClientSetting(key:string):[unknown,((value:unknown)=>unknown)?];m_setDeferredSettings?:Set<string>};
    SteamClient?:{System?:{Perf?:{RegisterForStateChanges?(callback:()=>void):Registration};DisplayManager?:{RegisterForStateChanges?(callback:()=>void):Registration};RegisterForBatteryStateChanges?(callback:()=>void):Registration}};
    g_FriendsUIApp?:{FriendStore?:{m_self?:{m_unAccountID?:number}}};
}
interface Environment {root:NativeRoot;platform?:Service;gamescope?:Service}
const METHODS=['SetVRREnabled','SetSplitScalingScaler','SetSplitScalingFilter','SetPerfOverlayLevel','SetShowPerfOverlayOverSteamEnabled','SetGameSpecificProfileEnabled'] as const;
const CLIENT_KEYS=[...Object.values(PERFORMANCE_CLIENT_KEYS),'gamescope_enable_app_target_framerate'];
const release=(r:Registration)=>{r?.unregister?.();r?.Unregister?.();};
const pick=(record:Record<string,unknown>|undefined,keys:readonly string[])=>Object.fromEntries(keys.map(key=>[key,record?.[key]]));
const LIMIT_KEYS=['is_vrr_supported','split_scaling_scalers_available','split_scaling_filters_available'];
const APP_KEYS=['is_vrr_enabled','split_scaling_scaler','split_scaling_filter'];
const GLOBAL_KEYS=['perf_overlay_service_state','perf_overlay_level','is_show_perf_overlay_over_steam_enabled'];
/** One shared read source; no native reset, profile save, or setting restoration on disposal. */
export function createNativePerformanceBindings({root,platform:platformApi,gamescope:gamescopeApi}:Environment):PerformanceBindings {
    let platform:PlatformCapabilities|null=null,gamescope:GamescopeCapabilities|null=null;
    let alive=false,generation=0,timer:ReturnType<typeof setInterval>|undefined,fingerprint='';
    const listeners=new Set<Stop>(),registrations:Registration[]=[];
    const warned=new Set<string>();
    const warn=(key:string,error:unknown)=>{if(warned.has(key))return;warned.add(key);console.warn(`[Game Glance] Performance ${key} unavailable`,error);};
    function collect():PerformanceState {
        const store=root.SystemPerfStore,client:PerformanceState['client']={};
        for(const key of CLIENT_KEYS){try{const [value,setter]=root.settingsStore?.GetClientSetting(key)??[];if(typeof setter==='function'&&(typeof value==='boolean'||typeof value==='string'||typeof value==='number'&&Number.isFinite(value)))client[key]=value;}catch{/* Unsupported setting is omitted. */}}
        const limits=pick(store?.msgLimits,LIMIT_KEYS);
        for(const key of ['split_scaling_scalers_available','split_scaling_filters_available']){
            const value=limits[key];limits[key]=value&&typeof value==='object'?Array.from(value as ArrayLike<unknown>):[];
        }
        const battery=readBattery(root.SystemPowerStore?.batteryState);
        const seconds=(root.SystemPowerStore?.batteryState as {nSecondsRemaining?:number}|undefined)?.nSecondsRemaining;
        return {platform,gamescope,currentGameId:String(store?.nCurrentGameID??''),activeProfileId:String(store?.nActiveProfileGameID??''),
            accountId:String(root.g_FriendsUIApp?.FriendStore?.m_self?.m_unAccountID??''),client,
            deferred:CLIENT_KEYS.filter(key=>root.settingsStore?.m_setDeferredSettings?.has(key)),
            legacy:{limits,perApp:pick(store?.msgSettingsPerApp,APP_KEYS),global:pick(store?.msgSettingsGlobal,GLOBAL_KEYS),methods:METHODS.filter(key=>typeof store?.[key]==='function')},
            power:battery?{percent:battery.percent,charging:battery.charging,...(typeof seconds==='number'&&Number.isFinite(seconds)&&seconds>0?{secondsRemaining:seconds}:{})}:null};
    }
    function emit(){if(!alive)return;const key=JSON.stringify(collect());if(key===fingerprint)return;fingerprint=key;listeners.forEach(fn=>fn());}
    const readers=new Map<Service,{busy:boolean;again:boolean}>();
    async function refreshService(api:Service|undefined,kind:'platform'|'gamescope'){
        if(!api||!alive)return;
        let reader=readers.get(api);if(!reader){reader={busy:false,again:false};readers.set(api,reader);}
        if(reader.busy){reader.again=true;return;}reader.busy=true;const ticket=generation;
        try{
            const response=await api.GetState({});
            if(!alive||generation!==ticket)return;
            if(response.BSuccess?.()===false||response.GetEResult&&response.GetEResult()!==1)throw Error('Native capability service rejected the query');
            const state=response.Body().toObject().state;
            if(!state||typeof state!=='object')throw Error('Native capability response changed');
            if(kind==='platform'){
                const s=state as Record<string,unknown>;
                platform=pick(s,['is_service_available','is_tdp_limit_available','tdp_limit_min','tdp_limit_max','is_manual_gpu_clock_available','manual_gpu_clock_min','manual_gpu_clock_max','platform_performance_profiles_available','is_vrs_available']) as PlatformCapabilities;
            }else{
                const s=state as Record<string,unknown>,display=s.active_display_info as Record<string,unknown>|undefined;
                gamescope={...pick(s,['is_service_available','is_app_refresh_rate_supported','is_refresh_rate_switching_supported','is_refresh_rate_switching_restricted']),active_display_info:display?pick(display,['connector_name','is_external','is_hdr_capable','is_vrr_capable','supported_frame_rates','supported_refresh_rates']):undefined} as GamescopeCapabilities;
            }
            emit();
        }catch(error){if(alive&&generation===ticket){if(kind==='platform')platform=null;else gamescope=null;warn(kind,error);emit();}}
        finally{reader.busy=false;if(reader.again&&alive&&generation===ticket){reader.again=false;void refreshService(api,kind);}}
    }
    function start(){
        alive=true;generation++;fingerprint='';readers.clear();
        const keep=(fn:(()=>Registration)|undefined,key:string)=>{try{if(fn)registrations.push(fn());}catch(error){warn(key,error);}};
        keep(platformApi?.RegisterForNotifyStateChanged?()=>platformApi.RegisterForNotifyStateChanged!(()=>{void refreshService(platformApi,'platform');}):undefined,'platform subscription');
        keep(gamescopeApi?.RegisterForNotifyStateChanged?()=>gamescopeApi.RegisterForNotifyStateChanged!(()=>{void refreshService(gamescopeApi,'gamescope');}):undefined,'display subscription');
        keep(root.SteamClient?.System?.Perf?.RegisterForStateChanges?()=>root.SteamClient!.System!.Perf!.RegisterForStateChanges!(()=>queueMicrotask(emit)):undefined,'legacy subscription');
        keep(root.SteamClient?.System?.DisplayManager?.RegisterForStateChanges?()=>root.SteamClient!.System!.DisplayManager!.RegisterForStateChanges!(()=>{void refreshService(gamescopeApi,'gamescope');}):undefined,'mode subscription');
        let ac=(root.SystemPowerStore?.batteryState as {eACState?:number}|undefined)?.eACState;
        keep(root.SteamClient?.System?.RegisterForBatteryStateChanges?()=>root.SteamClient!.System!.RegisterForBatteryStateChanges!(()=>{const next=(root.SystemPowerStore?.batteryState as {eACState?:number}|undefined)?.eACState;if(next!==ac){ac=next;void refreshService(platformApi,'platform');}emit();}):undefined,'power subscription');
        void refreshService(platformApi,'platform');void refreshService(gamescopeApi,'gamescope');
        // Cheap getters only: service requests are notification-driven, not polled.
        timer=setInterval(emit,250);emit();
    }
    function stop(){alive=false;generation++;if(timer!==undefined)clearInterval(timer);timer=undefined;for(const r of registrations.splice(0)){try{release(r);}catch(error){warn('cleanup',error);}}}
    return {read:collect,
        subscribe(fn){listeners.add(fn);if(listeners.size===1)start();return()=>{listeners.delete(fn);if(!listeners.size)stop();};},
        async writeClient(key,value){
            if(!CLIENT_KEYS.includes(key as typeof CLIENT_KEYS[number]))throw Error('Unknown performance setting');
            if(root.settingsStore?.m_setDeferredSettings?.has(key))throw Error('Steam is deferring this setting');
            const setter=root.settingsStore?.GetClientSetting(key)?.[1];if(typeof setter!=='function')throw Error('Performance setting is unavailable');
            await setter(value);emit();
            // Profile selection can change power-dependent platform bounds.
            if(key==='steamos_platform_performance_profile')void refreshService(platformApi,'platform');
        },
        async writeLegacy(method,value,profileId){
            const store=root.SystemPerfStore;if(String(store?.nActiveProfileGameID??'')!==profileId)throw Error('Native performance profile changed');
            if(!METHODS.includes(method as typeof METHODS[number])||method==='SetGameSpecificProfileEnabled')throw Error('Unknown performance action');
            const fn=store?.[method as keyof PerfStore];if(typeof fn!=='function')throw Error('Performance control is unavailable');
            await (fn as (value:PerformanceValue)=>unknown).call(store,value);emit();
        },
        async setGameSpecific(enabled,currentGameId){
            const store=root.SystemPerfStore;if(!/^[1-9]\d*$/.test(currentGameId)||String(store?.nCurrentGameID??'')!==currentGameId)throw Error('Current game changed');
            if(typeof store?.SetGameSpecificProfileEnabled!=='function')throw Error('Native game profile control is unavailable');
            await store.SetGameSpecificProfileEnabled(enabled);emit();
        },
    };
}
/** Discover verified service names, not numeric webpack module IDs or guessed setting keys. */
export function discoverPerformanceBindings():PerformanceBindings {
    const service=(name:string)=>findModuleExport(value=>typeof value?.GetState==='function'&&typeof value.RegisterForNotifyStateChanged==='function'&&value.GetState.toString().includes(`${name}.GetState#1`)) as Service|undefined;
    return createNativePerformanceBindings({root:globalThis as unknown as NativeRoot,platform:service('SteamOSManager'),gamescope:service('Gamescope')});
}
