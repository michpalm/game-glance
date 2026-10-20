import { afterEach, expect, it, vi } from 'vitest';
import { createPerformance } from '../../src/menu/steam/performance';
import { createNativePerformanceBindings } from '../../src/menu/steam/performanceNative';
afterEach(()=>vi.useRealTimers());
it('shares native service queries, refreshes platform bounds and releases only its own callbacks',async()=>{
    vi.useFakeTimers();let max=20;let changed!:()=>void;const unregister=vi.fn();
    const platform={GetState:vi.fn(async()=>({BSuccess:()=>true,Body:()=>({toObject:()=>({state:{is_service_available:true,is_tdp_limit_available:true,tdp_limit_min:4,tdp_limit_max:max}})})})),RegisterForNotifyStateChanged:(fn:()=>void)=>{changed=fn;return {unregister};}};
    const bindings=createNativePerformanceBindings({platform,root:{}});const perf=createPerformance(bindings);
    await vi.advanceTimersByTimeAsync(0);expect(platform.GetState).toHaveBeenCalledTimes(1);expect(perf.controls.tdp.get()).toMatchObject({min:4,max:20});
    max=15;changed();await vi.advanceTimersByTimeAsync(0);expect(perf.controls.tdp.get().max).toBe(15);
    perf.dispose();expect(unregister).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});
it('checks live game/profile identity immediately before a native write',async()=>{
    let current='1057090',active='769';const set=vi.fn();
    const store={get nCurrentGameID(){return current;},get nActiveProfileGameID(){return active;},SetVRREnabled:set,SetGameSpecificProfileEnabled:set};
    const bindings=createNativePerformanceBindings({root:{SystemPerfStore:store}});
    active='42';await expect(bindings.writeLegacy('SetVRREnabled',true,'769')).rejects.toThrow('profile');
    current='42';await expect(bindings.setGameSpecific(true,'1057090')).rejects.toThrow('game');expect(set).not.toHaveBeenCalled();
});
