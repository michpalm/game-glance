import type {KvBackend} from '../../data/kv';

export type Rect={x:number;y:number;width:number;height:number};
export type Spot='left'|'right'|'top';
type Point={x:number;y:number};
type Size={width:number;height:number};
export type KeyboardPosition={spot:Spot}|Point;

export const SPOTS:readonly Spot[]=['left','right','top'];
const GAP=16;
const KEY='menu:keyboard';

const clampTo=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const inside=(p:Point,v:Rect,s:Size)=>p.x>=v.x&&p.y>=v.y&&p.x+s.width<=v.x+v.width&&p.y+s.height<=v.y+v.height;
const overlaps=(p:Point,f:Rect,s:Size)=>p.x<f.x+f.width&&p.x+s.width>f.x&&p.y<f.y+f.height&&p.y+s.height>f.y;

// Clamps into the view, then slides clear of the field by the shortest move that stays in view.
export function settle(pos:Point,view:Rect,field:Rect,size:Size):Point {
    const p={
        x:clampTo(pos.x,view.x,Math.max(view.x,view.x+view.width-size.width)),
        y:clampTo(pos.y,view.y,Math.max(view.y,view.y+view.height-size.height)),
    };
    if(!overlaps(p,field,size))return p;
    const shifts:Point[]=[
        {x:field.x-size.width,y:p.y},{x:field.x+field.width,y:p.y},
        {x:p.x,y:field.y-size.height},{x:p.x,y:field.y+field.height},
    ];
    let best:Point|null=null,bestD=Infinity;
    for(const c of shifts){
        const d=Math.abs(c.x-p.x)+Math.abs(c.y-p.y);
        if(d<bestD&&inside(c,view,size)){best=c;bestD=d;}
    }
    return best??p;
}

export function spotPosition(spot:Spot,view:Rect,menu:Rect,field:Rect,size:Size):Point {
    const p:Point=spot==='left'?{x:field.x-size.width-GAP,y:field.y+field.height-size.height}
        :spot==='right'?{x:menu.x+menu.width-size.width-GAP,y:field.y-size.height-GAP}
        :{x:menu.x+(menu.width-size.width)/2,y:menu.y+GAP};
    return settle(p,view,field,size);
}

const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);

export async function loadPosition(kv:KvBackend):Promise<KeyboardPosition|null> {
    let v:unknown;
    try{v=await kv.get(KEY);}catch{return null;}
    if(typeof v!=='object'||v===null||Array.isArray(v))return null;
    const o=v as Record<string,unknown>,keys=Object.keys(o);
    if(keys.length===1&&keys[0]==='spot')return SPOTS.includes(o.spot as Spot)?{spot:o.spot as Spot}:null;
    if(keys.length===2&&finite(o.x)&&finite(o.y))return {x:o.x,y:o.y};
    return null;
}

export const savePosition=(kv:KvBackend,value:KeyboardPosition):Promise<void>=>kv.set(KEY,value);
