import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMenuCoordinator } from '../../../src/menu/coordinator';
import { defaultMenuState, reduceMenu } from '../../../src/menu/model';
import type { HostAttachment, IntentHandlers, NativeBindings } from '../../../src/menu/steam/runtime';
function fixture(){
    let state=reduceMenu(defaultMenuState(),{type:'enable',value:true}),handlers!:IntentHandlers,game!:(value:never)=>void;
    const order:string[]=[],sessions:{generation:number;enabled:boolean}[]=[];
    const host:HostAttachment={present:async()=>{order.push('present');},setFrostSession:s=>{if(s)sessions.push(s);},clearFrost:vi.fn(async()=>{order.push('clear');}),
        close:()=>{order.push('close');},suspend:()=>{order.push('suspend');},dispose:()=>{order.push('dispose');}};
    const bindings:NativeBindings={capabilities:new Set(),attachHost:()=>host,showMenuHost(){},closeMenuHost(){},openNative:async()=>{order.push('native');},
        subscribeGame:fn=>{game=fn;return()=>{};},installIntentHandlers:h=>{handlers=h;return()=>{};}};
    const coordinator=createMenuCoordinator({bindings,getState:()=>state,dispatch:e=>{state=reduceMenu(state,e);},render:()=>null});
    const stop=coordinator.start();return {coordinator,host,order,sessions,stop,handlers:()=>handlers,game};
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
afterEach(()=>vi.useRealTimers());
describe('menu frost integration',()=>{
    it('enables frost for both the Home and QAM entries and clears it before close and native handoff',async()=>{
        const f=fixture();await f.coordinator.open('home');expect(f.sessions.at(-1)?.enabled).toBe(true);
        await f.coordinator.open('quick-access');expect(f.sessions.at(-1)?.enabled).toBe(true);
        f.order.length=0;f.coordinator.close();await flush();expect(f.order.indexOf('clear')).toBeLessThan(f.order.indexOf('close'));
        await f.coordinator.open('quick-access');f.order.length=0;await f.coordinator.handoff({kind:'qam',tab:'decky'});
        expect(f.order).toEqual(['clear','suspend','native']);f.stop();
    });
    it('bounds lost cleanup acknowledgement to 100ms and cannot close a newer generation',async()=>{
        vi.useFakeTimers();const f=fixture();f.host.clearFrost=()=>new Promise(()=>{});
        await f.coordinator.open('quick-access');f.coordinator.close();await vi.advanceTimersByTimeAsync(99);expect(f.order).not.toContain('close');
        await f.coordinator.open('quick-access');await vi.advanceTimersByTimeAsync(1);expect(f.order).not.toContain('close');f.stop();
    });
    it('clears on unexpected native close, suspension and disposal even when bridge cleanup rejects',async()=>{
        const f=fixture();f.host.clearFrost=vi.fn(async()=>{throw Error('offline');});
        await f.coordinator.open('quick-access');f.handlers().closed();expect(f.host.clearFrost).toHaveBeenCalled();
        await f.coordinator.open('quick-access');f.handlers().suspended(true);f.stop();await flush();expect(f.order).toContain('dispose');
    });
    it('invalidates the frost generation on game change and clears before plugin disposal',async()=>{
        const f=fixture();await f.coordinator.open('quick-access');const old=f.sessions.at(-1)!.generation;
        f.game({appId:7,gameId:'7',name:'',kind:'local',actionIds:[]} as never);
        expect(f.sessions.at(-1)!.generation).toBeGreaterThan(old);expect(f.host.clearFrost).toHaveBeenCalledWith(old);
        f.order.length=0;f.stop();expect(f.order.indexOf('clear')).toBeLessThan(f.order.indexOf('dispose'));
    });
    it('keeps the menu available if adapter setup throws',async()=>{
        const f=fixture();f.host.setFrostSession=()=>{throw Error('unsupported backdrop');};
        await f.coordinator.open('quick-access');expect(f.order).toContain('present');f.stop();
    });
});
