import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPerformance, type PerformanceBindings, type PerformanceState } from '../../src/menu/steam/performance';
function fixture() {
    vi.useFakeTimers();
    const listeners = new Set<() => void>();
    const state: PerformanceState = {
        currentGameId:'1057090',activeProfileId:'769',accountId:'test',
        platform:{is_service_available:true,is_tdp_limit_available:true,tdp_limit_min:4,tdp_limit_max:20,is_manual_gpu_clock_available:true,manual_gpu_clock_min:200,manual_gpu_clock_max:1800,platform_performance_profiles_available:['low-power','balanced','performance'],is_vrs_available:true},
        gamescope:{is_service_available:true,is_app_refresh_rate_supported:true,is_refresh_rate_switching_supported:true,is_refresh_rate_switching_restricted:false,active_display_info:{connector_name:'eDP-1',is_external:false,is_hdr_capable:false,is_vrr_capable:true,supported_frame_rates:[23.976,29.97,59.94],supported_refresh_rates:[59.94,119.88]}},
        client:{steamos_platform_performance_profile:'performance',steamos_tdp_limit_enabled:false,steamos_tdp_limit:20,steamos_manual_gpu_clock_enabled:true,steamos_manual_gpu_clock_hz:1800,gamescope_enable_app_target_framerate:true,gamescope_app_target_framerate:59.94,gamescope_disable_framelimit:false,gamescope_display_refresh_rate:119.88,gamescope_allow_tearing:false,steamos_vrs_enabled:false,gamescope_hdr_enabled:false},
        legacy:{limits:{tdp_limit_min:3,tdp_limit_max:15,fsr_sharpness_min:0,fsr_sharpness_max:5,is_vrr_supported:true,split_scaling_scalers_available:[1,2,3,4,5],split_scaling_filters_available:[3,2,1]},perApp:{fsr_sharpness:3,is_vrr_enabled:true,split_scaling_scaler:1,split_scaling_filter:1},global:{perf_overlay_service_state:1,perf_overlay_level:0,is_show_perf_overlay_over_steam_enabled:true}},deferred:[],
    };
    const writeClient=vi.fn(async()=>{}),writeLegacy=vi.fn(async()=>{}),setGameSpecific=vi.fn(async()=>{});
    const bindings:PerformanceBindings={read:()=>state,subscribe:fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},writeClient,writeLegacy,setGameSpecific};
    const perf=createPerformance(bindings);const emit=()=>listeners.forEach(fn=>fn());
    return {state,perf,emit,writeClient,writeLegacy,setGameSpecific,listeners};
}
afterEach(()=>vi.useRealTimers());
describe('native Performance controls',()=>{
    it('uses platform service bounds and profile options instead of stale legacy limits',()=>{
        const h=fixture();expect(h.perf.controls.tdp.get()).toMatchObject({min:4,max:20,disabled:true});
        expect(h.perf.controls.gpuClock.get()).toMatchObject({min:200,max:1800});
        expect(h.perf.controls.profile.get().options).toEqual(['low-power','balanced','performance']);h.perf.dispose();
    });
    it('labels the actual native default profile without inventing per-game scope for client settings',()=>{
        const h=fixture();expect(h.perf.getProfile()).toMatchObject({currentGameId:'1057090',activeProfileId:'769',isGameSpecific:false,label:'Using default profile'});
        expect(h.perf.controls.frameLimit.get().scope).toEqual({kind:'unknown'});
        h.state.activeProfileId='';h.emit();expect(h.perf.getProfile()).toMatchObject({isGameSpecific:false,label:'Profile unavailable'});h.perf.dispose();
    });
    it('preserves fractional native frame choices and waits700ms plus authoritative readback',async()=>{
        const h=fixture(),c=h.perf.controls.frameLimit;
        expect(c.get().options).toEqual([23.976,29.97,59.94]);const p=c.set(29.97);
        await vi.advanceTimersByTimeAsync(699);expect(h.writeClient).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);expect(h.writeClient).toHaveBeenCalledWith('gamescope_app_target_framerate',29.97);
        expect(c.get()).toMatchObject({value:59.94,pending:true});h.state.client.gamescope_app_target_framerate=29.97;h.emit();await p;
        expect(c.get()).toMatchObject({value:29.97,pending:false});h.perf.dispose();
    });
    it('rejects unsupported and disabled/deferred controls without native writes',async()=>{
        const h=fixture();expect(h.perf.controls.hdr.get().available).toBe(false);
        h.state.gamescope!.active_display_info!.is_vrr_capable=false;h.state.client.gamescope_disable_framelimit=true;h.state.deferred=['steamos_platform_performance_profile'];h.emit();
        expect(h.perf.controls.vrr.get().available).toBe(false);
        expect(h.perf.controls.frameLimit.get().disabled).toBe(true);expect(h.perf.controls.profile.get().disabled).toBe(true);
        await expect(h.perf.controls.frameLimit.set(29.97)).rejects.toThrow();await expect(h.perf.controls.profile.set('balanced')).rejects.toThrow();
        expect(h.writeClient).not.toHaveBeenCalled();h.perf.dispose();
    });
    it('never substitutes legacy bounds when the platform service is missing',()=>{
        const h=fixture();h.state.platform=null;h.emit();expect(h.perf.controls.tdp.get().available).toBe(false);expect(h.perf.controls.profile.get().available).toBe(false);h.perf.dispose();
    });
    it('keeps scaling enum IDs independent of display ordering',async()=>{
        const h=fixture(),c=h.perf.controls.scalingMode;expect(c.get().options).toEqual([1,2,3,5,4]);
        const p=c.set(5);await vi.advanceTimersByTimeAsync(0);expect(h.writeLegacy).toHaveBeenCalledWith('SetSplitScalingScaler',5,'769');
        h.state.legacy.perApp.split_scaling_scaler=5;h.emit();await p;h.perf.dispose();
    });
    it('drops a queued GPU clock on a display change and uses native200ms coalescing',async()=>{
        const h=fixture(),c=h.perf.controls.gpuClock;const p=c.set(1700).catch(e=>e.message);
        await vi.advanceTimersByTimeAsync(199);expect(h.writeClient).not.toHaveBeenCalled();
        h.state.gamescope!.active_display_info!.connector_name='DP-1';h.emit();await vi.advanceTimersByTimeAsync(1);
        expect(await p).toContain('context');expect(h.writeClient).not.toHaveBeenCalled();h.perf.dispose();
    });
    it('invalidates queued writes when power-dependent capability bounds change',async()=>{
        const h=fixture();h.state.client.steamos_tdp_limit_enabled=true;h.emit();const p=h.perf.controls.tdp.set(18).catch(e=>e.message);
        h.state.platform!.tdp_limit_max=12;h.emit();await vi.advanceTimersByTimeAsync(100);
        expect(await p).toContain('context');expect(h.writeClient).not.toHaveBeenCalled();h.perf.dispose();
    });
    it('switches the native current-game profile and changes legacy scope without a parallel save/reset',async()=>{
        const h=fixture();const p=h.perf.setGameSpecific(true);await vi.advanceTimersByTimeAsync(0);
        expect(h.setGameSpecific).toHaveBeenCalledWith(true,'1057090');
        h.state.activeProfileId='1057090';h.emit();await p;
        expect(h.perf.getProfile().isGameSpecific).toBe(true);expect(h.perf.controls.vrr.get().scope).toEqual({kind:'game',gameId:'1057090'});
        h.perf.dispose();expect(h.writeLegacy).not.toHaveBeenCalled();expect(h.setGameSpecific).toHaveBeenCalledTimes(1);expect(h.listeners.size).toBe(0);
    });
    it('refuses a game-specific profile without a known current game',async()=>{
        const h=fixture();h.state.currentGameId='';h.emit();await expect(h.perf.setGameSpecific(true)).rejects.toThrow();expect(h.setGameSpecific).not.toHaveBeenCalled();h.perf.dispose();
    });
});

