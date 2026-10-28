import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFrostController, frostAllocation } from '../../../src/menu/frost/controller';
import type { Activated, FrostBridge, FrostFrame, Prepared } from '../../../src/menu/frost/types';
function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};}
export function frame(generation=1,background:'game'|'steam'='game'):FrostFrame {
    return {generation,context:{viewportId:'v1',background,outputWidth:1920,outputHeight:1080,dpr:1,fit:'fit',colorMode:'sdr'},
        regions:Object.fromEntries(['bar','panel','notifications','status'].map(id=>[id,{x:.3,y:.1,width:.6,height:.1,radiusX:.01,radiusY:.01}])) as FrostFrame['regions']};
}
function fixture() {
    const bridge:FrostBridge={prepare:vi.fn(async()=>({status:'ready',key:'key'})),activate:vi.fn(async()=>({status:'active',token:'token'})),update:vi.fn(async()=>true),renew:vi.fn(async()=>true),release:vi.fn(async()=>{}),cancel:vi.fn(async()=>{})};
    const home={apply:vi.fn(()=>true),clear:vi.fn(),dispose:vi.fn()};
    return {bridge,home,controller:createFrostController({bridge,home})};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve();}
afterEach(()=>vi.useRealTimers());
describe('frost controller',()=>{
    it('arms frost with invisible masks before the reveal and activates it at the reveal',async()=>{
        const f=fixture();f.bridge.present=vi.fn(async()=>({status:'active',token:'combined'} as const));
        f.controller.begin(1);f.controller.frame(frame());let settled=false;void f.controller.settled(1).then(()=>{settled=true;});
        await flush();expect(f.bridge.prepare).toHaveBeenCalled();expect(f.bridge.present).not.toHaveBeenCalled();
        expect(f.bridge.activate).not.toHaveBeenCalled();expect(settled).toBe(true);
        f.controller.presented(1);expect(f.bridge.activate).toHaveBeenCalledWith(expect.any(String),'key',1,frame());
        await flush();await f.controller.end(1);expect(f.bridge.release).toHaveBeenCalledWith('token');
    });
    it('activates a matching early warmup at the reveal without preparing again',async()=>{
        const f=fixture(),warmFrame=frame(),ready=deferred<Prepared>();
        const controller=createFrostController({bridge:f.bridge,home:f.home,takeWarmup:()=>({requestId:'early-request',frame:warmFrame,ready:ready.promise})});
        controller.begin(1);controller.frame(frame());await flush();
        expect(f.bridge.prepare).not.toHaveBeenCalled();
        ready.resolve({status:'ready',key:'warm'});await flush();controller.presented(1);
        expect(f.bridge.activate).toHaveBeenCalledWith('early-request','warm',1,frame());await flush();await controller.dispose();
        expect(f.bridge.release).toHaveBeenCalledWith('token');
    });
    it('cancels mismatched early geometry and uses the live frame',async()=>{
        const f=fixture(),early=frame();early.regions.panel.width=.3;
        const controller=createFrostController({bridge:f.bridge,home:f.home,takeWarmup:()=>({requestId:'wrong',frame:early,ready:Promise.resolve({status:'ready',key:'old'})})});
        controller.begin(1);controller.frame(frame());await flush();
        expect(f.bridge.cancel).toHaveBeenCalledWith('wrong');expect(f.bridge.prepare).toHaveBeenCalled();await controller.dispose();
    });
    it('keeps glass when arming finishes after the reveal, so frost never appears late',async()=>{
        const f=fixture(),ready=deferred<Prepared>(); vi.mocked(f.bridge.prepare).mockReturnValue(ready.promise);
        f.controller.begin(1);f.controller.frame(frame());f.controller.presented(1);
        ready.resolve({status:'ready',key:'key'});await flush();expect(f.bridge.activate).not.toHaveBeenCalled();
        await f.controller.end(1);expect(f.bridge.cancel).toHaveBeenCalled();
    });
    it('releases activation that completes after close, without touching a new generation',async()=>{
        const f=fixture(),active=deferred<Activated>();vi.mocked(f.bridge.activate).mockReturnValueOnce(active.promise);
        f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);await f.controller.end(1);
        f.controller.begin(2);f.controller.frame(frame(2,'steam'));
        const clears=f.home.clear.mock.calls.length;
        active.resolve({status:'active',token:'old'});await flush();
        expect(f.bridge.release).toHaveBeenCalledWith('old');await f.controller.end(1);
        expect(f.home.clear.mock.calls.length).toBe(clears);expect(f.home.apply).toHaveBeenCalled();
        await f.controller.dispose();
    });
    it('activates once per reveal',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();
        f.controller.presented(1);f.controller.presented(1);await flush();expect(f.bridge.activate).toHaveBeenCalledTimes(1);await f.controller.dispose();
    });
    it('renews only an active lease every 250ms and clears on failed renewal',async()=>{
        vi.useFakeTimers();const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);
        await vi.advanceTimersByTimeAsync(249);expect(f.bridge.renew).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);expect(f.bridge.renew).toHaveBeenCalledWith('token');
        vi.mocked(f.bridge.renew).mockResolvedValue(false);await vi.advanceTimersByTimeAsync(250);
        expect(f.bridge.release).toHaveBeenCalledWith('token');const count=vi.mocked(f.bridge.renew).mock.calls.length;
        await vi.advanceTimersByTimeAsync(1000);expect(vi.mocked(f.bridge.renew).mock.calls.length).toBe(count);await f.controller.dispose();
    });
    it('clears invalid geometry, then brings this opening’s frost back once the menu is measured again',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);await flush();
        f.controller.frame(null);expect(f.bridge.release).toHaveBeenCalledWith('token');
        f.controller.frame(frame());await flush();expect(f.bridge.activate).toHaveBeenCalledTimes(2);
        await f.controller.dispose();expect(f.bridge.release).toHaveBeenCalledTimes(2);
    });
    it('keeps frost when the bell widens for a live notification count',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);await flush();
        // The geometry observer publishes null, then the new size.
        const wider=frame();wider.regions.notifications.width=.15;
        f.controller.frame(null);f.controller.frame(wider);await flush();
        expect(f.bridge.prepare).toHaveBeenLastCalledWith(expect.any(String),wider);
        expect(f.bridge.activate).toHaveBeenLastCalledWith(expect.any(String),'key',expect.any(Number),wider);
        await f.controller.dispose();
    });
    it('does not bring frost back into an opening that never had it',async()=>{
        const f=fixture(),ready=deferred<Prepared>();vi.mocked(f.bridge.prepare).mockReturnValueOnce(ready.promise);
        f.controller.begin(1);f.controller.frame(frame());f.controller.presented(1);
        ready.resolve({status:'ready',key:'key'});await flush();
        f.controller.frame(null);f.controller.frame(frame());await flush();
        expect(f.bridge.activate).not.toHaveBeenCalled();await f.controller.dispose();
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
        const f=fixture(),old=deferred<boolean>();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);await flush();
        vi.mocked(f.bridge.update).mockReturnValueOnce(old.promise);
        const first=frame();first.regions.bar.x=.29;f.controller.frame(first);
        const second=frame();second.regions.bar.x=.28;f.controller.frame(second);await flush();
        old.resolve(false);await flush();expect(f.bridge.release).not.toHaveBeenCalled();await f.controller.dispose();
    });
    it('clears an old allocation before preparing a different size',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame());await flush();f.controller.presented(1);await flush();
        const resized=frame();resized.regions.panel.width=.5;f.controller.frame(resized);
        expect(f.bridge.release).toHaveBeenCalledWith('token');expect(f.bridge.prepare).toHaveBeenCalledTimes(2);
        await flush();await f.controller.dispose();
    });
    it('holds the reveal until frost is armed',async()=>{
        const f=fixture(),ready=deferred<Prepared>();vi.mocked(f.bridge.prepare).mockReturnValue(ready.promise);
        f.controller.begin(1);f.controller.frame(frame());let settled=false;void f.controller.settled(1).then(()=>{settled=true;});
        await flush();expect(settled).toBe(false);
        ready.resolve({status:'ready',key:'key'});await flush();expect(settled).toBe(true);expect(f.bridge.activate).not.toHaveBeenCalled();
        f.controller.presented(1);expect(f.bridge.cancel).not.toHaveBeenCalled();expect(f.bridge.activate).toHaveBeenCalled();
        await f.controller.dispose();
    });
    it('settles the reveal hold on unavailable frost and on end',async()=>{
        const f=fixture();vi.mocked(f.bridge.prepare).mockResolvedValue({status:'unavailable',reason:'unsupported'});
        f.controller.begin(1);f.controller.frame(frame());await expect(f.controller.settled(1)).resolves.toBeUndefined();
        const g=fixture();vi.mocked(g.bridge.prepare).mockReturnValue(new Promise<Prepared>(()=>{}));
        g.controller.begin(1);g.controller.frame(frame());const held=g.controller.settled(1);await g.controller.end(1);
        await expect(held).resolves.toBeUndefined();await f.controller.dispose();
    });
    it('settles immediately for Home frost, unknown generations and explicitly unavailable context',async()=>{
        const f=fixture();f.controller.begin(1);f.controller.frame(frame(1,'steam'));
        await expect(f.controller.settled(1)).resolves.toBeUndefined();await expect(f.controller.settled(9)).resolves.toBeUndefined();
        f.controller.begin(2);const held=f.controller.settled(2);f.controller.unavailable(2);await expect(held).resolves.toBeUndefined();
        await f.controller.dispose();
    });
    it('keeps holding when geometry changes while the first arming is pending',async()=>{
        const f=fixture(),first=deferred<Prepared>(),second=deferred<Prepared>();
        vi.mocked(f.bridge.prepare).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        f.controller.begin(1);f.controller.frame(frame());let settled=false;void f.controller.settled(1).then(()=>{settled=true;});
        const resized=frame();resized.regions.panel.width=.5;f.controller.frame(resized);
        first.resolve({status:'unavailable',reason:'cancelled'});await flush();expect(settled).toBe(false);
        second.resolve({status:'ready',key:'resized'});await flush();expect(settled).toBe(true);await f.controller.dispose();
    });
});

describe('frost shader allocation',()=>{
    // Mirrors py_modules/gameglance/frost/shader.py frost_geometry(): pad = ceil(3 * 16 * dpr),
    // tile = ceil((size + 2 * pad) / 8). Equal allocations must mean an equal shader.
    const at=(dpr:number,width=.6)=>{const f=frame();f.context.dpr=dpr;f.regions.panel.width=width;return f;};
    it('rounds like the backend tile sizes',()=>{
        const tiles=JSON.parse(frostAllocation(at(2.32))).slice(1);
        expect(tiles[1]).toEqual([Math.ceil((.6*1920+2*112)/8),Math.ceil((.1*1080+2*112)/8)]);
    });
    it('ignores sub-texel geometry jitter but not a display scale change',()=>{
        expect(frostAllocation(at(2.32,.601))).toBe(frostAllocation(at(2.32,.601+1/1920)));
        expect(frostAllocation(at(2.32))).not.toBe(frostAllocation(at(1)));
    });
});
