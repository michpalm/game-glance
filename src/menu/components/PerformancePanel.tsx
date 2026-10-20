import { Focusable, NavEntryPositionPreferences, SliderField, ToggleField } from '@decky/ui';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LuGauge, LuMonitor, LuZap, LuCpu, LuLayers, LuMaximize } from 'react-icons/lu';
import type { SettingAdapter } from '../steam/setting';
import type { createPerformance, PerformanceValue } from '../steam/performance';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
type Performance=ReturnType<typeof createPerformance>;
const SECTIONS=['General','Display','Power & GPU','Overlay'] as const;
const LABELS:Record<string,string>={frameLimit:'Frame limit',disableLimit:'Disable limit',vrr:'VRR',hdr:'HDR',tearing:'Allow tearing',halfRate:'Half-rate shading',refreshRate:'Refresh rate',scalingMode:'Scaling mode',scalingFilter:'Scaling filter',tdpEnabled:'TDP limit',tdp:'Power limit',gpuClockEnabled:'Manual GPU clock',gpuClock:'GPU clock',overlayLevel:'Overlay level',overlaySteam:'Show overlay in Steam',perGame:'Use per-game profile'};
const OPTIONS:Record<string,Record<string,string>>={scalingMode:{1:'Auto',2:'Integer',3:'Fit',4:'Fill',5:'Stretch'},scalingFilter:{1:'Linear',2:'Pixel',3:'FSR',4:'NIS'},overlayLevel:{0:'Off',1:'1',2:'2',3:'3',4:'4'}};
const SUFFIX:Record<string,string>={frameLimit:' FPS',refreshRate:' Hz',tdp:' W',gpuClock:' MHz'};
const PROFILES:Record<string,string>={'low-power':'Low power',balanced:'Balanced',performance:'Performance'};
function Control({id,adapter}:{id:string;adapter:SettingAdapter<PerformanceValue>}) {
    const s=useSyncExternalStore(adapter.subscribe,adapter.get),[draft,setDraft]=useState<number|null>(null);
    useEffect(()=>{if(!s.pending)setDraft(null);},[s.pending,s.value,s.error]);
    if(!s.available||s.value===null)return null;
    const Icon=id.startsWith('tdp')?LuZap:id.startsWith('gpu')?LuCpu:id.startsWith('overlay')?LuLayers:id.startsWith('scaling')?LuMaximize:id==='frameLimit'?LuGauge:LuMonitor;
    const label=<span className="gg-menu-setting-label"><Icon aria-hidden="true"/><span>{LABELS[id]}</span></span>;
    const set=(v:PerformanceValue)=>{void adapter.set(v).catch(()=>{/* Native snapshot owns error/readback. */});};
    const disabled=s.disabled||s.pending&&typeof s.value==='boolean';
    let field;
    if(id==='scalingMode'||id==='scalingFilter')field=<div className="gg-menu-performance-choice">{label}<Focusable className="gg-menu-choice-options" flow-children="row" aria-label={LABELS[id]}>{s.options?.map(value=><MenuAction key={String(value)} id={`performance:${id}:${value}`} selected={s.value===value} disabled={disabled} onAction={()=>set(value)}>{OPTIONS[id][String(value)]??String(value)}</MenuAction>)}</Focusable></div>;
    else if(typeof s.value==='boolean')field=<ToggleField highlightOnFocus={false} label={label} checked={s.value} disabled={disabled} onChange={set}/>;
    else {
        const values=s.options?.filter((v):v is number=>typeof v==='number');
        const index=(value:number)=>values?.reduce((best,v,i)=>Math.abs(v-value)<Math.abs(values[best]-value)?i:best,0)??value;
        const value=draft??s.value as number;
        const display=OPTIONS[id]?.[String(s.value)]??`${Number((s.value as number).toFixed(3))}${SUFFIX[id]??''}`;
        field=<SliderField highlightOnFocus={false} label={<span className="gg-menu-slider-label">{label}<output>{display}</output></span>} value={values?.length?index(value):value} min={values?.length?0:s.min} max={values?.length?values.length-1:s.max} step={values?.length?1:s.step??1} disabled={s.disabled} showValue={false} onChange={next=>{const v=values?.length?values[Math.round(next)]:next;if(v!==undefined){setDraft(v);set(v);}}}/>;
    }
    return <div className={`gg-menu-setting ${typeof s.value==='boolean'?'gg-menu-setting-toggle':'gg-menu-setting-slider'}${s.disabled?' gg-menu-setting-disabled':''}`} data-gg-focus={`performance:${id}`} aria-description={s.reason}>{field}{s.error&&<p className="gg-menu-error" role="alert">{s.error}</p>}</div>;
}
function ProfilePill({performance}:{performance:Performance}) {
    const adapter=performance.controls.profile,s=useSyncExternalStore(adapter.subscribe,adapter.get);
    if(!s.available)return null;
    return <div className="gg-menu-performance-profile"><h3>Performance profile</h3><Focusable className="gg-menu-profile-pill" flow-children="row" aria-label="Performance profile">{s.options?.map(value=><MenuAction key={String(value)} id={`performance:profile:${value}`} selected={s.value===value} disabled={s.pending||s.disabled} onAction={()=>{void adapter.set(value).catch(()=>{});}}>{PROFILES[String(value)]??String(value)}</MenuAction>)}</Focusable>{s.error&&<p className="gg-menu-error" role="alert">{s.error}</p>}</div>;
}
function PowerControls({performance}:{performance:Performance}) {
    const {controls:c}=performance;
    const tdp=useSyncExternalStore(c.tdpEnabled.subscribe,c.tdpEnabled.get),gpu=useSyncExternalStore(c.gpuClockEnabled.subscribe,c.gpuClockEnabled.get);
    return <Focusable className="gg-menu-perf-power" flow-children="column"><Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}><Control id="tdpEnabled" adapter={c.tdpEnabled}/><Control id="gpuClockEnabled" adapter={c.gpuClockEnabled}/></Focusable><Focusable className="gg-menu-quick-sliders" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{tdp.value===true&&<Control id="tdp" adapter={c.tdp}/>} {gpu.value===true&&<Control id="gpuClock" adapter={c.gpuClock}/>}</Focusable></Focusable>;
}
export function PerformancePanel({performance,handoff}:{performance:Performance;handoff(request:NativeRequest):void}) {
    const [section,setSection]=useState<typeof SECTIONS[number]>('General');
    const profile=useSyncExternalStore(performance.subscribeProfile,performance.getProfile),c=performance.controls;
    const controls=(ids:string[])=>ids.map(id=><Control key={id} id={id} adapter={c[id]}/>);
    return <div className="gg-menu-performance"><h2>Performance</h2>{profile.power&&<p className="gg-menu-performance-power">{profile.power.charging?'Plugged in':'On battery'} · {profile.power.percent}%{profile.power.secondsRemaining?` · ${Math.ceil(profile.power.secondsRemaining/60)} min ${profile.power.charging?'to full':'remaining'}`:''}</p>}
        <Focusable className="gg-menu-perf-tabs" flow-children="row" aria-label="Performance sections">{SECTIONS.map(value=><MenuAction key={value} id={`performance:section:${value}`} selected={section===value} onAction={()=>setSection(value)}>{value}</MenuAction>)}</Focusable>
        {section==='General'&&<><ProfilePill performance={performance}/><div className="gg-menu-profile-context"><span>{profile.label}</span><Control id="perGame" adapter={c.perGame}/></div><Control id="frameLimit" adapter={c.frameLimit}/><Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{controls(['disableLimit','vrr','hdr','tearing','halfRate'])}</Focusable></>}
        {section==='Display'&&<Focusable className="gg-menu-perf-display" flow-children="column">{controls(['refreshRate','scalingMode','scalingFilter'])}</Focusable>}
        {section==='Power & GPU'&&<PowerControls performance={performance}/>}
        {section==='Overlay'&&<Focusable flow-children="column">{controls(['overlayLevel','overlaySteam'])}</Focusable>}
        <div className="gg-menu-perf-actions"><MenuAction id="performance:native" onAction={()=>handoff({kind:'qam',tab:'performance'})}>Open Steam Performance</MenuAction><MenuAction id="performance:reset" onAction={()=>handoff({kind:'qam',tab:'performance'})}>Reset in Steam</MenuAction></div>
    </div>;
}
