import { afterEach, expect, it, vi } from 'vitest';
import { createPerformance } from '../../src/menu/steam/performance';
import { createNativePerformanceBindings, discoverPerformanceBindings } from '../../src/menu/steam/performanceNative';
const modules = vi.hoisted(() => [] as unknown[]);
vi.mock('@decky/ui', () => ({ findModuleExport: (predicate: (value: unknown) => boolean) => modules.find(predicate) }));
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();modules.length=0;});

it('initializes Steam legacy scaling and overlay controls before the native QAM has opened',()=>{
    vi.useFakeTimers();
    class Store {
        static Get(){return store;}
        nCurrentGameID='1057090';nActiveProfileGameID='769';
        msgLimits={split_scaling_scalers_available:[1,2,3,4,5],split_scaling_filters_available:[3,2,1]};
        msgSettingsPerApp={split_scaling_scaler:1,split_scaling_filter:1};
        msgSettingsGlobal={perf_overlay_service_state:1,perf_overlay_level:4,is_show_perf_overlay_over_steam_enabled:true};
        SetSplitScalingScaler(){} SetSplitScalingFilter(){} SetPerfOverlayLevel(){} SetShowPerfOverlayOverSteamEnabled(){} SetGameSpecificProfileEnabled(){}
    }
    const store=new Store();vi.stubGlobal('SystemPerfStore',undefined);modules.push(Store);
    const perf=createPerformance(discoverPerformanceBindings());
    expect(perf.controls.scalingMode.get()).toMatchObject({available:true,value:1,options:[1,2,3,5,4]});
    expect(perf.controls.scalingFilter.get()).toMatchObject({available:true,value:1,options:[1,2,3]});
    expect(perf.controls.overlayLevel.get()).toMatchObject({available:true,value:4});
    expect(perf.controls.overlaySteam.get()).toMatchObject({available:true,value:true});
    expect(perf.getProfile()).toMatchObject({currentGameId:'1057090',activeProfileId:'769'});
    perf.dispose();expect(vi.getTimerCount()).toBe(0);
});

it('keeps an initialized native store without reinitializing it',()=>{
    class Store {
        static Get(){throw Error('must reuse initialized store');}
        SetSplitScalingScaler(){} SetPerfOverlayLevel(){} SetGameSpecificProfileEnabled(){}
    }
    modules.push(Store);vi.stubGlobal('SystemPerfStore',{nCurrentGameID:'1057090',nActiveProfileGameID:'769'});
    expect(discoverPerformanceBindings().read()).toMatchObject({currentGameId:'1057090',activeProfileId:'769'});
});

it('leaves legacy controls unavailable when Steam has no compatible performance store',()=>{
    vi.useFakeTimers();vi.stubGlobal('SystemPerfStore',undefined);
    const perf=createPerformance(discoverPerformanceBindings());
    expect(perf.controls.scalingMode.get().available).toBe(false);
    expect(perf.controls.overlayLevel.get().available).toBe(false);perf.dispose();
});
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

it('reads native sharpness bounds/value and dispatches the profile-aware setter',async()=>{
    const setter=vi.fn();const bindings=createNativePerformanceBindings({root:{SystemPerfStore:{nCurrentGameID:'1057090',nActiveProfileGameID:'769',msgLimits:{fsr_sharpness_min:0,fsr_sharpness_max:5},msgSettingsPerApp:{fsr_sharpness:3,split_scaling_filter:3},SetFSRSharpness:setter}}});
    expect(bindings.read().legacy.limits).toMatchObject({fsr_sharpness_min:0,fsr_sharpness_max:5});
    expect(bindings.read().legacy.perApp.fsr_sharpness).toBe(3);
    await bindings.writeLegacy('SetFSRSharpness',4,'769');expect(setter).toHaveBeenCalledWith(4);
});


it('writes through the discovered singleton while enforcing live profile identity',async()=>{
    const store={nCurrentGameID:'1057090',nActiveProfileGameID:'769',msgSettingsPerApp:{split_scaling_scaler:1},
        SetSplitScalingScaler(value:number){this.msgSettingsPerApp.split_scaling_scaler=value;},
        SetGameSpecificProfileEnabled(enabled:boolean){this.nActiveProfileGameID=enabled?this.nCurrentGameID:'769';}};
    const bindings=createNativePerformanceBindings({root:{},store});
    await bindings.writeLegacy('SetSplitScalingScaler',5,'769');
    expect(bindings.read().legacy.perApp.split_scaling_scaler).toBe(5);
    await bindings.setGameSpecific(true,'1057090');
    expect(bindings.read().activeProfileId).toBe('1057090');
    await expect(bindings.writeLegacy('SetSplitScalingScaler',1,'769')).rejects.toThrow('profile');
    expect(bindings.read().legacy.perApp.split_scaling_scaler).toBe(5);
});
