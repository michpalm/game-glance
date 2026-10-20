import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuickSettings, type QuickSettingsBindings } from '../../src/menu/steam/quickSettings';
function harness() {
    const listeners = new Set<() => void>(); const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
    let audio = { activeOutputDeviceId: 909, activeInputDeviceId: 1148, vecDevices: [
        {id:908,bHasOutput:true,flOutputVolume:0.2,bHasInput:false,flInputVolume:99},
        {id:909,bHasOutput:true,flOutputVolume:0.9,bHasInput:false,flInputVolume:99999},
        {id:1148,bHasOutput:false,flOutputVolume:99,bHasInput:true,flInputVolume:1},
    ] };
    let brightness = 1; const writeVolume = vi.fn(async () => {}), writeBrightness = vi.fn(async () => {}), toggleWrite = vi.fn(async () => {});
    const values: Record<string,boolean> = { wifi:true, bluetooth:true, airplane:false, night:false, 'ui-scale':true, 'friends-dnd':false };
    const bindings: QuickSettingsBindings = { subscribe, audio: { read: () => audio, write: writeVolume },
        brightness: { read: () => brightness, write: writeBrightness, contextKey: () => 'display:A' },
        toggles: Object.fromEntries(Object.keys(values).map(id => [id,{read:()=>values[id],write:(value:boolean)=>toggleWrite(id,value),contextKey:()=>id}])) };
    const settings = createQuickSettings(bindings);
    return { settings, writeVolume, writeBrightness, toggleWrite, emit: () => listeners.forEach(fn => fn()),
        volume(id:number,type:number,value:number) { audio = {...audio,vecDevices:audio.vecDevices.map(d=>d.id===id?{...d,...(type===1?{flOutputVolume:value}:{flInputVolume:value})}:d)}; listeners.forEach(fn=>fn()); },
        brightness(value:number){brightness=value;listeners.forEach(fn=>fn());},toggle(id:string,value:boolean){values[id]=value;listeners.forEach(fn=>fn());} };
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('native quick settings adapters',()=>{
    it('uses active output 909 with AllOutput=1, and a separate valid microphone with Input=0',async()=>{
        vi.useFakeTimers();const h=harness();expect(h.settings.controls.volume.get().value).toBe(90);expect(h.settings.controls.microphone.get().value).toBe(100);
        const output=h.settings.controls.volume.set(50);await vi.advanceTimersByTimeAsync(100);expect(h.writeVolume).toHaveBeenCalledWith(909,1,0.5);h.volume(909,1,0.5);await output;
        const mic=h.settings.controls.microphone.set(70);await vi.advanceTimersByTimeAsync(100);expect(h.writeVolume).toHaveBeenCalledWith(1148,0,0.7);h.volume(1148,0,0.7);await mic;h.settings.dispose();
    });
    it('brightness waits for callback-fed native state',async()=>{
        vi.useFakeTimers();const h=harness();const pending=h.settings.controls.brightness.set(60);await vi.advanceTimersByTimeAsync(100);
        expect(h.writeBrightness).toHaveBeenCalledWith(0.6,'display:A');expect(h.settings.controls.brightness.get()).toMatchObject({value:100,pending:true});h.brightness(0.6);await pending;h.settings.dispose();
    });
    it.each(['wifi','bluetooth','airplane','night','ui-scale','friends-dnd'])('routes %s through its verified binding',async id=>{
        const h=harness();const target=!h.settings.controls[id].get().value;const pending=h.settings.controls[id].set(target);await Promise.resolve();await Promise.resolve();
        expect(h.toggleWrite).toHaveBeenCalledWith(id,target);h.toggle(id,target);await pending;h.settings.dispose();
    });
    it('ignores plausible volume fields on devices without the corresponding capability', async () => {
        const write=vi.fn(async()=>{});
        const settings=createQuickSettings({subscribe:()=>()=>{},audio:{read:()=>({activeOutputDeviceId:7,activeInputDeviceId:8,vecDevices:[
            {id:7,bHasOutput:false,flOutputVolume:0.5,bHasInput:true,flInputVolume:0.8},
            {id:8,bHasOutput:true,flOutputVolume:0.8,bHasInput:false,flInputVolume:0.5},
        ]}),write}});
        expect(settings.controls.volume.get().available).toBe(false); expect(settings.controls.microphone.get().available).toBe(false);
        await expect(settings.controls.volume.set(50)).rejects.toThrow('unavailable'); expect(write).not.toHaveBeenCalled(); settings.dispose();
    });
    it('omits absent audio and toggle capabilities',()=>{
        const settings=createQuickSettings({subscribe:()=>()=>{}});expect(Object.keys(settings.controls)).toHaveLength(0);settings.dispose();
    });
});

const nativeMetadata=vi.hoisted(()=>({settings:{strDisplayName:'Test panel',bDisplayIsExternal:false,bDisplayIsUsingAutoScale:true}}));
vi.mock('@decky/ui',()=>({findModuleExport:(predicate:(value:unknown)=>boolean)=>[nativeMetadata,{BIsFeatureBlocked:()=>false}].find(predicate)}));
import { discoverQuickSettingsBindings } from '../../src/menu/steam/nativeCore';
function nativeHarness(){
    vi.useFakeTimers();nativeMetadata.settings.bDisplayIsExternal=false;
    let state={activeOutputDeviceId:909,activeInputDeviceId:1148,vecDevices:[
        {id:908,bHasOutput:true,flOutputVolume:0.2,bHasInput:false,flInputVolume:99},
        {id:909,bHasOutput:true,flOutputVolume:0.9,bHasInput:false,flInputVolume:99999},
        {id:1148,bHasOutput:false,flOutputVolume:99,bHasInput:true,flInputVolume:1},
    ]};
    let volume!: (id:number,type:number,value:number)=>void;
    const unregister=vi.fn();
    const set=vi.fn(async(id:number,type:number,value:number)=>{state={...state,vecDevices:state.vecDevices.map(d=>d.id===id?{...d,...(type===1?{flOutputVolume:value}:{flInputVolume:value})}:d)};volume(id,type,value);return {result:1,message:''};});
    const register=()=>({unregister});
    const get=vi.fn(async()=>state);
    vi.stubGlobal('SteamClient',{System:{Audio:{GetDevices:get,SetDeviceVolume:set,RegisterForDeviceAdded:register,RegisterForDeviceRemoved:register,RegisterForServiceConnectionStateChanges:register,RegisterForDeviceVolumeChanged:(fn:typeof volume)=>{volume=fn;return register();}}}});
    const settings=createQuickSettings(discoverQuickSettingsBindings());
    return {settings,set,get,devices:()=>state,unregister,switchOutput(){state={...state,activeOutputDeviceId:908};}};
}
it('uses the actual native callback/device discovery pipeline and releases registrations',async()=>{
    const h=nativeHarness();await vi.advanceTimersByTimeAsync(0);expect(h.settings.controls.volume.get().value).toBe(90);
    const pending=h.settings.controls.volume.set(50);await vi.advanceTimersByTimeAsync(100);await pending;
    expect(h.set).toHaveBeenCalledWith(909,1,0.5);expect(h.settings.controls.volume.get()).toMatchObject({value:50,pending:false});
    h.settings.dispose();expect(h.unregister).toHaveBeenCalledTimes(4);vi.unstubAllGlobals();
});
it('rechecks the active native output before sending and refuses an obsolete device',async()=>{
    const h=nativeHarness();await vi.advanceTimersByTimeAsync(0);
    const pending=h.settings.controls.volume.set(50).catch(error=>error.message);h.switchOutput();
    await vi.advanceTimersByTimeAsync(100);expect(await pending).toContain('context');expect(h.set).not.toHaveBeenCalled();expect(h.settings.controls.volume.get().value).toBe(20);
    h.settings.dispose();vi.unstubAllGlobals();
});
it('reads Airplane mode from the native subscribable Value without toggling the network',()=>{
    const set=vi.fn();vi.stubGlobal('SystemStoragStore',{AirplaneModeEnabled:{Value:false},SetAirplaneMode:set});
    const bindings=discoverQuickSettingsBindings();expect(bindings.toggles?.airplane.read()).toBe(false);expect(set).not.toHaveBeenCalled();vi.unstubAllGlobals();
});

it('does not send a volume command if its device preflight outlives disposal and timeout',async()=>{
    const h=nativeHarness();await vi.advanceTimersByTimeAsync(0);let finish!:(value:ReturnType<typeof h.devices>)=>void;
    h.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const pending=h.settings.controls.volume.set(50).catch(()=>{});await vi.advanceTimersByTimeAsync(100);
    h.settings.dispose();await vi.advanceTimersByTimeAsync(3000);await pending;finish(h.devices());await vi.advanceTimersByTimeAsync(0);
    expect(h.set).not.toHaveBeenCalled();vi.unstubAllGlobals();
});

it('omits an unsupported Bluetooth client setting without losing other controls',()=>{
    vi.stubGlobal('settingsStore',{GetClientSetting:()=>{throw Error('unsupported key');}});
    vi.stubGlobal('SystemNetworkStore',{hasWirelessDevice:true,isWifiEnabled:true,SetWifiEnabled:vi.fn()});
    const bindings=discoverQuickSettingsBindings();expect(bindings.toggles?.bluetooth).toBeUndefined();expect(bindings.toggles?.wifi.read()).toBe(true);
});


it('seeds brightness from Steam’s wrapped value and trusts its capability in a windowed session', async () => {
    vi.useFakeTimers();nativeMetadata.settings.bDisplayIsExternal=true;
    const value={Value:0.72};let callback!:(state:{flBrightness:number})=>void;
    const unregister=vi.fn(),write=vi.fn();
    vi.stubGlobal('SteamClient',{System:{Display:{RegisterForBrightnessChanges:(fn:typeof callback)=>{callback=fn;return {unregister};}}}});
    vi.stubGlobal('SystemStoragStore',{DisplayBrightness:value,msgSettings:{is_display_brightness_available:true},SetDisplayBrightness:write});
    const settings=createQuickSettings(discoverQuickSettingsBindings());
    expect(settings.controls.brightness.get()).toMatchObject({available:true,value:72});
    const pending=settings.controls.brightness.set(65);await vi.advanceTimersByTimeAsync(100);
    expect(write).toHaveBeenCalledWith(0.65);expect(settings.controls.brightness.get().pending).toBe(true);
    value.Value=0.65;callback({flBrightness:0.65});await pending;
    expect(settings.controls.brightness.get()).toMatchObject({value:65,pending:false});
    settings.dispose();expect(unregister).toHaveBeenCalledTimes(1);nativeMetadata.settings.bDisplayIsExternal=false;
});
it('hides brightness when Steam explicitly reports no controllable backlight', () => {
    nativeMetadata.settings.bDisplayIsExternal=false;
    vi.stubGlobal('SteamClient',{System:{Display:{RegisterForBrightnessChanges:()=>({unregister:vi.fn()})}}});
    vi.stubGlobal('SystemStoragStore',{DisplayBrightness:0.5,msgSettings:{is_display_brightness_available:false},SetDisplayBrightness:vi.fn()});
    const settings=createQuickSettings(discoverQuickSettingsBindings());
    expect(settings.controls.brightness.get().available).toBe(false);settings.dispose();
});
