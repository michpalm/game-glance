import { SliderField, ToggleField } from '@decky/ui';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { SettingAdapter } from '../steam/setting';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
const LABELS:Record<string,string>={volume:'Volume',microphone:'Microphone',brightness:'Brightness',wifi:'Wi-Fi',bluetooth:'Bluetooth',airplane:'Airplane mode',night:'Night mode','ui-scale':'Automatically scale UI','friends-dnd':'Do not disturb'};
function Control({id,adapter}:{id:string;adapter:SettingAdapter<number|boolean>}) {
    const state=useSyncExternalStore(adapter.subscribe,adapter.get);
    const [draft,setDraft]=useState<number|null>(null);
    useEffect(()=>{if(!state.pending)setDraft(null);},[state.pending,state.value,state.error]);
    if(!state.available||state.value===null)return null;
    const numeric=typeof state.value==='number';
    const command=(value:number|boolean)=>{void adapter.set(value).catch(()=>{/* The authoritative snapshot owns visible error/pending state. */});};
    return <div className="gg-menu-setting" data-gg-focus={`quick:${id}`}>
        {numeric?<SliderField label={`${LABELS[id]} · ${Math.round(state.value as number)}%`} value={draft??state.value as number} min={state.min} max={state.max} step={state.step??1} showValue={false} onChange={value=>{setDraft(value);command(value);}}/>:
            <ToggleField label={LABELS[id]??id} description={id==='friends-dnd'?'Friends & Chat only':undefined} checked={state.value as boolean} disabled={state.pending} onChange={command}/>}
        {state.pending&&<span className="gg-menu-setting-status">Applying…</span>}
        {state.error&&<p className="gg-menu-error" role="alert">{state.error}</p>}
    </div>;
}
export function QuickSettingsPanel({controls,handoff}:{controls:Record<string,SettingAdapter<number|boolean>>;handoff(request:NativeRequest):void}) {
    const rows=(ids:string[])=>ids.filter(id=>controls[id]).map(id=><Control key={id} id={id} adapter={controls[id]}/>);
    return <><h2>Quick settings</h2><div className="gg-menu-quick-sliders">{rows(['volume','microphone','brightness'])}</div>
        <h3>Connectivity</h3><div className="gg-menu-switches">{rows(['wifi','bluetooth'])}</div>
        <h3>Other</h3><div className="gg-menu-switches">{rows(['airplane','night','ui-scale','friends-dnd'])}</div>
        <div className="gg-menu-secondary"><MenuAction id="quick:native" onAction={()=>handoff({kind:'qam',tab:'quick-settings'})}>Open Steam Quick Settings</MenuAction></div></>;
}
