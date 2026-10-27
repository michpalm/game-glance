import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFrostController } from '../../../src/menu/frost/controller';
import type { Activated, FrostBridge, FrostFrame, Prepared } from '../../../src/menu/frost/types';
function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};}
export function frame(generation=1,background:'game'|'steam'='game'):FrostFrame {
    return {generation,context:{viewportId:'v1',background,outputWidth:1920,outputHeight:1080,dpr:1,fit:'fit',colorMode:'sdr'},
        regions:Object.fromEntries(['bar','panel','notifications'].map(id=>[id,{x:.3,y:.1,width:.6,height:.1,radiusX:.01,radiusY:.01}])) as FrostFrame['regions']};
}
function fixture() {
    const bridge:FrostBridge={prepare:vi.fn(async()=>({status:'ready',key:'key'})),activate:vi.fn(async()=>({status:'active',token:'token'})),update:vi.fn(async()=>true),renew:vi.fn(async()=>true),release:vi.fn(async()=>{}),cancel:vi.fn(async()=>{})};
    const home={apply:vi.fn(()=>true),clear:vi.fn(),dispose:vi.fn()};
    return {bridge,home,controller:createFrostController({bridge,home})};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve();}
afterEach(()=>vi.useRealTimers());
describe('frost controller',()=>{
    it('uses combined presentation when available and cancels it at a missed visibility deadline',async()=>{
        const f=fixture(),active=deferred<Activated>();
        f.bridge.present=vi.fn(()=>active.promise);
        f.controller.begin(1);f.controller.frame(frame());
        expect(f.bridge.present).toHaveBeenCalled();expect(f.bridge.prepare).not.toHaveBeenCalled();
        f.controller.presented(1);expect(f.bridge.cancel).toHaveBeenCalled();
        active.resolve({status:'active',token:'late'});await flush();expect(f.bridge.release).toHaveBeenCalledWith('late');await f.controller.dispose();
    });
    it('renews and releases an on-time combined presentation without a second activation call',async()=>{
        vi.useFakeTimers();const f=fixture();f.bridge.present=vi.fn(async()=>({status:'active',token:'combined'}));
        f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);
        expect(f.bridge.activate).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(250);
        expect(f.bridge.renew).toHaveBeenCalledWith('combined');await f.controller.end(1);
        expect(f.bridge.release).toHaveBeenCalledWith('combined');
    });
    it('queues live presentation on a matching early warmup before its ready acknowledgement',async()=>{
        const f=fixture(),warmFrame=frame(),ready=deferred<Prepared>();
        const controller=createFrostController({bridge:f.bridge,home:f.home,takeWarmup:()=>({requestId:'early-request',frame:warmFrame,ready:ready.promise})});
        f.bridge.present=vi.fn(async()=>({status:'active',token:'queued'}));
        controller.begin(1);controller.frame(frame());await flush();
        expect(f.bridge.prepare).not.toHaveBeenCalled();expect(f.bridge.activate).not.toHaveBeenCalled();
        expect(f.bridge.present).toHaveBeenCalledWith('early-request',frame());await controller.dispose();
        expect(f.bridge.release).toHaveBeenCalledWith('queued');
    });
    it('cancels mismatched early geometry and uses the live frame',async()=>{
        const f=fixture(),early=frame();early.regions.panel.width=.3;
        const controller=createFrostController({bridge:f.bridge,home:f.home,takeWarmup:()=>({requestId:'wrong',frame:early,ready:Promise.resolve({status:'ready',key:'old'})})});
        controller.begin(1);controller.frame(frame());await flush();
        expect(f.bridge.cancel).toHaveBeenCalledWith('wrong');expect(f.bridge.prepare).toHaveBeenCalled();await controller.dispose();
    });
    it('keeps glass when preparation arrives after presentation, allowing later cache warmup',async()=>{
        const f=fixture(),ready=deferred<Prepared>(); vi.mocked(f.bridge.prepare).mockReturnValue(ready.promise);
        f.controller.begin(1);f.controller.frame(frame());f.controller.presented(1);
        expect(f.bridge.cancel).not.toHaveBeenCalled();
        ready.resolve({status:'ready',key:'key'});await flush();expect(f.bridge.activate).not.toHaveBeenCalled();
        await f.controller.end(1);expect(f.bridge.cancel).toHaveBeenCalled();
    });
    it('releases activation that completes after close, without touching a new generation',async()=>{
        const f=fixture(),active=deferred<Activated>();vi.mocked(f.bridge.activate).mockReturnValueOnce(active.promise);
        f.controller.begin(1);f.controller.frame(frame());await flush();await f.controller.end(1);
        f.controller.begin(2);f.controller.frame(frame(2,'steam'));
        const clears=f.home.clear.mock.calls.length;
        active.resolve({status:'active',token:'old'});await flush();
        expect(f.bridge.release).toHaveBeenCalledWith('old');await f.controller.end(1);
        expect(f.home.clear.mock.calls.length).toBe(clears);expect(f.home.apply).toHaveBeenCalled();
        await f.controller.dispose();
    });
    it('cancels activation missing the visibility deadline and releases its late token',async()=>{
        const f=fixture(),active=deferred<Activated>();vi.mocked(f.bridge.activate).mockReturnValue(active.promise);
        f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);
        expect(f.bridge.cancel).toHaveBeenCalled();active.resolve({status:'active',token:'late'});await flush();
        expect(f.bridge.release).toHaveBeenCalledWith('late');await f.controller.dispose();
    });
    it('renews only an active lease every 250ms and clears on failed renewal',async()=>{
        vi.useFakeTimers();const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);
        await vi.advanceTimersByTimeAsync(249);expect(f.bridge.renew).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);expect(f.bridge.renew).toHaveBeenCalledWith('token');
        vi.mocked(f.bridge.renew).mockResolvedValue(false);await vi.advanceTimersByTimeAsync(250);
        expect(f.bridge.release).toHaveBeenCalledWith('token');const count=vi.mocked(f.bridge.renew).mock.calls.length;
        await vi.advanceTimersByTimeAsync(1000);expect(vi.mocked(f.bridge.renew).mock.calls.length).toBe(count);await f.controller.dispose();
    });
    it('clears invalid geometry and does not introduce replacement frost into a visible presentation',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);
        f.controller.frame(null);expect(f.bridge.release).toHaveBeenCalledWith('token');
        f.controller.frame(frame());await flush();expect(f.bridge.activate).toHaveBeenCalledTimes(1);await f.controller.dispose();
    });
    it('clears the old adapter before a context switch and tolerates bridge errors',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame(1,'steam'));
        vi.mocked(f.bridge.prepare).mockRejectedValue(Error('offline'));f.controller.frame(frame());await flush();
        expect(f.home.clear).toHaveBeenCalled();await f.controller.dispose();
    });
    it('still cancels resources when a detached Home surface throws during cleanup',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame(1,'steam'));
        f.home.clear.mockImplementation(()=>{throw Error('detached document');});
        expect(()=>f.controller.frame(frame())).not.toThrow();await flush();
        await expect(f.controller.dispose()).resolves.toBeUndefined();
    });
    it('does not drop a current lease when an older update is rejected as stale',async()=>{
        const f=fixture(),old=deferred<boolean>();f.controller.begin(1);f.controller.frame(frame());await flush();
        vi.mocked(f.bridge.update).mockReturnValueOnce(old.promise);
        const first=frame();first.regions.bar.x=.29;f.controller.frame(first);
        const second=frame();second.regions.bar.x=.28;f.controller.frame(second);await flush();
        old.resolve(false);await flush();expect(f.bridge.release).not.toHaveBeenCalled();await f.controller.dispose();
    });
    it('clears an old allocation before preparing a different size',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();
        const resized=frame();resized.regions.panel.width=.5;f.controller.frame(resized);
        expect(f.bridge.release).toHaveBeenCalledWith('token');expect(f.bridge.prepare).toHaveBeenCalledTimes(2);
        await flush();await f.controller.dispose();
    });
});
