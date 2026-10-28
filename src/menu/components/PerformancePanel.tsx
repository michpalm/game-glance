import { Focusable, NavEntryPositionPreferences, SliderField, ToggleField } from '@decky/ui';
import { useEffect, useState, useSyncExternalStore, type ComponentType } from 'react';
import { LuEye, LuGauge, LuImage, LuLayers } from 'react-icons/lu';
import { steamPerformanceIcon } from '../steam/performanceIcons';
import type { SettingAdapter } from '../steam/setting';
import { PERFORMANCE_OVERLAY_LEVELS, type createPerformance, type PerformanceValue } from '../steam/performance';
import { MenuAction } from './MenuAction';
import { SettingSegments } from './SettingSegments';

type Performance = ReturnType<typeof createPerformance>;
const SECTIONS = ['Display', 'Scaling', 'Power & GPU', 'Overlay'] as const;
const LABELS: Record<string, string> = {
    frameLimit: 'Frame limit', disableLimit: 'Disable limit', vrr: 'VRR', hdr: 'HDR',
    tearing: 'Allow tearing', halfRate: 'Half-rate shading', refreshRate: 'Refresh rate',
    scalingMode: 'Scaling mode', scalingFilter: 'Scaling filter', sharpness: 'Sharpness',
    tdpEnabled: 'TDP limit', tdp: 'Power limit', gpuClockEnabled: 'Manual GPU clock',
    gpuClock: 'GPU clock', overlayLevel: 'Overlay level', overlaySteam: 'Show overlay in Steam',
    perGame: 'Per-game profile',
};
const OPTIONS: Record<string, Record<string, string>> = {
    scalingMode: { 1: 'Auto', 2: 'Integer', 3: 'Fit', 4: 'Fill', 5: 'Stretch' },
    scalingFilter: { 1: 'Linear', 2: 'Pixel', 3: 'Sharp', 4: 'NIS' },
    overlayLevel: Object.fromEntries(PERFORMANCE_OVERLAY_LEVELS.map(level => [level.value, level.label])),
};
const SUFFIX: Record<string, string> = { frameLimit: ' FPS', refreshRate: ' Hz', tdp: ' W', gpuClock: ' MHz' };
const PROFILES: Record<string, string> = { 'low-power': 'Low power', balanced: 'Balanced', performance: 'Performance' };

// Steam's own Performance art where it has some; otherwise one of ours, so every row has an icon.
const FALLBACK_ICONS: Record<string, ComponentType> = { frameLimit: LuGauge, overlayLevel: LuLayers, overlaySteam: LuEye };
export function settingIcon(id: string): ComponentType | undefined {
    return id === 'hdr' ? LuImage : steamPerformanceIcon(id) ?? FALLBACK_ICONS[id];
}

function Control({ id, adapter }: { id: string; adapter: SettingAdapter<PerformanceValue> }) {
    const s = useSyncExternalStore(adapter.subscribe, adapter.get);
    const [draft, setDraft] = useState<number | null>(null);
    useEffect(() => { if (!s.pending) setDraft(null); }, [s.pending, s.value, s.error]);
    if (!s.available || s.value === null) return null;
    const Icon = settingIcon(id);
    const label = <span className="gg-menu-setting-label">
        {Icon && <span aria-hidden="true" className="gg-menu-native-icon"><Icon /></span>}
        <span>{LABELS[id]}</span>
    </span>;
    const set = (value: PerformanceValue) => { void adapter.set(value).catch(() => { /* Snapshot owns error/readback. */ }); };
    let field;
    if (typeof s.value === 'boolean') {
        field = <ToggleField highlightOnFocus={false} label={label} checked={s.value}
            disabled={s.disabled || s.pending} onChange={set} />;
    } else if ((id === 'scalingMode' || id === 'scalingFilter') && s.options?.length && s.options.length <= 5) {
        field = <><div className="gg-menu-setting-header">{label}</div><SettingSegments id={`performance:${id}`} label={LABELS[id]}
            options={s.options} value={s.value} labels={OPTIONS[id]} disabled={s.disabled || s.pending} onSelect={set} /></>;
    } else {
        const values = s.options?.filter((value): value is number => typeof value === 'number');
        const index = (value: number) => values?.reduce((best, v, i) =>
            Math.abs(v - value) < Math.abs(values[best] - value) ? i : best, 0) ?? value;
        const value = draft ?? s.value as number;
        const display = OPTIONS[id]?.[String(s.value)] ?? `${Number((s.value as number).toFixed(3))}${SUFFIX[id] ?? ''}`;
        field = <SliderField highlightOnFocus={false}
            label={<span className="gg-menu-slider-label">{label}<output>{display}</output></span>}
            value={values?.length ? index(value) : value} min={values?.length ? 0 : s.min}
            max={values?.length ? values.length - 1 : s.max} step={values?.length ? 1 : s.step ?? 1}
            disabled={s.disabled} showValue={false}
            onChange={next => {
                const nextValue = values?.length ? values[Math.round(next)] : next;
                if (nextValue !== undefined) { setDraft(nextValue); set(nextValue); }
            }} />;
    }
    const named = id === 'scalingMode' || id === 'scalingFilter';
    return <div className={`gg-menu-setting ${named ? 'gg-menu-setting-segments' : typeof s.value === 'boolean' ? 'gg-menu-setting-toggle' : 'gg-menu-setting-slider'}${s.disabled ? ' gg-menu-setting-disabled' : ''}`}
        data-gg-focus={`performance:${id}`} aria-description={s.reason}>
        {field}{s.error && <p className="gg-menu-error" role="alert">{s.error}</p>}
    </div>;
}

