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

const clampInto=(pos:Point,view:Rect,size:Size):Point=>({
    x:clampTo(pos.x,view.x,Math.max(view.x,view.x+view.width-size.width)),
    y:clampTo(pos.y,view.y,Math.max(view.y,view.y+view.height-size.height)),
});

/** Where a drag puts the panel: `from` moved by the pointer's screen delta in menu units, kept inside the view. Clearing
 * the field waits for the release (`settle`). */
export const dragPosition=(from:Point,delta:Point,scale:number,view:Rect,size:Size):Point=>
    clampInto({x:from.x+delta.x/scale,y:from.y+delta.y/scale},view,size);

// Clamps into the view, then slides clear of the field by the shortest move that stays in view.
export function settle(pos:Point,view:Rect,field:Rect,size:Size):Point {
    const p=clampInto(pos,view,size);
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

/** Never rejects: a position that could not be stored is simply not remembered. */
export async function savePosition(kv:KvBackend,value:KeyboardPosition):Promise<void> {
    try{await kv.set(KEY,value);}catch{/* not remembered */}
}

/** The candidates whose rectangle overlaps the keyboard's (touching edges do not count). */
export const underKeyboard=<T,>(keyboard:Rect,candidates:{el:T;rect:Rect}[]):T[]=>
    candidates.filter(({rect:r})=>r.x<keyboard.x+keyboard.width&&r.x+r.width>keyboard.x&&r.y<keyboard.y+keyboard.height&&r.y+r.height>keyboard.y).map(c=>c.el);

/** Social columns the keyboard can cover; the menu's shader frost cannot blur them, so CSS blurs them instead. */
export const UNDER_SELECTOR='.gg-social-friend-list, .gg-social-timeline';
export const UNDER_CLASS='gg-keyboard-under';

/** Marks the columns under the panel with the blur class; the returned function clears them all. */
export const markUnderKeyboard=(root:ParentNode,panel:Element):(()=>void)=>{
    const els=[...root.querySelectorAll<HTMLElement>(UNDER_SELECTOR)];
    const hit=underKeyboard(panel.getBoundingClientRect(),els.map(el=>({el,rect:el.getBoundingClientRect()})));
    for(const el of els)el.classList.toggle(UNDER_CLASS,hit.includes(el));
    return ()=>{for(const el of els)el.classList.remove(UNDER_CLASS);};
};

type WatchView={
    requestAnimationFrame(cb:()=>void):number;
    cancelAnimationFrame(id:number):void;
    ResizeObserver?:new(cb:()=>void)=>{observe(el:Element):void;disconnect():void};
};

/** Marks the columns under the panel now, again on the next frame (the final geometry may land after the first mark)
 * and whenever the panel or a column resizes. Classes are only touched when the covered set changes, so the blur
 * does not restart on every move. The returned function stops watching and clears every mark. */
export const watchUnderKeyboard=(root:ParentNode,panel:Element,view:WatchView):(()=>void)=>{
    const els=[...root.querySelectorAll<HTMLElement>(UNDER_SELECTOR)];
    let last:string|null=null;
    const mark=()=>{
        const hit=underKeyboard(panel.getBoundingClientRect(),els.map(el=>({el,rect:el.getBoundingClientRect()})));
        const key=els.map(el=>hit.includes(el)?'1':'0').join('');
        if(key===last)return;
        last=key;
        for(const el of els)el.classList.toggle(UNDER_CLASS,hit.includes(el));
    };
    mark();
    const frame=view.requestAnimationFrame(mark);
    const observer=view.ResizeObserver?new view.ResizeObserver(mark):null;
    if(observer){observer.observe(panel);for(const el of els)observer.observe(el);}
    return ()=>{
        view.cancelAnimationFrame(frame);
        observer?.disconnect();
        for(const el of els)el.classList.remove(UNDER_CLASS);
    };
};
