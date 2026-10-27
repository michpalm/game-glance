export const REGION_IDS = ['bar', 'panel', 'notifications'] as const;
export type RegionId = typeof REGION_IDS[number];
export type FitMode = 'fit' | 'fill' | 'stretch';
export type Region = { x:number; y:number; width:number; height:number; radiusX:number; radiusY:number };
export type FrostContext = {
    viewportId:string; background:'game'|'steam'; outputWidth:number; outputHeight:number;
    dpr:number; fit:FitMode; colorMode:'sdr'|'hdr';
};
export type FrostFrame = { generation:number; context:FrostContext; regions:Record<RegionId,Region> };
export type UnavailableReason = 'unsupported'|'invalid-geometry'|'owned-elsewhere'|'not-ready'|'connection'|'cancelled';
export type Prepared = { status:'ready'; key:string } | { status:'unavailable'; reason:UnavailableReason };
export type Activated = { status:'active'; token:string } | { status:'unavailable'; reason:UnavailableReason };
export interface FrostBridge {
    prepare(requestId:string, frame:FrostFrame):Promise<Prepared>;
    activate(requestId:string, key:string, sequence:number, frame:FrostFrame):Promise<Activated>;
    update(token:string, sequence:number, frame:FrostFrame):Promise<boolean>;
    renew(token:string):Promise<boolean>;
    release(token:string):Promise<void>;
    cancel(requestId:string):Promise<void>;
}