function FrameControl({ performance }: { performance: Performance }) {
    const { controls: c } = performance;
    const limit = useSyncExternalStore(c.disableLimit.subscribe, c.disableLimit.get);
    const refresh = useSyncExternalStore(c.refreshRate.subscribe, c.refreshRate.get);
    // Steam replaces this one slot with the native Hz control when the FPS cap is disabled.
    const id = limit.value === true && refresh.available ? 'refreshRate' : 'frameLimit';
    return <Control key={id} id={id} adapter={c[id]} />;
}

function ProfilePill({ performance }: { performance: Performance }) {
    const adapter = performance.controls.profile;
    const s = useSyncExternalStore(adapter.subscribe, adapter.get);
    if (!s.available) return null;
    return <div className="gg-menu-performance-profile"><div className="gg-menu-setting-header">Performance profile</div>
        <SettingSegments id="performance:profile" label="Performance profile" options={s.options ?? []} value={s.value} labels={PROFILES}
            disabled={s.pending || s.disabled} onSelect={value => { void adapter.set(value).catch(() => {}); }} />
        {s.error && <p className="gg-menu-error" role="alert">{s.error}</p>}
    </div>;
}

function ScalingControls({ performance }: { performance: Performance }) {
    const c = performance.controls;
    const sharpness = useSyncExternalStore(c.sharpness.subscribe, c.sharpness.get);
    return <Focusable className="gg-menu-perf-scaling" flow-children="column">
        <Control id="scalingMode" adapter={c.scalingMode} />
        <Control id="scalingFilter" adapter={c.scalingFilter} />
        {sharpness.available && !sharpness.disabled && <Control id="sharpness" adapter={c.sharpness} />}
    </Focusable>;
}

function PowerControls({ performance }: { performance: Performance }) {
    const c = performance.controls;
    const tdp = useSyncExternalStore(c.tdpEnabled.subscribe, c.tdpEnabled.get);
    const gpu = useSyncExternalStore(c.gpuClockEnabled.subscribe, c.gpuClockEnabled.get);
    return <Focusable className="gg-menu-perf-power" flow-children="column">
        <ProfilePill performance={performance} />
        <Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
            <Control id="tdpEnabled" adapter={c.tdpEnabled} /><Control id="gpuClockEnabled" adapter={c.gpuClockEnabled} />
        </Focusable>
        <Focusable className="gg-menu-quick-sliders" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
            {tdp.value === true && <Control id="tdp" adapter={c.tdp} />}
            {gpu.value === true && <Control id="gpuClock" adapter={c.gpuClock} />}
        </Focusable>
    </Focusable>;
}

export function PerformancePanel({ performance }: { performance: Performance }) {
    const [section, setSection] = useState<typeof SECTIONS[number]>('Display');
    const profile = useSyncExternalStore(performance.subscribeProfile, performance.getProfile);
    const c = performance.controls;
    return <div className="gg-menu-performance">
        <div className="gg-menu-performance-header">
            <div className="gg-menu-performance-heading"><h2>Performance and battery</h2>
                {profile.power && <p className="gg-menu-performance-power">
                    {profile.power.charging ? 'Plugged in' : 'On battery'} · {profile.power.percent}%
                    {profile.power.secondsRemaining ? ` · ${Math.ceil(profile.power.secondsRemaining / 60)} min ${profile.power.charging ? 'to full' : 'remaining'}` : ''}
                </p>}
            </div>
            <div className="gg-menu-profile-context" title={profile.label}><Control id="perGame" adapter={c.perGame} /></div>
        </div>
        <Focusable className="gg-menu-perf-tabs" flow-children="row" aria-label="Performance sections">
            {SECTIONS.map(value => <MenuAction key={value} id={`performance:section:${value}`}
                selected={section === value} onAction={() => setSection(value)}>{value}</MenuAction>)}
        </Focusable>
        <div className="gg-menu-perf-content">
            {section === 'Display' && <><FrameControl performance={performance} />
                <Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
                    {['disableLimit', 'vrr', 'hdr', 'tearing', 'halfRate'].map(id => <Control key={id} id={id} adapter={c[id]} />)}
                </Focusable></>}
            {section === 'Scaling' && <ScalingControls performance={performance} />}
            {section === 'Power & GPU' && <PowerControls performance={performance} />}
            {section === 'Overlay' && <Focusable flow-children="column">
                <Control id="overlayLevel" adapter={c.overlayLevel} /><Control id="overlaySteam" adapter={c.overlaySteam} />
            </Focusable>}
        </div>
    </div>;
}
