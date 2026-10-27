import type { HomeFrost } from './home';
import { REGION_IDS, type FrostBridge, type FrostFrame, type Prepared } from './types';

export interface FrostWarmup {requestId:string;frame:FrostFrame;ready:Promise<Prepared>}
export function frostAllocation(frame:FrostFrame):string {
    return JSON.stringify([frame.context,...REGION_IDS.map(id=>{
        const r=frame.regions[id];return [Math.ceil((r.width*frame.context.outputWidth+48)/4),Math.ceil((r.height*frame.context.outputHeight+48)/4)];
    })]);
}

export interface FrostClock {
    setInterval(callback:()=>void,ms:number):ReturnType<typeof setInterval>;
    clearInterval(timer:ReturnType<typeof setInterval>):void;
}
interface Session {
    generation:number; presented:boolean; signature?:string; frame?:FrostFrame;
    request?:string; token?:string; activating?:boolean; homeActive?:boolean;
    sequence:number; timer?:ReturnType<typeof setInterval>; renewing?:boolean;
}
export function createFrostController({bridge,home,clock=globalThis,takeWarmup}:{bridge:FrostBridge;home:HomeFrost|null;clock?:FrostClock;takeWarmup?:()=>FrostWarmup|null}) {
    const nonce=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let session:Session|undefined,attempt=0,disposed=false;
    const safely=(action:()=>Promise<unknown>)=>{try{return action().catch(()=>undefined);}catch{return Promise.resolve();}};
    function clear(s:Session):Promise<unknown> {
        if(s.timer!==undefined)clock.clearInterval(s.timer);s.timer=undefined;
        if(s.homeActive){s.homeActive=false;try{home?.clear();}catch{/* A retired document cannot interrupt lease cleanup. */}}
        const token=s.token,request=s.request;s.token=s.request=undefined;
        return Promise.all([...(token?[safely(()=>bridge.release(token))]:[]),...(request?[safely(()=>bridge.cancel(request))]:[])]);
    }
    const current=(s:Session,request:string)=>session===s&&s.request===request&&!disposed;
    function heartbeat(s:Session){
        s.timer=clock.setInterval(()=>{
            if(session!==s||!s.token||s.renewing)return;
            s.renewing=true;const token=s.token;
            void bridge.renew(token).catch(()=>false).then(ok=>{s.renewing=false;if(!ok&&session===s&&s.token===token)void clear(s);});
        },250);
    }
    function prepare(s:Session,frame:FrostFrame){
        const candidate=takeWarmup?.();
        const warmup=candidate&&candidate.frame.generation===s.generation&&frostAllocation(candidate.frame)===frostAllocation(frame)?candidate:null;
        if(candidate&&!warmup)void safely(()=>bridge.cancel(candidate.requestId));
        const request=warmup?.requestId??`${nonce}:${s.generation}:${++attempt}`;s.request=request;
        void safely(async()=>{
            if(bridge.present&&!s.presented&&!warmup){
                s.activating=true;
                const active=await bridge.present(request,frame);
                s.activating=false;
                if(active.status!=='active')return;
                if(!current(s,request)||s.presented){await safely(()=>bridge.release(active.token));return;}
                s.sequence=1;s.token=active.token;heartbeat(s);return;
            }
            const ready=await(warmup?.ready??bridge.prepare(request,frame));
            if(!current(s,request)||ready.status!=='ready'||s.presented)return;
            s.activating=true;
            const active=await bridge.activate(request,ready.key,++s.sequence,s.frame??frame);
            s.activating=false;
            if(active.status!=='active')return;
            if(!current(s,request)||s.presented){await safely(()=>bridge.release(active.token));return;}
            s.token=active.token;heartbeat(s);
        });
    }
    return {
        begin(generation:number){
            if(disposed)return;
            if(session)void clear(session);
            session={generation,presented:false,sequence:0};
        },
        frame(frame:FrostFrame|null){
            const s=session;if(!s||disposed||frame&&frame.generation!==s.generation)return;
            if(!frame){void clear(s);s.frame=undefined;s.signature=undefined;return;}
            const signature=frostAllocation(frame);
            if(s.signature&&s.signature!==signature)void clear(s);
            const changed=s.signature!==signature;s.signature=signature;s.frame=frame;
            if(frame.context.background==='steam'){
                if(s.homeActive||!s.presented)s.homeActive=home?.apply(frame)??false;
            }else if(s.token){
                const token=s.token,sequence=++s.sequence;
                void safely(async()=>{const ok=await bridge.update(token,sequence,frame);if(!ok&&session===s&&s.token===token&&s.sequence===sequence)await clear(s);});
            }else if(changed)prepare(s,frame);
        },
        presented(generation:number){
            const s=session;if(!s||s.generation!==generation)return;
            s.presented=true;
            // A warmup can finish with zero masks for a later opening. An
            // activation already in flight must be cancelled before it arrives.
            if(s.activating)void clear(s);
        },
        async end(generation:number){
            const s=session;if(!s||s.generation!==generation)return;
            session=undefined;await clear(s);
        },
        async dispose(){if(disposed)return;disposed=true;const s=session;session=undefined;if(s)await clear(s);try{home?.dispose();}catch{/* The document may already be gone. */}},
    };
}
