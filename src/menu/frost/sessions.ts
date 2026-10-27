import type { HostAttachment } from '../steam/runtime';
import type { FrostWarmup } from './controller';
import type { FrostBridge,FrostFrame,NativeFrostEnvironment } from './types';

type Session=Parameters<NonNullable<HostAttachment['setFrostSession']>>[0];
type Surface=Required<Pick<HostAttachment,'setFrostSession'|'clearFrost'>>;

/** Native input callbacks may be synchronous cross-context calls. This manager
 * uses only cached plain data there; every surface operation runs in a later
 * task, after the originating native call has returned. */
export function createFrostSessions(bridge:FrostBridge,schedule:(callback:()=>void)=>void=fn=>{setTimeout(fn,0);}) {
    let session:Session=null,surface:Surface|null=null,cachedFrame:FrostFrame|undefined,warmup:FrostWarmup|null=null,disposed=false;
    let environment:NativeFrostEnvironment|null=null,warming=false;
    const safe=(fn:()=>Promise<unknown>)=>{try{return fn().catch(()=>undefined);}catch{return Promise.resolve();}};
    return {
        current:()=>session,
        environment:()=>environment,
        /** Starts the backend worker and caches its environment before the first
         * press, so a cold opening measures at once instead of after the worker
         * spawns. Runs in a later task, like every other surface operation. */
        warm(){
            if(disposed||warming||!bridge.environment)return;warming=true;
            schedule(()=>{
                if(disposed){warming=false;return;}
                void bridge.environment!().then(value=>{warming=false;if(value&&!disposed)environment=value;},()=>{warming=false;});
            });
        },
        attach(value:Surface|null){surface=value;},
        remember(frame:FrostFrame){if(!disposed)cachedFrame=frame;},
        takeWarmup(){const value=warmup;warmup=null;return value;},
        setFrostSession(value:Session){
            if(disposed)return;
            if(warmup)void safe(()=>bridge.cancel(warmup!.requestId));
            warmup=null;session=value;
            if(value?.enabled&&cachedFrame?.context.background==='game'){
                const frame={...cachedFrame,generation:value.generation};
                const nonce=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const requestId=`early:${nonce}:${value.generation}`;
                warmup={requestId,frame,ready:bridge.prepare(requestId,frame).catch(()=>({status:'unavailable',reason:'connection'}))};
            }
            const target=surface;
            if(target)schedule(()=>{if(!disposed&&surface===target&&session===value){try{target.setFrostSession(value);}catch{/* Frost stays optional. */}}});
        },
        async clearFrost(generation:number){
            const previous=warmup?.frame.generation===generation?warmup:null;
            if(previous)warmup=null;
            if(session?.generation===generation)session=null;
            const target=surface;
            const cleared=target?new Promise<void>(resolve=>schedule(()=>{
                if(disposed||surface!==target){resolve();return;}
                void safe(()=>target.clearFrost(generation)).then(()=>resolve());
            })):Promise.resolve();
            await Promise.all([...(previous?[safe(()=>bridge.cancel(previous.requestId))]:[]),cleared]);
        },
        dispose(){
            if(disposed)return;disposed=true;
            const previous=warmup;warmup=null;session=null;surface=null;cachedFrame=undefined;
            if(previous)void safe(()=>bridge.cancel(previous.requestId));
        },
    };
}
