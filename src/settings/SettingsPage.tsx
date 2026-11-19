import { DialogButton, Focusable, Navigation } from '@decky/ui';
import { Component, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
    LuBell, LuBluetooth, LuChevronRight, LuCircleCheck, LuCloud, LuDownload, LuGamepad, LuGamepad2, LuInfo, LuKeyboard, LuLayers, LuLock,
    LuMessageCircle, LuMonitor, LuMonitorPlay, LuPalette, LuPersonStanding, LuPower, LuSettings, LuTv, LuUser, LuUsers, LuVolume2,
} from 'react-icons/lu';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { browserStores, capsuleUrls, heroUrls } from '../home/artwork';
import { sharedLibraryBindings } from '../library/steamLibrary';
import { playNavSound } from '../home/navSound';
import { takeSteamFocus } from '../home/steamFocus';
import { PageFrame, type PadEvent } from '../pageKit/PageKit';
import { routeSource, type RouteSource } from '../search/steam';
import { glanceFor, type Glance, type SettingsSnapshot } from './settingsGlance';
import { closedPreview, entryOf, GROUPS, jumpGroup, moveFocus, steamRoute, type EntryKey } from './settingsModel';
import { settingsGateChoice, settingsMemory } from './settingsState';
import { settingsStyles } from './settingsStyles';
import { sharedSettingsReaders, type SettingsReaders } from './steamSettings';

type AnyComponent = ComponentType<Record<string, unknown>>;
const Button = DialogButton as unknown as AnyComponent;
const Area = Focusable as unknown as AnyComponent;

const ICONS: Record<EntryKey, IconType> = {
    display: LuMonitor, sound: LuVolume2, bluetooth: LuBluetooth, controllers: LuGamepad2, keyboard: LuKeyboard, power: LuPower,
    ingame: LuGamepad, recording: LuMonitorPlay, compat: LuLayers, downloads: LuDownload, cloud: LuCloud, remoteplay: LuTv,
    friends: LuMessageCircle, family: LuUsers, notifications: LuBell, account: LuUser, customization: LuPalette, accessibility: LuPersonStanding,
    system: LuInfo, interface: LuSettings, security: LuLock,
};

export interface SettingsViewProps {
    focus: EntryKey;
    glance: Glance;
    onFocus(k: EntryKey): void;
    onMove(k: EntryKey): void;
    onOpen(k: EntryKey): void;
    onBack(): void;
    /** B in the panel: focus goes back to the list's entry (spec §3). */
    onPanelBack(): void;
    /** The page's background art (the last played game's hero), blurred by the kit; none: the kit's shade alone. */
    backdrop: string | null;
}

/** The most recently played game's app id (shortcuts included); null when nothing has been played. */
export function recentGame(games: { appId: number; lastPlayed: number }[]): number | null {
    let best: { appId: number; lastPlayed: number } | null = null;
    for (const g of games) if (g.lastPlayed > 0 && (!best || g.lastPlayed > best.lastPlayed)) best = g;
    return best?.appId ?? null;
}

/**
 * L1/R1 jump a group from anywhere on the page; Up/Down cross into the neighbouring group only from the list's first or
 * last entry of a group, never from the panel's More (final review), so that handler sits on the entries alone.
 */
function listButtons(p: SettingsViewProps, scope: 'page' | 'entries') {
    return (evt: PadEvent) => {
        const b = Number(evt?.detail?.button);
        const entries = GROUPS.find(g => g.entries.some(e => e.key === p.focus))?.entries ?? [];
        let next: EntryKey | null = null;
        if (scope === 'page' && (b === 5 || b === 6)) next = jumpGroup(p.focus, b === 5 ? -1 : 1);
        else if (scope === 'entries' && b === 9 && entries[0]?.key === p.focus) next = moveFocus(p.focus, 'up');
        else if (scope === 'entries' && b === 10 && entries[entries.length - 1]?.key === p.focus) next = moveFocus(p.focus, 'down');
        if (next === null) return;
        evt.preventDefault?.();
        evt.stopPropagation?.();
        if (next === p.focus) return;
        playNavSound(b === 5 || b === 6 ? 'ChangeTabs' : 'BasicNav');
        p.onMove(next);
    };
}

function Panel({ p }: { p: SettingsViewProps }) {
    const Icon = ICONS[p.focus];
    const g = p.glance;
    return <Area className="gg-settings-panel" flow-children="column" onCancelActionDescription="Back"
        onCancelButton={(evt?: PadEvent) => { evt?.preventDefault?.(); evt?.stopPropagation?.(); p.onPanelBack(); }}>
        <div className="gg-settings-head"><Icon /><div><h2 className="gg-settings-title">{g.title}</h2><p className="gg-settings-desc">{g.description}</p></div></div>
        {g.items.length > 0 && <div className="gg-settings-items">{g.items.map(i => <div key={i.name} className="gg-settings-item">
            <span className="gg-settings-item-name">{i.name}</span><span className="gg-settings-item-state" data-ok={i.ok}>{i.state}</span>
        </div>)}</div>}
        {g.rows.length > 0 && <div className="gg-settings-rows">{g.rows.map(r => <div key={r.label} className="gg-settings-row">
            <span>{r.label}</span><span className="gg-settings-row-value">{r.value}</span>
        </div>)}</div>}
        {g.inMenu && <div className="gg-settings-menu"><LuCircleCheck /><span>{g.inMenu}</span></div>}
        <div className="gg-settings-foot">
            <Button className="gg-settings-more" data-gg-focus="settings:more" onClick={() => p.onOpen(p.focus)} onOKActionDescription="Open">
                <span>More in Steam's settings</span><LuChevronRight />
            </Button>
        </div>
    </Area>;
}

