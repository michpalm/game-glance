import type { WifiBindings } from './wifi';
import type { Stop } from '../model';
import { createSettingAdapter, type SettingAdapter, type SettingSnapshot } from './setting';
import type { PickerOption } from '../components/MenuPicker';
export interface AudioDevice { id:number; sName?:string; bHasOutput:boolean; flOutputVolume:number; bHasInput:boolean; flInputVolume:number }
export interface AudioState { activeOutputDeviceId:number; activeInputDeviceId:number; overrideOutputDeviceId?:number; overrideInputDeviceId?:number; vecDevices:AudioDevice[] }
export interface ValueBinding<T> { read():T|null; write(value:T,contextKey:string):Promise<unknown>|void; contextKey():string; available?():boolean }
export interface QuickSettingsBindings {
    subscribe(listener:Stop):Stop;
    audio?:{read():AudioState|null;write(deviceId:number,type:number,value:number):Promise<unknown>;setOverride?(deviceId:number,type:number):Promise<unknown>;clearOverride?(type:number):Promise<unknown>};
    brightness?:ValueBinding<number>;
    toggles?:Record<string,ValueBinding<boolean>>;
    /** Steam's network store, for the Wi-Fi row and page. */
    wifi?:WifiBindings;
}
function validatePercent(value:number|boolean,snapshot:SettingSnapshot<number|boolean>):number|null {
    if(typeof value!=='number'||!Number.isFinite(value)||!snapshot.available)return null;
    const clamped=Math.min(snapshot.max??100,Math.max(snapshot.min??0,value));
    // Native scalar readback can differ by a small audio/display quantization step.
    return typeof snapshot.value==='number'&&Math.abs(snapshot.value-clamped)<=0.01?snapshot.value:clamped;
}
/** Which device plays (type 1) or records (type 0) sound: Automatic, or a device you chose (Steam's override). */
export type DeviceChoice = 'auto' | number;
export interface AudioChoices { text:string; selected:DeviceChoice; options:PickerOption<DeviceChoice>[] }
/**
 * The Output/Input pill and its list (spec 2026-11-12-status-and-audio-pickers): Automatic, then each device that can
 * play (or record), by Steam's name. A chosen device that is no longer there reads as Automatic.
 */
export function audioChoices(state:AudioState|null, type:0|1):AudioChoices|null {
    if(!state)return null;
    const devices=state.vecDevices.filter(d=>type===1?d.bHasOutput:d.bHasInput);
    const name=(d:AudioDevice|undefined)=>d?.sName??'Unknown device';
    const override=type===1?state.overrideOutputDeviceId:state.overrideInputDeviceId;
    const chosen=devices.find(d=>d.id===override);
    const active=state.vecDevices.find(d=>d.id===(type===1?state.activeOutputDeviceId:state.activeInputDeviceId));
    return {
        text:chosen?name(chosen):`Automatic · ${name(active)}`,
        selected:chosen?chosen.id:'auto',
        options:[{id:'auto',label:'Automatic',sub:'Follows the connected device'},...devices.map(d=>({id:d.id,label:name(d)}))],
    };
}
export interface DevicePicker { read():AudioChoices|null; pick(choice:DeviceChoice):Promise<void>; subscribe:QuickSettingsBindings['subscribe'] }

export function createQuickSettings(bindings:QuickSettingsBindings) {
    const controls:Record<string,SettingAdapter<number|boolean>>={};
    if(bindings.audio)for(const [id,type] of [['volume',1],['microphone',0]] as const){
        const audio=bindings.audio;
        const device=()=>{const state=audio.read();return state?.vecDevices.find(d=>d.id===(type===1?state.activeOutputDeviceId:state.activeInputDeviceId));};
        controls[id]=createSettingAdapter<number|boolean>({
            read(){const d=device(),value=d?(type===1?d.flOutputVolume:d.flInputVolume):null;
                const available=!!d&&(type===1?d.bHasOutput:d.bHasInput)&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
                return {available,value:available?value!*100:null,scope:{kind:'global'},min:0,max:100,step:1};},
            subscribe:bindings.subscribe,contextKey:()=>`audio:${type}:${device()?.id??'none'}`,validate:validatePercent,liveIntervalMs:50,
            async write(value,key){const d=device();if(!d||`audio:${type}:${d.id}`!==key||typeof value!=='number')throw Error('Audio device changed');await audio.write(d.id,type,value/100);},
        });
    }
    if(bindings.brightness){const binding=bindings.brightness;
        controls.brightness=createSettingAdapter<number|boolean>({
            read(){const value=binding.read();const available=binding.available?.()!==false&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
                return {available,value:available?value!*100:null,scope:{kind:'global'},min:0,max:100,step:1};},
            subscribe:bindings.subscribe,contextKey:binding.contextKey,validate:validatePercent,liveIntervalMs:50,
            async write(value,key){if(typeof value!=='number'||binding.contextKey()!==key)throw Error('Display changed');await binding.write(value/100,key);},
        });
    }
    for(const [id,binding] of Object.entries(bindings.toggles??{}))controls[id]=createSettingAdapter<number|boolean>({
        read(){const value=binding.read();return {available:binding.available?.()!==false&&typeof value==='boolean',value:typeof value==='boolean'?value:null,scope:{kind:'global'}};},
        contextKey:binding.contextKey,subscribe:bindings.subscribe,validate:(value,snapshot)=>typeof value==='boolean'&&snapshot.available?value:null,
        async write(value,key){if(typeof value!=='boolean'||binding.contextKey()!==key)throw Error('Setting context changed');await binding.write(value,key);},
    });
    let devices:{output:DevicePicker;input:DevicePicker}|undefined;
    const audio=bindings.audio;
    if(audio?.setOverride&&audio.clearOverride){
        const picker=(type:0|1):DevicePicker=>{
            let last:{key:string;value:AudioChoices|null}={key:'',value:null};
            const read=()=>{const value=audioChoices(audio.read(),type);const key=JSON.stringify(value);if(key!==last.key)last={key,value};return last.value;};
            return {read,subscribe:bindings.subscribe,async pick(choice){
                if(choice==='auto'){await audio.clearOverride!(type);return;}
                // Only a device that is still in the list (one can leave while the list is open).
                if(audioChoices(audio.read(),type)?.options.some(o=>o.id===choice))await audio.setOverride!(choice,type);
            }};
        };
        devices={output:picker(1),input:picker(0)};
    }
    return {controls,devices,wifi:bindings.wifi,dispose(){Object.values(controls).forEach(control=>control.dispose());}};
}
