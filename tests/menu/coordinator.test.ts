import { describe, expect, it, vi } from 'vitest';
import { createMenuCoordinator } from '../../src/menu/coordinator';
import { defaultMenuState, reduceMenu, type MenuEvent } from '../../src/menu/model';
import type { IntentHandlers, NativeBindings } from '../../src/menu/steam/runtime';
function harness(){
    let state=reduceMenu(defaultMenuState(),{type:'enable',value:true});let handlers!:IntentHandlers;const order:string[]=[];
    const host:{present:ReturnType<typeof vi.fn>;suspend:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>;dispose:ReturnType<typeof vi.fn>;onFailure?: (listener:(error:Error)=>void)=>()=>void}={present:vi.fn(async()=>{order.push('present');}),suspend:vi.fn(()=>order.push('suspend')),close:vi.fn(),dispose:vi.fn()};
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
    it('activates the native surface before waiting for its first custom render', async () => {
        const h = harness(); let confirm!: () => void;
        h.host.present.mockImplementation(() => new Promise<void>(resolve => { confirm = resolve; }));
        vi.mocked(h.bindings.showMenuHost).mockImplementation(() => confirm());
        const stop = h.c.start(); const pending = h.c.open('home');
        expect(h.bindings.showMenuHost).toHaveBeenCalledTimes(1);
        await pending; expect(h.state().phase).toBe('custom-open'); stop();
    });
    it('handles a native activation exception without leaving presentation rejection unhandled', async () => {
        const h = harness(); let reject!: (error: Error) => void;
        h.bindings.attachHost = () => ({ ...h.host,
            present: () => new Promise<void>((_resolve, fail) => { reject = fail; }),
            dispose: () => reject(Error('disposed while awaiting render')),
        });
        vi.mocked(h.bindings.showMenuHost).mockImplementation(() => { throw Error('native host disappeared'); });
        h.c.start(); h.handlers().open('home', h.replay);
        await vi.waitFor(() => expect(h.replay).toHaveBeenCalledTimes(1));
        expect(h.releaseHooks).toHaveBeenCalledTimes(1); expect(h.state().phase).toBe('failed');
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
        expect(h.bindings.showMenuHost).toHaveBeenCalledTimes(1); // opening the native surface precedes async render acknowledgement
    });
    it('does not revive a stopped session when a native handoff finishes',async()=>{
        const h=harness();let resolve!:()=>void;h.bindings.openNative=()=>new Promise<void>(r=>resolve=r);const stop=h.c.start();await h.c.open('home');
        const pending=h.c.handoff({kind:'main-menu'});stop();resolve();await pending;expect(h.state().phase).toBe('disabled');expect(h.host.dispose).toHaveBeenCalledTimes(1);
    });
    it('recovers to native after a late render failure and unregisters its failure listener',async()=>{
        const h=harness();let fail!:(error:Error)=>void;const unsubscribe=vi.fn();h.host.onFailure=(listener:(e:Error)=>void)=>{fail=listener;return unsubscribe;};
        const stop=h.c.start();await h.c.open('home');expect(fail).toBeTypeOf('function');fail(Error('render failed'));await vi.waitFor(()=>expect(h.bindings.openNative).toHaveBeenCalledWith({kind:'main-menu'}));
        expect(h.state().phase).toBe('failed');expect(unsubscribe).toHaveBeenCalledTimes(1);stop();expect(h.host.dispose).toHaveBeenCalledTimes(1);
    });
    it('native close and suspension do not close the newly opened native menu again',async()=>{
        const h=harness();h.c.start();await h.c.open('home');vi.mocked(h.bindings.closeMenuHost).mockClear();
        h.handlers().suspended(true);expect(h.state().phase).toBe('native-handoff');expect(h.bindings.closeMenuHost).not.toHaveBeenCalled();
        h.handlers().closed();expect(h.state().phase).toBe('closed');expect(h.bindings.closeMenuHost).not.toHaveBeenCalled();
    });
});