/** Game Glance's Settings home (mock-ups S2c and S2b): the grouped list, only the focused entry's group open, and its panel. */
export function SettingsPageView(p: SettingsViewProps) {
    const open = entryOf(p.focus).group;
    return <PageFrame className="gg-settings" title="Settings" onBack={p.onBack} onButtonDown={listButtons(p, 'page')}
        backdrop={<>
            <style>{settingsStyles}</style>
            {p.backdrop && <div className="gg-pk-backdrop" style={{ backgroundImage: `url("${p.backdrop}")` }} />}
            <div className="gg-pk-shade" />
        </>}>
        <Area className="gg-settings-list" flow-children="column">
            {GROUPS.map(g => g.name === open
                ? <div key={g.name} className="gg-settings-group gg-settings-open">
                    <p className="gg-pk-eyebrow">{g.name}</p>
                    <Area className="gg-settings-entries" flow-children="column" onButtonDown={listButtons(p, 'entries')}>{g.entries.map(e => {
                        const Icon = ICONS[e.key];
                        return <Button key={e.key} className="gg-settings-entry" data-gg-focus={`settings:${e.key}`} onClick={() => p.onOpen(e.key)}
                            onOKActionDescription="Open" onFocus={() => p.onFocus(e.key)}><Icon /><span>{e.name}</span></Button>;
                    })}</Area>
                </div>
                : <div key={g.name} className="gg-settings-group">
                    <p className="gg-pk-eyebrow">{g.name}</p>
                    <span className="gg-settings-preview">{closedPreview(g.name)}</span>
                </div>)}
        </Area>
        <Panel p={p} />
    </PageFrame>;
}

// ---- The live page ---------------------------------------------------------------------------------------------------

function focusKey(root: ParentNode | null | undefined, key: string): boolean {
    const el = root?.querySelector<HTMLElement>(`[data-gg-focus="${key}"]`);
    if (!el) return false;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
    return true;
}

/** Game Glance's Settings home, live from Steam's stores (spec §3); reads only. */
export function SettingsPage({ readers }: { readers: SettingsReaders }) {
    const [focus, setFocus] = useState<EntryKey>(() => settingsMemory.get().focus);
    const [snap, setSnap] = useState<SettingsSnapshot>(() => readers.readNow());
    const host = useRef<HTMLDivElement | null>(null);
    // Frosted like the other pages (Michael, PS5 check): the last played game's hero, blurred by the kit's backdrop.
    const [backdrop] = useState<string | null>(() => {
        try {
            const appId = recentGame(sharedLibraryBindings().read()?.games ?? []);
            return appId === null ? null : heroUrls(appId, browserStores)[0] ?? capsuleUrls(appId, browserStores)[0] ?? null;
        } catch { return null; }
    });
    const placeOn = useRef<EntryKey | null>(focus); // the entry to give focus to after this render (first render, and moves across groups)

    useEffect(() => {
        let live = true;
        void readers.readLive().then(more => { if (live) setSnap(s => ({ ...s, ...more })); });
        return () => { live = false; };
    }, [readers]);
    useLayoutEffect(() => {
        if (placeOn.current && focusKey(host.current, `settings:${placeOn.current}`)) placeOn.current = null;
    });

    const onMove = (key: EntryKey) => { placeOn.current = key; setFocus(key); settingsMemory.remember({ focus: key }); };
    const onFocus = (key: EntryKey) => { if (key !== focus) { setFocus(key); settingsMemory.remember({ focus: key }); } };
    const onOpen = (key: EntryKey) => {
        settingsMemory.remember({ focus: key });
        Navigation.Navigate(steamRoute(key, readers.firstController()));
    };
    return <div ref={host} style={{ height: '100%' }}>
        <SettingsPageView focus={focus} glance={glanceFor(snap, focus)} onFocus={onFocus} onMove={onMove} onOpen={onOpen} onBack={() => Navigation.NavigateBack()}
            onPanelBack={() => focusKey(host.current, `settings:${focus}`)} backdrop={backdrop} />
    </div>;
}

/** A render failure shows Steam's Settings for this visit. */
class SettingsBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: unknown) { console.error(`${LOG_PREFIX} Settings render failed; showing Steam's`, error); }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const steamHistory = () => (globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { History?: { location?: { pathname?: string }; listen?(fn: () => void): unknown } } } } })
    .SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.History;
let sharedRoute: RouteSource | null = null;
const settingsRoute = () => sharedRoute ??= routeSource(steamHistory as () => never);

/** Steam's `/settings` route renders this: the Settings home on the bare path, Steam's own element everywhere else (spec §1). */
export function SettingsGate({ native, readers = sharedSettingsReaders(), route = settingsRoute() }: { native: ReactNode; readers?: SettingsReaders; route?: RouteSource }): ReactNode {
    const path = useSyncExternalStore(route.subscribe, route.get);
    const enabled = useSettings().settingsPage;
    const last = useRef<'ours' | 'native' | undefined>(undefined);
    const choice = settingsGateChoice({ enabled, path }, last.current);
    last.current = choice;
    if (choice === 'native') return native;
    return <SettingsBoundary fallback={native}><SettingsPage readers={readers} /></SettingsBoundary>;
}
