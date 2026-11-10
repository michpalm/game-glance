import type { Stop } from '../model';
import { createSettingAdapter, type SettingAdapter, type SettingSnapshot } from './setting';
export interface AudioDevice { id:number; bHasOutput:boolean; flOutputVolume:number; bHasInput:boolean; flInputVolume:number }
export interface AudioState { activeOutputDeviceId:number; activeInputDeviceId:number; vecDevices:AudioDevice[] }
export interface ValueBinding<T> { read():T|null; write(value:T,contextKey:string):Promise<unknown>|void; contextKey():string; available?():boolean }
export interface QuickSettingsBindings {
    subscribe(listener:Stop):Stop;
    audio?:{read():AudioState|null;write(deviceId:number,type:number,value:number):Promise<unknown>};
    brightness?:ValueBinding<number>;
    toggles?:Record<string,ValueBinding<boolean>>;
}
function validatePercent(value:number|boolean,snapshot:SettingSnapshot<number|boolean>):number|null {
    if(typeof value!=='number'||!Number.isFinite(value)||!snapshot.available)return null;
    const clamped=Math.min(snapshot.max??100,Math.max(snapshot.min??0,value));
    // Native scalar readback can differ by a small audio/display quantization step.
    return typeof snapshot.value==='number'&&Math.abs(snapshot.value-clamped)<=0.01?snapshot.value:clamped;
}
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
    return {controls,dispose(){Object.values(controls).forEach(control=>control.dispose());}};
}
