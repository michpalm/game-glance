import type { FitMode, FrostContext, NativeFrostEnvironment } from './types';

interface NativeContext {
    SteamUIStore?: {WindowStore?: {GamepadUIMainWindowInstance?: {BIsOverlayPath?():boolean}}};
    SystemPerfStore?: {msgSettingsPerApp?: {split_scaling_scaler?:number}; msgSettingsGlobal?: {is_hdr_enabled?:boolean}};
}
/** @decky/ui system/Perf.d.ts ESplitScalingScaler. Auto/Integer require a
 * different mapping contract; never silently treat them as Fit. */
const FIT:Record<number,FitMode|undefined> = {3:'fit',4:'fill',5:'stretch'};
function overlayPath(owner:Window):unknown {
    const native = owner as Window & NativeContext, globals=globalThis as unknown as NativeContext;
    return (native.SteamUIStore??globals.SteamUIStore)?.WindowStore?.GamepadUIMainWindowInstance?.BIsOverlayPath?.();
}
/** True only when Steam says the menu opens over its own UI (Home, the library), not over a game. */
export function menuOverHome(owner:Window=globalThis as unknown as Window):boolean {
    try { return overlayPath(owner)===false; } catch { return false; }
}
export function readFrostContext(owner:Window, viewportId:string, environment?:NativeFrostEnvironment|null):FrostContext|null {
    const native = owner as Window & NativeContext;
    const globals=globalThis as unknown as NativeContext;
    const overlay = overlayPath(owner);
    const store=native.SystemPerfStore??globals.SystemPerfStore;
    const hdr = environment?.hdr??store?.msgSettingsGlobal?.is_hdr_enabled;
    const scaler=store?.msgSettingsPerApp?.split_scaling_scaler;
    const maxScale=environment?.maxScale;
    const auto=scaler===1&&typeof maxScale==='number'&&Number.isFinite(maxScale)&&maxScale>0&&maxScale<=16384;
    const fit = overlay ? auto?'auto':FIT[scaler??0] : 'fit';
    const {innerWidth:width,innerHeight:height,devicePixelRatio:dpr} = owner;
    // Steam's CSS blur uses viewport geometry and can run without native HDR metadata.
    if (typeof overlay !== 'boolean' || (overlay && typeof hdr !== 'boolean') || !fit || !viewportId ||
        ![width,height,dpr].every(n=>Number.isFinite(n)&&n>0) || width*dpr>16384 || height*dpr>16384) return null;
    return {viewportId,background:overlay?'game':'steam',outputWidth:Math.round(width*dpr),outputHeight:Math.round(height*dpr),
        dpr,fit,...(fit==='auto'?{maxScale:maxScale!}:{}),colorMode:hdr?'hdr':'sdr'};
}
