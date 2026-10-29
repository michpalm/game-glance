import type { HomeFrost } from './home';
import { REGION_IDS, type FrostBridge, type FrostFrame, type Prepared } from './types';

export interface FrostWarmup {requestId:string;frame:FrostFrame;ready:Promise<Prepared>}
/** The status bar's tile width, as a share of the screen: its width follows its content, so its tile is sized to this
 * cap (wider than the full pill) and a change in content never rebuilds the shader. Same value in shader.py. */
export const STATUS_TILE_WIDTH = .4;
/** Mirrors frost_geometry() in py_modules/gameglance/frost/shader.py: equal allocations build an equal shader. */
export function frostAllocation(frame:FrostFrame):string {
    const pad=Math.ceil(3*16*frame.context.dpr);
    return JSON.stringify([frame.context,...REGION_IDS.map(id=>{
        const r=frame.regions[id],width=id==='status'?Math.max(r.width,STATUS_TILE_WIDTH):r.width;
        return [Math.ceil((width*frame.context.outputWidth+2*pad)/8),Math.ceil((r.height*frame.context.outputHeight+2*pad)/8)];
    })]);
}

export interface FrostClock {
    setInterval(callback:()=>void,ms:number):ReturnType<typeof setInterval>;
    clearInterval(timer:ReturnType<typeof setInterval>):void;
}
interface Session {
    generation:number; presented:boolean; signature?:string; frame?:FrostFrame;
    request?:string; key?:string; token?:string; activating?:boolean; homeActive?:boolean;
    /** This opening showed frost; a re-measure (a resize, the live bell count) may bring it back. */
    hadFrost?:boolean;
    sequence:number; timer?:ReturnType<typeof setInterval>; renewing?:boolean;
    settled?:boolean; waiters:(()=>void)[];
}
export function createFrostController({bridge,home,clock=globalThis,takeWarmup}:{bridge:FrostBridge;home:HomeFrost|null;clock?:FrostClock;takeWarmup?:()=>FrostWarmup|null}) {
    const nonce=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let session:Session|undefined,attempt=0,disposed=false;
    const safely=(action:()=>Promise<unknown>)=>{try{return action().catch(()=>undefined);}catch{return Promise.resolve();}};
    function clear(s:Session):Promise<unknown> {
        if(s.timer!==undefined)clock.clearInterval(s.timer);s.timer=undefined;
        if(s.homeActive){s.homeActive=false;try{home?.clear();}catch{/* A retired document cannot interrupt lease cleanup. */}}
        const token=s.token,request=s.request;s.token=s.request=s.key=undefined;
        return Promise.all([...(token?[safely(()=>bridge.release(token))]:[]),...(request?[safely(()=>bridge.cancel(request))]:[])]);
    }
    const current=(s:Session,request:string)=>session===s&&s.request===request&&!disposed;
    // The reveal hold waits for an outcome (active, unavailable, Home, end), never a timer.
    function settle(s:Session){if(s.settled)return;s.settled=true;for(const resolve of s.waiters.splice(0))resolve();}
    function heartbeat(s:Session){
        s.timer=clock.setInterval(()=>{
            if(session!==s||!s.token||s.renewing)return;
            s.renewing=true;const token=s.token;
            void bridge.renew(token).catch(()=>false).then(ok=>{s.renewing=false;if(!ok&&session===s&&s.token===token)void clear(s);});
        },250);
    }
    /** Arms the effect with zero masks; the reveal activates it (see presented). */
    function prepare(s:Session,frame:FrostFrame){
        const candidate=takeWarmup?.();
        const warmup=candidate&&candidate.frame.generation===s.generation&&frostAllocation(candidate.frame)===frostAllocation(frame)?candidate:null;
        if(candidate&&!warmup)void safely(()=>bridge.cancel(candidate.requestId));
        const request=warmup?.requestId??`${nonce}:${s.generation}:${++attempt}`;s.request=request;
        void safely(async()=>{
            const ready=await(warmup?.ready??bridge.prepare(request,frame));
            // Armed after the reveal is too late for a first start: frost never
            // appears late. Frost this opening already showed comes back, fading in.
            if(!current(s,request)||ready.status!=='ready'||s.presented&&!s.hadFrost)return;
            s.key=ready.key;
            if(s.presented)activate(s);
        }).then(()=>{if(s.request===request||!s.request)settle(s);});
    }
    /** New geometry for the live effect (same shader); a rejected update clears it. */
    function update(s:Session,frame:FrostFrame){
        const token=s.token!,sequence=++s.sequence;
        void safely(async()=>{const ok=await bridge.update(token,sequence,frame);if(!ok&&session===s&&s.token===token&&s.sequence===sequence)await clear(s);});
    }
    // Masks go live with the reveal; the shader then fades them in over the
    // same 150 ms as the menu, from the first frame they are visible.
    function activate(s:Session){
        const request=s.request,key=s.key,frame=s.frame;
        if(!request||!key||!frame||s.activating||s.token)return;
        s.activating=true;
        void safely(async()=>{
            const active=await bridge.activate(request,key,++s.sequence,frame);
            s.activating=false;
            if(active.status!=='active')return;
            if(!current(s,request)){await safely(()=>bridge.release(active.token));return;}
            s.token=active.token;s.hadFrost=true;heartbeat(s);
            // The geometry moved on while this was in flight (same shader, e.g. the status bar filling in): send it now.
            if(s.frame&&s.frame!==frame)update(s,s.frame);
        });
    }
    return {
        begin(generation:number){
            if(disposed)return;
            if(session){settle(session);void clear(session);}
            session={generation,presented:false,sequence:0,waiters:[]};
        },
        frame(frame:FrostFrame|null){
            const s=session;if(!s||disposed||frame&&frame.generation!==s.generation)return;
            if(!frame){void clear(s);s.frame=undefined;s.signature=undefined;return;}
            const signature=frostAllocation(frame);
            if(s.signature&&s.signature!==signature)void clear(s);
            const changed=s.signature!==signature;s.signature=signature;s.frame=frame;
            if(frame.context.background==='steam'){
                if(s.homeActive||!s.presented)s.homeActive=home?.apply(frame)??false;
                settle(s);
            }else if(s.token)update(s,frame);
            else if(changed)prepare(s,frame);
        },
        presented(generation:number){
            const s=session;if(!s||s.generation!==generation)return;
            s.presented=true;settle(s);
            activate(s);
        },
        async end(generation:number){
            const s=session;if(!s||s.generation!==generation)return;
            session=undefined;settle(s);await clear(s);
        },
        /** Resolves when this opening's frost has an outcome; the presentation caps the wait. */
        settled(generation:number):Promise<void>{
            const s=session;if(disposed||!s||s.generation!==generation||s.settled)return Promise.resolve();
            return new Promise(resolve=>s.waiters.push(resolve));
        },
        unavailable(generation:number){const s=session;if(s&&s.generation===generation)settle(s);},
        async dispose(){if(disposed)return;disposed=true;const s=session;session=undefined;if(s){settle(s);await clear(s);}try{home?.dispose();}catch{/* The document may already be gone. */}},
    };
}