it('confirms native float quantization without rounding fractional frame targets to integers',async()=>{
    const h=fixture(),c=h.perf.controls.frameLimit;const p=c.set(29.97);await vi.advanceTimersByTimeAsync(700);
    h.state.client.gamescope_app_target_framerate=29.969999313354492;h.emit();
    expect(c.get().pending).toBe(false);await p;expect(c.get().value).toBe(29.969999313354492);h.perf.dispose();
});

it('treats zero game IDs as default scope rather than a running game',()=>{
    const h=fixture();h.state.currentGameId='0';h.state.activeProfileId='0';h.emit();
    expect(h.perf.getProfile()).toMatchObject({isGameSpecific:false,label:'Using default profile'});
    expect(h.perf.controls.vrr.get().scope).toEqual({kind:'global'});
    expect(h.perf.controls.perGame.get().available).toBe(false);h.perf.dispose();
});


it('uses Steam overlay notch order rather than equating the visible level with the native enum',async()=>{
    const h=fixture(),c=h.perf.controls.overlayLevel;
    expect(c.get().options).toEqual([0,4,1,2,3]);
    const levelOne=c.get().options![1];const p=c.set(levelOne);await vi.advanceTimersByTimeAsync(100);
    expect(h.writeLegacy).toHaveBeenCalledWith('SetPerfOverlayLevel',4,'769');
    h.state.legacy.global.perf_overlay_level=4;h.emit();await p;
    expect(c.get().value).toBe(4);h.perf.dispose();
});
it('uses native sharpness bounds and cancels a pending adjustment when the filter changes',async()=>{
    const h=fixture(),c=h.perf.controls.sharpness;
    expect(c?.get()).toMatchObject({min:0,max:5,disabled:true});
    h.state.legacy.perApp.split_scaling_filter=3;h.emit();
    expect(c.get()).toMatchObject({value:3,disabled:false});
    const p=c.set(4);await vi.advanceTimersByTimeAsync(100);
    expect(h.writeLegacy).toHaveBeenCalledWith('SetFSRSharpness',4,'769');
    h.state.legacy.perApp.fsr_sharpness=4;h.emit();await p;
    h.writeLegacy.mockClear();const pending=c.set(5).catch(e=>e.message);
    h.state.legacy.perApp.split_scaling_filter=1;h.emit();await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toContain('context');expect(h.writeLegacy).not.toHaveBeenCalled();h.perf.dispose();
});
it('writes Hz choices to native refresh settings at the same700ms delay as Steam',async()=>{
    const h=fixture(),c=h.perf.controls.refreshRate;h.state.client.gamescope_disable_framelimit=true;h.emit();
    expect(c.get()).toMatchObject({available:true,disabled:false,options:[59.94,119.88]});
    const p=c.set(59.94);await vi.advanceTimersByTimeAsync(699);expect(h.writeClient).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);expect(h.writeClient).toHaveBeenCalledWith('gamescope_display_refresh_rate',59.94);
    h.state.client.gamescope_display_refresh_rate=59.94;h.emit();await p;
    expect(h.state.client.gamescope_app_target_framerate).toBe(59.94);h.perf.dispose();
});

it('treats Steam’s own 769 profile as no game running: no per-game switch, default scope', () => {
    // Ally, no game running: SystemPerfStore reports nCurrentGameID 769 and nActiveProfileGameID 769.
    const h = fixture(); h.state.currentGameId = '769'; h.state.activeProfileId = '769'; h.emit();
    expect(h.perf.controls.perGame.get().available).toBe(false);
    expect(h.perf.getProfile()).toMatchObject({ isGameSpecific: false, label: 'Using default profile' });
    expect(h.perf.controls.vrr.get().scope).toEqual({ kind: 'global' });
    h.perf.dispose();
});
