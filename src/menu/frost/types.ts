// The status bar copy is the fourth area: over a game it has no other glass under it. The Social chat's floating
// keyboard is the fifth.
export const REGION_IDS = ['bar', 'panel', 'notifications', 'status', 'keyboard', 'keyboard-left', 'keyboard-right'] as const;
export type RegionId = typeof REGION_IDS[number];
/** Areas that may be absent (the keyboard is usually closed): absent is an all-zero rectangle, not a failed frame. */
export const OPTIONAL_REGIONS = new Set<RegionId>(['keyboard', 'keyboard-left', 'keyboard-right']);
export const EMPTY_REGION: Readonly<Region> = Object.freeze({ x:0, y:0, width:0, height:0, radiusX:0, radiusY:0 });
/** An absent optional area (all zero, as the backend accepts it): it draws nothing on Home and masks nothing in game. */
export const regionAbsent = (r: Region): boolean => Object.values(r).every(v=>v===0);
export type FitMode = 'fit' | 'fill' | 'stretch' | 'auto';
export interface NativeFrostEnvironment { hdr:boolean; maxScale:number|null }
export type Region = { x:number; y:number; width:number; height:number; radiusX:number; radiusY:number };
export type FrostContext = {
    viewportId:string; background:'game'|'steam'; outputWidth:number; outputHeight:number;
    dpr:number; fit:FitMode; maxScale?:number; colorMode:'sdr'|'hdr';
};
export type FrostFrame = { generation:number; context:FrostContext; regions:Record<RegionId,Region> };
export type UnavailableReason = 'unsupported'|'invalid-geometry'|'owned-elsewhere'|'not-ready'|'connection'|'cancelled';
export type Prepared = { status:'ready'; key:string } | { status:'unavailable'; reason:UnavailableReason };
export type Activated = { status:'active'; token:string } | { status:'unavailable'; reason:UnavailableReason };
export interface FrostBridge {
    present?(requestId:string, frame:FrostFrame):Promise<Activated>;
    environment?():Promise<NativeFrostEnvironment|null>;
    prepare(requestId:string, frame:FrostFrame):Promise<Prepared>;
    activate(requestId:string, key:string, sequence:number, frame:FrostFrame):Promise<Activated>;
    update(token:string, sequence:number, frame:FrostFrame):Promise<boolean>;
    renew(token:string):Promise<boolean>;
    release(token:string):Promise<void>;
    cancel(requestId:string):Promise<void>;
}
