import { Focusable, NavEntryPositionPreferences, SliderField, ToggleField } from '@decky/ui';
import { LuWifi, LuBluetooth, LuPlane, LuMoon, LuMonitor, LuBellOff, LuVolume2, LuMic, LuSun } from 'react-icons/lu';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { SettingAdapter } from '../steam/setting';
import type { DeviceChoice, DevicePicker } from '../steam/quickSettings';
import { MenuPicker } from './MenuPicker';
import { installPageScroll, QUICK_FOCUSABLES } from '../socialScroll';
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
    return <div className={`gg-menu-setting ${numeric ? 'gg-menu-setting-slider' : 'gg-menu-setting-toggle'}${state.disabled ? ' gg-menu-setting-disabled' : ''}`} data-gg-focus={`quick:${id}`}>
        {numeric?<SliderField highlightOnFocus={false} label={<span className="gg-menu-slider-label">{label}<output>{Math.round(state.value as number)}%</output></span>} value={draft??state.value as number} min={state.min} max={state.max} step={state.step??1} disabled={state.disabled} showValue={false} onChange={value=>{setDraft(value);command(value);}}/>:
            <ToggleField highlightOnFocus={false} label={label} checked={state.value as boolean} disabled={state.disabled || state.pending} onChange={command}/>}
        {state.error&&<p className="gg-menu-error" role="alert">{state.error}</p>}
    </div>;
}
/** Which device plays (Output) or records (Input), under its slider (spec 2026-11-12-status-and-audio-pickers). */
function DeviceRow({id,label,picker}:{id:string;label:string;picker:DevicePicker}) {
    const choices=useSyncExternalStore(picker.subscribe,picker.read);
    if(!choices)return null;
    return <div className="gg-menu-device" data-gg-focus={id}>
        <MenuPicker<DeviceChoice> id={id} label={label} text={choices.text} options={choices.options} selected={choices.selected} onPick={choice=>{void picker.pick(choice).catch(()=>{/* The pill shows Steam's device, which did not change. */});}}/>
    </div>;
}
/** The panel scrolls so Brightness shows the heading and the last toggle the bottom (as the settings pages, socialScroll). */
const keepQuickScroll = (heading: HTMLHeadingElement | null) => {
    const panel = heading?.closest<HTMLElement>('.gg-menu-panel');
    return panel ? installPageScroll(panel, QUICK_FOCUSABLES) : undefined;
};
export function QuickSettingsPanel({controls,devices}:{controls:Record<string,SettingAdapter<number|boolean>>;devices?:{output:DevicePicker;input:DevicePicker}}) {
    const rows=(ids:string[])=>ids.filter(id=>controls[id]).map(id=><Control key={id} id={id} adapter={controls[id]}/>);
    return <><h2 ref={keepQuickScroll}>Quick settings</h2><Focusable className="gg-menu-quick-sliders" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{rows(['brightness','volume','microphone'])}{devices&&controls.volume&&<DeviceRow id="quick:output" label="Output" picker={devices.output}/>}{devices&&controls.microphone&&<DeviceRow id="quick:input" label="Input" picker={devices.input}/>}</Focusable>
        <h3>Connectivity</h3><Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{rows(['wifi','bluetooth'])}</Focusable>
        <h3>Other</h3><Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{rows(['airplane','night','ui-scale','friends-dnd'])}</Focusable>
        </>;
}
