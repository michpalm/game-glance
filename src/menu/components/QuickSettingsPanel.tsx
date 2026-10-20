import { Focusable, NavEntryPositionPreferences, SliderField, ToggleField } from '@decky/ui';
import { LuWifi, LuBluetooth, LuPlane, LuMoon, LuMonitor, LuBellOff, LuVolume2, LuMic, LuSun } from 'react-icons/lu';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { SettingAdapter } from '../steam/setting';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
const LABELS:Record<string,string>={volume:'Volume',microphone:'Microphone',brightness:'Brightness',wifi:'Wi-Fi',bluetooth:'Bluetooth',airplane:'Airplane mode',night:'Night mode','ui-scale':'Automatically scale UI','friends-dnd':'Do not disturb'};
const ICONS: Record<string, typeof LuWifi> = { volume: LuVolume2, microphone: LuMic, brightness: LuSun, wifi: LuWifi, bluetooth: LuBluetooth, airplane: LuPlane, night: LuMoon, 'ui-scale': LuMonitor, 'friends-dnd': LuBellOff };
function Control({id,adapter}:{id:string;adapter:SettingAdapter<number|boolean>}) {
    const state=useSyncExternalStore(adapter.subscribe,adapter.get);
    const [draft,setDraft]=useState<number|null>(null);
    useEffect(()=>{if(!state.pending)setDraft(null);},[state.pending,state.value,state.error]);
    if(!state.available||state.value===null)return null;
    const numeric=typeof state.value==='number';
    const Icon = ICONS[id];
    const label = <span className="gg-menu-setting-label">{Icon && <Icon aria-hidden="true" />}<span>{LABELS[id] ?? id}</span></span>;
    const command=(value:number|boolean)=>{void adapter.set(value).catch(()=>{/* The authoritative snapshot owns visible error/pending state. */});};
    return <div className={`gg-menu-setting ${numeric ? 'gg-menu-setting-slider' : 'gg-menu-setting-toggle'}`} data-gg-focus={`quick:${id}`}>
        {numeric?<SliderField highlightOnFocus={false} label={<span className="gg-menu-slider-label">{label}<output>{Math.round(state.value as number)}%</output></span>} value={draft??state.value as number} min={state.min} max={state.max} step={state.step??1} showValue={false} onChange={value=>{setDraft(value);command(value);}}/>:
            <ToggleField highlightOnFocus={false} label={label} checked={state.value as boolean} disabled={state.pending} onChange={command}/>}
        {state.error&&<p className="gg-menu-error" role="alert">{state.error}</p>}
    </div>;
}
export function QuickSettingsPanel({controls,handoff}:{controls:Record<string,SettingAdapter<number|boolean>>;handoff(request:NativeRequest):void}) {
    const rows=(ids:string[])=>ids.filter(id=>controls[id]).map(id=><Control key={id} id={id} adapter={controls[id]}/>);
    return <><h2>Quick settings</h2><Focusable className="gg-menu-quick-sliders" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{rows(['volume','microphone','brightness'])}</Focusable>
        <h3>Connectivity</h3><Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{rows(['wifi','bluetooth'])}</Focusable>
        <h3>Other</h3><Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{rows(['airplane','night','ui-scale','friends-dnd'])}</Focusable>
        <div className="gg-menu-secondary"><MenuAction id="quick:native" onAction={()=>handoff({kind:'qam',tab:'quick-settings'})}>Open Steam Quick Settings</MenuAction></div></>;
}
