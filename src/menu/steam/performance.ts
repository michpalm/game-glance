import type { Stop } from '../model';
import { createSettingAdapter, type SettingAdapter, type SettingSnapshot, type SettingScope } from './setting';
export type PerformanceValue = number | boolean | string;
export interface PlatformCapabilities {
    is_service_available?:boolean;is_tdp_limit_available?:boolean;tdp_limit_min?:number;tdp_limit_max?:number;
    is_manual_gpu_clock_available?:boolean;manual_gpu_clock_min?:number;manual_gpu_clock_max?:number;
    platform_performance_profiles_available?:string[];is_vrs_available?:boolean;
}
export interface GamescopeCapabilities {
    is_service_available?:boolean;is_app_refresh_rate_supported?:boolean;is_refresh_rate_switching_supported?:boolean;is_refresh_rate_switching_restricted?:boolean;
    active_display_info?:{connector_name?:string;is_external?:boolean;is_hdr_capable?:boolean;is_vrr_capable?:boolean;supported_frame_rates?:number[];supported_refresh_rates?:number[]};
}
export interface PerformanceState {
    currentGameId:string;activeProfileId:string;accountId?:string;platform?:PlatformCapabilities|null;gamescope?:GamescopeCapabilities|null;
    client:Record<string,PerformanceValue|undefined>;deferred?:readonly string[];
    legacy:{limits:Record<string,unknown>;perApp:Record<string,unknown>;global:Record<string,unknown>;methods?:readonly string[]};
    power?:{percent:number;charging:boolean;secondsRemaining?:number}|null;
}
export interface PerformanceBindings {
    read():PerformanceState;subscribe(listener:Stop):Stop;
    writeClient(key:string,value:PerformanceValue):Promise<unknown>|void;
    writeLegacy(method:string,value:PerformanceValue,profileId:string):Promise<unknown>|void;
    setGameSpecific(enabled:boolean,currentGameId:string):Promise<unknown>|void;
}
export const PERFORMANCE_CLIENT_KEYS = {
    profile:'steamos_platform_performance_profile',frameLimit:'gamescope_app_target_framerate',disableLimit:'gamescope_disable_framelimit',
    refreshRate:'gamescope_display_refresh_rate',hdr:'gamescope_hdr_enabled',tearing:'gamescope_allow_tearing',halfRate:'steamos_vrs_enabled',
    tdpEnabled:'steamos_tdp_limit_enabled',tdp:'steamos_tdp_limit',gpuClockEnabled:'steamos_manual_gpu_clock_enabled',gpuClock:'steamos_manual_gpu_clock_hz',
} as const;
/** Steam's visible overlay levels Off/1/2/3/4 use a non-sequential native enum. */
export const PERFORMANCE_OVERLAY_LEVELS = [{value:0,label:'Off'},{value:4,label:'1'},{value:1,label:'2'},{value:2,label:'3'},{value:3,label:'4'}] as const;
const LEGACY = {sharpness:'SetFSRSharpness',vrr:'SetVRREnabled',scalingMode:'SetSplitScalingScaler',scalingFilter:'SetSplitScalingFilter',overlayLevel:'SetPerfOverlayLevel',overlaySteam:'SetShowPerfOverlayOverSteamEnabled'} as const;
const IDS = [...Object.keys(PERFORMANCE_CLIENT_KEYS), ...Object.keys(LEGACY), 'perGame'];
const UNKNOWN:SettingScope={kind:'unknown'};
type NativeSnapshot=Omit<SettingSnapshot<PerformanceValue>,'pending'|'error'>;
/** A real running game: Steam reports its own default profile, 769, as the current game while none runs. */
const runningGame=(id:string)=>/^[1-9]\d*$/.test(id)&&id!=='769';
function profileScope(s:PerformanceState):SettingScope {
    if(runningGame(s.currentGameId)&&s.activeProfileId===s.currentGameId)return {kind:'game',gameId:s.currentGameId};
    return s.activeProfileId==='769'||s.activeProfileId==='0'?{kind:'global'}:UNKNOWN;
}
const numbers=(value:unknown)=>Array.isArray(value)?value.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)):[];
function describe(id:string,s:PerformanceState):NativeSnapshot {
    const p=s.platform,g=s.gamescope,d=g?.active_display_info,c=s.client;
    const platform=p?.is_service_available===true,gamescope=g?.is_service_available===true;
    const key=PERFORMANCE_CLIENT_KEYS[id as keyof typeof PERFORMANCE_CLIENT_KEYS];
    const scope=key?UNKNOWN:profileScope(s);
    const result:NativeSnapshot={available:false,value:null,scope};
    let value:unknown=key?c[key]:undefined,available=false,disabled=!!key&&s.deferred?.includes(key)===true;
    let reason=disabled?'Waiting for Steam to apply this setting':undefined;
    const range=(min:unknown,max:unknown,step:number)=>{
        if(typeof min!=='number'||typeof max!=='number'||!Number.isFinite(min)||!Number.isFinite(max)||max<min)return false;
        result.min=min;result.max=max;result.step=step;return true;
    };
    switch(id){
        case 'profile':result.options=p?.platform_performance_profiles_available?.filter(v=>typeof v==='string'&&v.length>0);available=platform&&!!result.options?.length;break;
        case 'frameLimit':{
            result.options=numbers(d?.supported_frame_rates);available=gamescope&&g?.is_app_refresh_rate_supported===true&&c.gamescope_enable_app_target_framerate===true&&!!result.options.length;
            disabled ||= c.gamescope_disable_framelimit===true||g?.is_refresh_rate_switching_restricted===true&&d?.is_external!==true;
            if(c.gamescope_disable_framelimit===true)reason='Disable limit is on';break;
        }
        case 'disableLimit':available=gamescope&&g?.is_app_refresh_rate_supported===true&&c.gamescope_enable_app_target_framerate===true;break;
        case 'refreshRate':result.options=numbers(d?.supported_refresh_rates);available=gamescope&&g?.is_refresh_rate_switching_supported===true&&d?.is_external===false&&!!result.options.length;disabled ||= g?.is_refresh_rate_switching_restricted===true;break;
        case 'hdr':available=gamescope&&d?.is_hdr_capable===true;break;
        case 'tearing':available=gamescope;break;
        case 'halfRate':available=platform&&p?.is_vrs_available===true;break;
        case 'tdpEnabled':available=platform&&p?.is_tdp_limit_available===true;break;
        case 'tdp':available=platform&&p?.is_tdp_limit_available===true&&range(p.tdp_limit_min,p.tdp_limit_max,1);disabled ||= c.steamos_tdp_limit_enabled!==true;break;
        case 'gpuClockEnabled':available=platform&&p?.is_manual_gpu_clock_available===true;break;
        case 'gpuClock':available=platform&&p?.is_manual_gpu_clock_available===true&&range(p.manual_gpu_clock_min,p.manual_gpu_clock_max,100);disabled ||= c.steamos_manual_gpu_clock_enabled!==true;break;
        case 'vrr':value=s.legacy.perApp.is_vrr_enabled;available=gamescope&&d?.is_vrr_capable===true&&s.legacy.limits.is_vrr_supported===true;break;
        case 'scalingMode':value=s.legacy.perApp.split_scaling_scaler;result.options=[1,2,3,5,4].filter(v=>numbers(s.legacy.limits.split_scaling_scalers_available).includes(v));available=!!result.options.length;break;
        case 'scalingFilter':value=s.legacy.perApp.split_scaling_filter;result.options=[1,2,3,4].filter(v=>numbers(s.legacy.limits.split_scaling_filters_available).includes(v));available=!!result.options.length;break;
        case 'sharpness':value=s.legacy.perApp.fsr_sharpness;available=range(s.legacy.limits.fsr_sharpness_min,s.legacy.limits.fsr_sharpness_max,1);disabled ||= ![3,4].includes(s.legacy.perApp.split_scaling_filter as number);break;
        case 'overlayLevel':value=s.legacy.global.perf_overlay_level;result.options=PERFORMANCE_OVERLAY_LEVELS.map(level=>level.value);available=typeof s.legacy.global.perf_overlay_service_state==='number'&&s.legacy.global.perf_overlay_service_state!==0;break;
        case 'overlaySteam':value=s.legacy.global.is_show_perf_overlay_over_steam_enabled;available=typeof s.legacy.global.perf_overlay_service_state==='number'&&s.legacy.global.perf_overlay_service_state!==0;break;
        case 'perGame':value=!!s.currentGameId&&s.currentGameId===s.activeProfileId;available=runningGame(s.currentGameId)&&!!s.activeProfileId;break;
    }
    const method=LEGACY[id as keyof typeof LEGACY]??(id==='perGame'?'SetGameSpecificProfileEnabled':undefined);
    if(method&&s.legacy.methods&&!s.legacy.methods.includes(method))available=false;
    const valid=typeof value==='boolean'||typeof value==='string'||typeof value==='number'&&Number.isFinite(value);
    result.available=available&&valid;result.value=result.available?value as PerformanceValue:null;
    result.disabled=disabled;result.reason=reason;
    return result;
}
function validate(value:PerformanceValue,s:SettingSnapshot<PerformanceValue>):PerformanceValue|null {
    if(!s.available||s.disabled||typeof value!==typeof s.value)return null;
    if(s.options){
        const option=s.options.find(v=>Object.is(v,value)||typeof v==='number'&&typeof value==='number'&&Math.abs(v-value)<0.001);
        if(option===undefined)return null;
        return typeof value==='number'&&typeof s.value==='number'&&Math.abs(value-s.value)<0.001?s.value:option;
    }
    if(typeof value==='number'){
        if(!Number.isFinite(value))return null;
        const bounded=Math.max(s.min??-Infinity,Math.min(s.max??Infinity,value));
        return s.step&&s.min!==undefined?Math.min(s.max??Infinity,s.min+Math.round((bounded-s.min)/s.step)*s.step):bounded;
    }
    return value;
}
export interface PerformanceProfile {
    currentGameId:string;activeProfileId:string;isGameSpecific:boolean;label:string;
    power?:PerformanceState['power'];
}
export function createPerformance(bindings:PerformanceBindings) {
    const controls:Record<string,SettingAdapter<PerformanceValue>>={};
    for(const id of IDS){
        const clientKey=PERFORMANCE_CLIENT_KEYS[id as keyof typeof PERFORMANCE_CLIENT_KEYS];
        const legacyMethod=LEGACY[id as keyof typeof LEGACY];
        const contextKey=()=>{
            const s=bindings.read(),meta=describe(id,s);
            // Profile toggling is confirmed by a changed active ID; only the current game may invalidate its receipt.
            if(id==='perGame')return `profile:${s.accountId??''}:${s.currentGameId}`;
            return JSON.stringify([s.accountId,s.currentGameId,clientKey?'client':s.activeProfileId,s.gamescope?.active_display_info?.connector_name,meta.available,meta.disabled,meta.min,meta.max,meta.options]);
        };
        controls[id]=createSettingAdapter<PerformanceValue>({read:()=>describe(id,bindings.read()),subscribe:bindings.subscribe,contextKey,validate,
            liveIntervalMs:id==='frameLimit'?100:undefined,
            coalesceMs:id==='refreshRate'?700:id==='gpuClock'?200:['tdp','sharpness','overlayLevel'].includes(id)?100:0,
            async write(value,key){
                if(contextKey()!==key)throw Error('Performance context changed');
                if(clientKey)await bindings.writeClient(clientKey,value);
                else if(legacyMethod)await bindings.writeLegacy(legacyMethod,value,bindings.read().activeProfileId);
                else if(id==='perGame'&&typeof value==='boolean')await bindings.setGameSpecific(value,bindings.read().currentGameId);
            },
        });
    }
    let profile!:PerformanceProfile,fingerprint='';const listeners=new Set<Stop>();
    const refresh=()=>{
        const s=bindings.read();const isGameSpecific=runningGame(s.currentGameId)&&s.currentGameId===s.activeProfileId;
        const next:PerformanceProfile={currentGameId:s.currentGameId,activeProfileId:s.activeProfileId,isGameSpecific,
            label:!s.activeProfileId?'Profile unavailable':isGameSpecific?'Using per-game profile':s.activeProfileId==='769'||s.activeProfileId==='0'?'Using default profile':'Using native profile',power:s.power};
        const key=JSON.stringify(next);if(key===fingerprint)return;fingerprint=key;profile=Object.freeze(next);listeners.forEach(fn=>fn());
    };
    refresh();const stop=bindings.subscribe(refresh);
    return {controls,getProfile:()=>profile,subscribeProfile(fn:Stop){listeners.add(fn);return()=>{listeners.delete(fn);};},
        setGameSpecific:(enabled:boolean)=>controls.perGame.set(enabled),
        dispose(){Object.values(controls).forEach(control=>control.dispose());stop();listeners.clear();},
    };
}
