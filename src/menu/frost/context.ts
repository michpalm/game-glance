import type { FitMode, FrostContext } from './types';

interface NativeContext {
    SteamUIStore?: {WindowStore?: {GamepadUIMainWindowInstance?: {BIsOverlayPath?():boolean}}};
    SystemPerfStore?: {msgSettingsPerApp?: {split_scaling_scaler?:number}; msgSettingsGlobal?: {is_hdr_enabled?:boolean}};
}
/** @decky/ui system/Perf.d.ts ESplitScalingScaler. Auto/Integer require a
 * different mapping contract; never silently treat them as Fit. */
const FIT:Record<number,FitMode|undefined> = {3:'fit',4:'fill',5:'stretch'};
export function readFrostContext(owner:Window, viewportId:string):FrostContext|null {
    const native = owner as Window & NativeContext;
    const globals=globalThis as unknown as NativeContext;
    const overlay = (native.SteamUIStore??globals.SteamUIStore)?.WindowStore?.GamepadUIMainWindowInstance?.BIsOverlayPath?.();
    const store=native.SystemPerfStore??globals.SystemPerfStore;
    const hdr = store?.msgSettingsGlobal?.is_hdr_enabled;
    const fit = overlay ? FIT[store?.msgSettingsPerApp?.split_scaling_scaler ?? 0] : 'fit';
    const {innerWidth:width,innerHeight:height,devicePixelRatio:dpr} = owner;
    if (typeof overlay !== 'boolean' || typeof hdr !== 'boolean' || !fit || !viewportId ||
        ![width,height,dpr].every(n=>Number.isFinite(n)&&n>0) || width*dpr>16384 || height*dpr>16384) return null;
    return {viewportId,background:overlay?'game':'steam',outputWidth:Math.round(width*dpr),outputHeight:Math.round(height*dpr),
        dpr,fit,colorMode:hdr?'hdr':'sdr'};
}
