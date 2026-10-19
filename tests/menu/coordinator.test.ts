import { describe, expect, it, vi } from 'vitest';
import { createMenuCoordinator } from '../../src/menu/coordinator';
import { defaultMenuState, reduceMenu, type MenuEvent } from '../../src/menu/model';
import type { IntentHandlers, NativeBindings } from '../../src/menu/steam/runtime';
function harness(){
    let state=reduceMenu(defaultMenuState(),{type:'enable',value:true});let handlers!:IntentHandlers;const order:string[]=[];
    const host={present:vi.fn(async()=>{order.push('present');}),suspend:vi.fn(()=>order.push('suspend')),close:vi.fn(),dispose:vi.fn()};
    const releaseHooks=vi.fn(),releaseGame=vi.fn(),replay=vi.fn();
    const bindings:NativeBindings={capabilities:new Set(['host']),attachHost:()=>host,showMenuHost:vi.fn(),closeMenuHost:vi.fn(),subscribeGame:()=>releaseGame,openNative:vi.fn(async()=>{order.push('native');}),installIntentHandlers:h=>{handlers=h;return releaseHooks;}};
    const c=createMenuCoordinator({bindings,getState:()=>state,dispatch:(e:MenuEvent)=>{state=reduceMenu(state,e);},render:()=>null});
    return {c,bindings,host,order,releaseHooks,releaseGame,replay,state:()=>state,handlers:()=>handlers,disable:()=>{state=reduceMenu(state,{type:'enable',value:false});}};
}
describe('floating menu coordinator',()=>{
    it('opens and toggles the custom host, preserving native handoff ordering',async()=>{
        const h=harness(),stop=h.c.start();await h.c.open('home');expect(h.state().phase).toBe('custom-open');
        await h.c.open('quick-access');expect(h.state().section).toBe('quick-settings');
        await h.c.handoff({kind:'qam',tab:'decky'});expect(h.order.slice(-2)).toEqual(['suspend','native']);expect(h.state().phase).toBe('native-handoff');
        await h.c.open('home');expect(h.state().phase).toBe('custom-open');await h.c.open('home');expect(h.state().phase).toBe('closed');stop();
    });
    it('replays a native open once after rejected mount and leaves no active custom tree',async()=>{
        const h=harness();h.host.present.mockRejectedValue(Error('shape changed'));const stop=h.c.start();
        h.handlers().open('home',h.replay);await vi.waitFor(()=>expect(h.replay).toHaveBeenCalledTimes(1));
        expect(h.state().phase).toBe('failed');expect(h.host.close).toHaveBeenCalled();stop();
    });
    it('releases every acquired resource when hook installation throws',()=>{
        const h=harness();h.bindings.installIntentHandlers=()=>{throw Error('hook changed');};
        expect(()=>h.c.start()).toThrow('hook changed');expect(h.releaseGame).toHaveBeenCalledTimes(1);expect(h.host.dispose).toHaveBeenCalledTimes(1);
    });
    it('does not present after disable while mounting or leak subscriptions after repeated stop',async()=>{
        const h=harness();let resolve!:()=>void;h.host.present.mockImplementation(()=>new Promise<void>(r=>resolve=r));
        const stop=h.c.start(),pending=h.c.open('home');h.disable();stop();resolve();await pending;stop();
        expect(h.state().phase).toBe('disabled');expect(h.releaseHooks).toHaveBeenCalledTimes(1);expect(h.releaseGame).toHaveBeenCalledTimes(1);expect(h.host.dispose).toHaveBeenCalledTimes(1);
        expect(h.bindings.showMenuHost).not.toHaveBeenCalled();
    });
    it('does not revive a stopped session when a native handoff finishes',async()=>{
        const h=harness();let resolve!:()=>void;h.bindings.openNative=()=>new Promise<void>(r=>resolve=r);const stop=h.c.start();await h.c.open('home');
        const pending=h.c.handoff({kind:'main-menu'});stop();resolve();await pending;expect(h.state().phase).toBe('disabled');expect(h.host.dispose).toHaveBeenCalledTimes(1);
    });
    it('native close and suspension do not close the newly opened native menu again',async()=>{
        const h=harness();h.c.start();await h.c.open('home');vi.mocked(h.bindings.closeMenuHost).mockClear();
        h.handlers().suspended(true);expect(h.state().phase).toBe('native-handoff');expect(h.bindings.closeMenuHost).not.toHaveBeenCalled();
        h.handlers().closed();expect(h.state().phase).toBe('closed');expect(h.bindings.closeMenuHost).not.toHaveBeenCalled();
    });
});
