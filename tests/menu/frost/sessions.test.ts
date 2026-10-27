import { describe,expect,it,vi } from 'vitest';
import { createFrostSessions } from '../../../src/menu/frost/sessions';
import type { FrostBridge,FrostFrame } from '../../../src/menu/frost/types';
const frame:FrostFrame={generation:1,context:{viewportId:'v1',background:'game',outputWidth:1920,outputHeight:1080,dpr:1,fit:'fit',colorMode:'sdr'},regions:Object.fromEntries(['bar','panel','notifications'].map(id=>[id,{x:.3,y:.1,width:.6,height:.1,radiusX:.01,radiusY:.01}])) as FrostFrame['regions']};
function fixture(){
    const tasks:(()=>void)[]=[],bridge:FrostBridge={prepare:vi.fn(async()=>({status:'ready',key:'key'})),activate:vi.fn(async()=>({status:'active',token:'token'})),update:vi.fn(async()=>true),renew:vi.fn(async()=>true),release:vi.fn(async()=>{}),cancel:vi.fn(async()=>{})};
    const sessions=createFrostSessions(bridge,fn=>{tasks.push(fn);});
    return {bridge,sessions,flush:()=>{for(const fn of tasks.splice(0))fn();}};
}
describe('native input frost sessions',()=>{
    it('does no cross-window surface work inside a native input callback',()=>{
        const f=fixture();let insideInput=true;
        const surface={setFrostSession:vi.fn(()=>{if(insideInput)throw Error('reentrant window access');}),clearFrost:vi.fn(async()=>{})};
        f.sessions.attach(surface);f.sessions.remember(frame);f.sessions.setFrostSession({generation:2,enabled:true});
        expect(surface.setFrostSession).not.toHaveBeenCalled();expect(f.bridge.prepare).toHaveBeenCalled();
        insideInput=false;f.flush();expect(surface.setFrostSession).toHaveBeenCalledWith({generation:2,enabled:true});f.sessions.dispose();
    });
    it('defers surface clearing, cancels warmup immediately, and ignores retired surfaces',async()=>{
        const f=fixture(),old={setFrostSession:vi.fn(),clearFrost:vi.fn(async()=>{})},next={setFrostSession:vi.fn(),clearFrost:vi.fn(async()=>{})};
        f.sessions.attach(old);f.sessions.remember(frame);f.sessions.setFrostSession({generation:2,enabled:true});
        const pending=f.sessions.clearFrost(2);expect(f.bridge.cancel).toHaveBeenCalled();expect(old.clearFrost).not.toHaveBeenCalled();
        f.sessions.attach(next);f.flush();await pending;expect(old.clearFrost).not.toHaveBeenCalled();expect(next.clearFrost).not.toHaveBeenCalled();f.sessions.dispose();
    });
    it('hands a warmup to exactly one controller and cancels only the matching generation',async()=>{
        const f=fixture();f.sessions.remember(frame);f.sessions.setFrostSession({generation:2,enabled:true});
        const warmup=f.sessions.takeWarmup()!;expect(warmup.frame.generation).toBe(2);expect(f.sessions.takeWarmup()).toBeNull();
        f.sessions.setFrostSession({generation:3,enabled:true});const newer=f.sessions.current();
        await f.sessions.clearFrost(2);expect(f.sessions.current()).toBe(newer);f.sessions.dispose();
    });
});
