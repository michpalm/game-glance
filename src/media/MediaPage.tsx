import { ConfirmModal, DialogButton, Focusable, Menu, MenuItem, Navigation, showContextMenu, showModal } from '@decky/ui';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { browserStores, landscapeUrls } from '../home/artwork';
import { NAV_MAINTAIN_X } from '../home/focusZones';
import { takeSteamFocus } from '../home/steamFocus';
import { CoverImg, keepCoverInView, LibraryLogo } from '../library/LibraryPage';
import { Eyebrow, PageFrame, shoulderHandler, Tabs, type PadEvent } from '../pageKit/PageKit';
import { routeSource, type RouteSource } from '../search/steam';
import { buildItems, dayGroups, focusAfterDelete, formatDuration, formatWhen, mediaTabs, stepItem, tabItems, type MediaItem, type MediaTab, type ShotItem } from './mediaModel';
import { ensureMediaNativeReset, focusGone, mediaGateChoice, mediaMemory, runDelete, runUpload } from './mediaState';
import { mediaStyles } from './mediaStyles';
import { sharedMediaBindings, type MediaBindings } from './steamMedia';

type AnyComponent = ComponentType<Record<string, unknown>>;
const Button = DialogButton as unknown as AnyComponent;
const Area = Focusable as unknown as AnyComponent;

export type MediaScreen = { kind: 'gallery' } | { kind: 'viewer'; id: string } | { kind: 'full'; id: string };
export interface MediaViewProps {
    screen: MediaScreen;
    tab: MediaTab;
    tabs: ReturnType<typeof mediaTabs>;
    groups: ReturnType<typeof dayGroups>;
    /** The active tab's items, newest first. */
    items: MediaItem[];
    now: Date;
    focusId: string | null;
    name(item: MediaItem): string | null;
    /** A recording tile's art: its game's wide header (no frame of the video is read). */
    clipArt(appId: number): string[];
    message: string | null;
    stripVisible: boolean;
    onTab(tab: MediaTab): void;
    onFocus(id: string): void;
    onOpen(item: MediaItem): void;
    onFull(item: MediaItem): void;
    onStep(step: -1 | 1): void;
    onUpload(item: MediaItem): void;
    onDelete(item: MediaItem): void;
    onSteamMedia(): void;
    onBack(): void;
    /** Any press in full screen (the strip comes back). */
    onPress(): void;
}

/** The gallery's tiles (mock-up M1): 5 a row of 330 × 186 units, 20 apart. */
export const GALLERY = { cols: 5, tileW: 330, tileH: 186, gap: 20 };
const RING_ROOM = 10;
const FOOTER_ROOM = 72;
const footerRoomPx = (el: HTMLElement) => Math.round(FOOTER_ROOM * ((el.ownerDocument?.defaultView?.innerWidth ?? 1920) / 1920));
const FILM = 7;

const isShot = (i: MediaItem): i is ShotItem => i.kind === 'shot';
/**
 * A step in the viewer and full screen: L1 (5) / D-pad left (11) back, R1 (6) / D-pad right (12) on (Michael, PS5 check:
 * up/down move through the actions, so left/right are free); else null.
 */
const shoulderStep = (evt: PadEvent): -1 | 1 | null => { const b = Number(evt?.detail?.button); return b === 5 || b === 11 ? -1 : b === 6 || b === 12 ? 1 : null; };

/** The buttons a shot or clip answers (spec §4), for a tile, the viewer and full screen alike. */
/** ≡ per screen (Michael, PS5 check 4): the gallery's way to Steam's media; the viewer's Full screen; nothing in full screen. */
type MenuUse = 'steam' | 'full' | 'none';
function itemButtons(p: MediaViewProps, item: MediaItem, menu: MenuUse = 'steam') {
    const upload = isShot(item) && !item.uploaded ? { onSecondaryButton: () => p.onUpload(item), onSecondaryActionDescription: 'Upload to Steam' } : {};
    return {
        ...upload,
        onOptionsButton: () => p.onDelete(item), onOptionsActionDescription: 'Delete',
        ...(menu === 'steam' ? { onMenuButton: () => p.onSteamMedia(), onMenuActionDescription: "Steam's media" }
            : menu === 'full' ? { onMenuButton: () => p.onFull(item), onMenuActionDescription: 'Full screen' } : {}),
    };
}

function Tile({ p, item }: { p: MediaViewProps; item: MediaItem }) {
    const name = p.name(item) ?? '';
    return <Button className="gg-media-tile" data-gg-focus={`media:${item.id}`} aria-label={name || (isShot(item) ? 'Screenshot' : 'Recording')}
        onClick={() => p.onOpen(item)} onOKActionDescription={isShot(item) ? 'View' : 'Play'} {...itemButtons(p, item)}
        onFocus={(evt: { currentTarget?: HTMLElement } | undefined) => {
            const el = evt?.currentTarget;
            if (el) keepCoverInView(el.closest<HTMLElement>('.gg-media-grid'), el, RING_ROOM, footerRoomPx(el));
            p.onFocus(item.id);
        }}>
        {isShot(item)
            ? <CoverImg urls={[item.url]} lazy alt="" fallback={<span className="gg-media-tile-name">{name}</span>} />
            : <>
                <CoverImg urls={p.clipArt(item.appId)} lazy alt="" fallback={<span className="gg-media-tile-name">{name || item.title}</span>} />
                <span className="gg-media-clip"><span aria-hidden="true">▶</span>{formatDuration(item.durationMs)}</span>
            </>}
        {isShot(item) && item.uploaded && <span className="gg-media-badge">Uploaded</span>}
    </Button>;
}

function Gallery({ p }: { p: MediaViewProps }) {
    const newest = p.items.find(isShot);
    return <PageFrame className="gg-media" title="Media" onBack={p.onBack}
        onButtonDown={shoulderHandler(p.tabs.map(t => t.key), p.tab, key => p.onTab(key as MediaTab))}
        backdrop={<>
            <style>{mediaStyles}</style>
            {newest && <div className="gg-pk-backdrop" style={{ backgroundImage: `url("${newest.url}")` }} />}
            <div className="gg-pk-shade" />
        </>}>
        <div className="gg-media-tabs"><Tabs tabs={p.tabs} active={p.tab} onChange={key => p.onTab(key as MediaTab)} /></div>
        {p.items.length === 0
            ? <Area className="gg-media-empty" flow-children="column">
                <span>Nothing captured yet</span>
                <Button className="gg-media-plain" data-gg-focus="media:steam" onClick={p.onSteamMedia}>Steam's media</Button>
            </Area>
            : <Area className="gg-media-grid" flow-children="column">
                {p.groups.map(g => {
                    const rows: ReactNode[] = [];
                    for (let at = 0; at < g.items.length; at += GALLERY.cols) {
                        rows.push(<Area key={g.items[at].id} className="gg-media-row" flow-children="row" navEntryPreferPosition={NAV_MAINTAIN_X}>
                            {g.items.slice(at, at + GALLERY.cols).map(item => <Tile key={item.id} p={p} item={item} />)}
                        </Area>);
                    }
                    return <div key={`${g.label}:${g.items[0].id}`} className="gg-media-day-group"><div className="gg-media-day"><Eyebrow>{g.label}</Eyebrow></div>{rows}</div>;
                })}
            </Area>}
        {p.message && <div className="gg-media-toast" role="status">{p.message}</div>}
    </PageFrame>;
}

/** Up to `FILM` shots around `index`, kept inside the list. */
function filmWindow(count: number, index: number): { first: number; last: number } {
    const first = Math.max(0, Math.min(index - Math.floor(FILM / 2), count - FILM));
    return { first, last: Math.min(count - 1, first + FILM - 1) };
}

function Viewer({ p, shot, shots }: { p: MediaViewProps; shot: ShotItem; shots: ShotItem[] }) {
    const name = p.name(shot);
    const index = shots.findIndex(s => s.id === shot.id);
    const { first, last } = filmWindow(shots.length, index);
    const buttons = itemButtons(p, shot, 'full');
    const action = (label: string, onClick: () => void, focus = false) =>
        <Button className="gg-media-action" data-gg-focus={`media-action:${label}`} preferredFocus={focus || undefined} onClick={onClick} {...buttons}>
            <span>{label}</span>
        </Button>;
    return <PageFrame className="gg-media gg-media-viewer" title="Media" onBack={p.onBack}
        onButtonDown={(evt: PadEvent) => { const s = shoulderStep(evt); if (s !== null) { evt.preventDefault?.(); evt.stopPropagation?.(); p.onStep(s); } }}
        backdrop={<>
            <style>{mediaStyles}</style>
            <div className="gg-pk-backdrop" style={{ backgroundImage: `url("${shot.url}")` }} />
            <div className="gg-pk-shade" />
        </>}>
        <div className="gg-media-view-shot"><CoverImg urls={[shot.url]} alt="" /></div>
        <Area className="gg-media-panel" flow-children="column">
            <LibraryLogo appId={shot.appId} name={name ?? ''} />
            <span className="gg-media-panel-line">{formatWhen(shot.created, p.now)}</span>
            <span className="gg-media-panel-line">{`Screenshot · ${shot.width} × ${shot.height}`}</span>
            {shot.uploaded && <span className="gg-media-uploaded">Uploaded</span>}
            <Area className="gg-media-actions" flow-children="column">
                {action('Full screen', () => p.onFull(shot), true)}
                {!shot.uploaded && action('Upload to Steam', () => p.onUpload(shot))}
                {action('Delete', () => p.onDelete(shot))}
            </Area>
        </Area>
        <div className="gg-media-strip-row">
            {shots.slice(first, last + 1).map(s => <div key={s.id} className={s.id === shot.id ? 'gg-media-film gg-media-film-current' : 'gg-media-film'}>
                <CoverImg urls={[s.url]} lazy alt="" />
            </div>)}
        </div>
        {p.message && <div className="gg-media-toast" role="status">{p.message}</div>}
    </PageFrame>;
}

function FullScreen({ p, shot, shots }: { p: MediaViewProps; shot: ShotItem; shots: ShotItem[] }) {
    const name = p.name(shot);
    return <PageFrame className="gg-media gg-media-full" title="Media" onBack={p.onBack}
        onButtonDown={(evt: PadEvent) => {
            p.onPress();
            const s = shoulderStep(evt);
            if (s !== null) { evt.preventDefault?.(); evt.stopPropagation?.(); p.onStep(s); }
        }}
        backdrop={<style>{mediaStyles}</style>}>
        <Button className="gg-media-full-shot" data-gg-focus={`media-full:${shot.id}`} preferredFocus noFocusRing onClick={p.onPress} {...itemButtons(p, shot, 'none')}>
            <CoverImg urls={[shot.url]} alt="" />
        </Button>
        <div className="gg-media-strip" data-visible={p.stripVisible}>
            {name && <span className="gg-media-strip-name">{name}</span>}
            <span>{formatWhen(shot.created, p.now)}</span>
            <span className="gg-media-strip-count">{`${shots.findIndex(s => s.id === shot.id) + 1} of ${shots.length}`}</span>
        </div>
        {p.message && <div className="gg-media-toast" role="status">{p.message}</div>}
    </PageFrame>;
}

/** Game Glance's Media: the gallery (M1), one shot with its details (M3b), or full screen (M4). */
export function MediaPageView(p: MediaViewProps) {
    if (p.screen.kind !== 'gallery') {
        const shots = p.items.filter(isShot);
        const id = p.screen.id;
        const shot = shots.find(s => s.id === id);
        if (shot) return p.screen.kind === 'viewer' ? <Viewer p={p} shot={shot} shots={shots} /> : <FullScreen p={p} shot={shot} shots={shots} />;
    }
    return <Gallery p={p} />;
}

// ---- The live page ---------------------------------------------------------------------------------------------------

const STRIP_MS = 2500;
const MESSAGE_MS = 3000;
const PRIVACY: { label: string; value: 0 | 1 | 2 }[] = [{ label: 'Public', value: 0 }, { label: 'Friends only', value: 1 }, { label: 'Private', value: 2 }];

const steamHistory = () => (globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { History?: { location?: { pathname?: string }; listen?(fn: () => void): unknown } } } } })
    .SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.History;
/** "Steam's media" resets on leaving Media; watching starts once Steam's history exists. */
export const watchMediaNativeReset = () => ensureMediaNativeReset(steamHistory);

const clipArtOf = (appId: number) => { if (!appId) return []; try { return landscapeUrls(appId, browserStores); } catch { return []; } };

function focusKey(root: ParentNode | null | undefined, key: string): boolean {
    const el = root?.querySelector<HTMLElement>(`[data-gg-focus="${CSS.escape(key)}"]`);
    if (!el) return false;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
    return true;
}

/** Game Glance's Media, live from Steam's screenshots and recordings (spec §1–§5); Steam's page if they can't be read. */
export function MediaPage({ bindings, native }: { bindings: MediaBindings; native: ReactNode }) {
    const [items, setItems] = useState<MediaItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<MediaTab>(() => mediaMemory.get().tab);
    const [screen, setScreen] = useState<MediaScreen>({ kind: 'gallery' });
    const [focusId, setFocusId] = useState<string | null>(() => mediaMemory.get().focusId);
    const [message, setMessage] = useState<string | null>(null);
    const [stripVisible, setStripVisible] = useState(true);
    const host = useRef<HTMLDivElement | null>(null);
    const stripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Read on open, and again when Steam writes a new screenshot (it joins the top; the highlight stays on its item).
    useEffect(() => {
        let live = true;
        const load = () => bindings.list().then(r => {
            if (!live) return;
            if (!r) { setFailed(true); return; }
            setItems(buildItems(r.shots, r.clips));
        });
        void load();
        const stop = bindings.onNewShot(() => { void load(); });
        return () => { live = false; stop(); };
    }, [bindings]);
    useEffect(() => () => {
        if (stripTimer.current) clearTimeout(stripTimer.current);
        if (messageTimer.current) clearTimeout(messageTimer.current);
    }, []);
    useEffect(() => { mediaMemory.remember({ tab, focusId }); }, [tab, focusId]);

    const list = useMemo(() => tabItems(items ?? [], tab), [items, tab]);
    const shots = useMemo(() => list.filter((i): i is ShotItem => i.kind === 'shot'), [list]);
    const now = new Date();
    const groups = useMemo(() => dayGroups(list, now), [list, now.toDateString()]);
    const tabs = useMemo(() => mediaTabs(items ?? []), [items]);

    // Focus: on each screen, and again whenever the list changes under the gallery (a new shot moves tiles between rows).
    const focusTarget = screen.kind === 'viewer' ? 'media-action:Full screen'
        : screen.kind === 'full' ? `media-full:${screen.id}`
            : focusId && list.some(i => i.id === focusId) ? `media:${focusId}`
                : list[0] ? `media:${list[0].id}` : 'media:steam';
    const placed = useRef<string | null>(null);
    useLayoutEffect(() => {
        if (items === null) return;
        const doc = host.current?.ownerDocument, active = doc?.activeElement as HTMLElement | null | undefined;
        const lost = focusGone(active, doc?.body);
        if (placed.current === focusTarget && !lost) return;
        if (focusKey(host.current, focusTarget)) placed.current = focusTarget;
    });

    const say = (text: string) => {
        setMessage(text);
        if (messageTimer.current) clearTimeout(messageTimer.current);
        messageTimer.current = setTimeout(() => setMessage(null), MESSAGE_MS);
    };
    const showStrip = () => {
        setStripVisible(true);
        if (stripTimer.current) clearTimeout(stripTimer.current);
        stripTimer.current = setTimeout(() => setStripVisible(false), STRIP_MS);
    };

    const onTab = (next: MediaTab) => {
        if (next === tab) return;
        setTab(next);
        setFocusId(tabItems(items ?? [], next)[0]?.id ?? null);
    };
    const onOpen = (item: MediaItem) => {
        if (item.kind === 'clip') {
            // Steam's own page and player show a recording (spec §1); leaving Media brings ours back.
            mediaMemory.set({ native: true, focusId: item.id });
            Navigation.Navigate(`/media/item/clip/${item.id.replace(/^clip_/, '')}`);
            return;
        }
        setFocusId(item.id);
        setScreen({ kind: 'viewer', id: item.id });
    };
    const onFull = (item: MediaItem) => { setScreen({ kind: 'full', id: item.id }); showStrip(); };
    const onStep = (step: -1 | 1) => {
        if (screen.kind === 'gallery') return;
        const next = stepItem(shots, screen.id, step);
        if (!next || next === screen.id) return;
        setFocusId(next);
        setScreen({ kind: screen.kind, id: next });
        if (screen.kind === 'full') showStrip();
    };
    const onBack = () => {
        if (screen.kind === 'full') setScreen({ kind: 'viewer', id: screen.id });
        else if (screen.kind === 'viewer') { setFocusId(screen.id); setScreen({ kind: 'gallery' }); }
        else Navigation.NavigateBack();
    };
    const anchor = () => host.current?.querySelector<HTMLElement>(`[data-gg-focus="${CSS.escape(focusTarget)}"]`) ?? host.current ?? undefined;
    const onUpload = (item: MediaItem) => {
        if (item.kind !== 'shot' || item.uploaded) return;
        const pick = (privacy: 0 | 1 | 2) => {
            void runUpload(item, privacy, bindings.upload).then(ok => {
                if (ok) setItems(all => all?.map(i => (i.id === item.id && i.kind === 'shot' ? { ...i, uploaded: true } : i)) ?? all);
                else say("Couldn't upload");
            });
        };
        showContextMenu(<Menu label="Who can see it?" cancelText="Cancel">
            {PRIVACY.map(p => <MenuItem key={p.value} onSelected={() => pick(p.value)}>{p.label}</MenuItem>)}
        </Menu>, anchor());
    };
    const onDelete = (item: MediaItem) => {
        const isShot = item.kind === 'shot';
        const remove = async () => {
            const inViewer = screen.kind !== 'gallery';
            const galleryNext = focusAfterDelete(list, item.id);
            const result = await runDelete(item, inViewer ? shots : list, bindings.remove);
            if (!result.ok) { say("Couldn't delete"); return; }
            setItems(all => all?.filter(i => i.id !== item.id) ?? all);
            if (inViewer && result.focusId) { setFocusId(result.focusId); setScreen({ kind: screen.kind, id: result.focusId }); }
            else { setFocusId(inViewer ? galleryNext : result.focusId); setScreen({ kind: 'gallery' }); }
        };
        const props = {
            strTitle: isShot ? 'Delete screenshot?' : 'Delete recording?',
            strDescription: "It is removed from this device. This can't be undone.",
            strOKButtonText: 'Delete', strCancelButtonText: 'Cancel', onOK: () => { void remove(); },
        };
        showModal(<ConfirmModal {...(props as object)} />, host.current?.ownerDocument?.defaultView ?? undefined);
    };
    const onSteamMedia = () => mediaMemory.set({ native: true, tab, focusId });

    if (failed) return <>{native}</>;
    if (items === null) return <div ref={host} style={{ height: '100%' }} />;
    return <div ref={host} style={{ height: '100%' }}>
        <MediaPageView screen={screen} tab={tab} tabs={tabs} groups={groups} items={list} now={now} focusId={focusId}
            name={bindings.gameName} clipArt={clipArtOf} message={message} stripVisible={stripVisible}
            onTab={onTab} onFocus={setFocusId} onOpen={onOpen} onFull={onFull} onStep={onStep} onUpload={onUpload}
            onDelete={onDelete} onSteamMedia={onSteamMedia} onBack={onBack} onPress={showStrip} />
    </div>;
}

/** A render failure shows Steam's Media for this visit. */
class MediaBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: unknown) { console.error(`${LOG_PREFIX} Media render failed; showing Steam's`, error); }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

let sharedRoute: RouteSource | null = null;
const mediaRoute = () => sharedRoute ??= routeSource(steamHistory as () => never);

/** Steam's `/media` route renders this: Game Glance's Media, or Steam's own element (spec §1). */
export function MediaGate({ native, bindings = sharedMediaBindings(), route = mediaRoute() }: { native: ReactNode; bindings?: MediaBindings; route?: RouteSource }): ReactNode {
    watchMediaNativeReset();
    const memory = useSyncExternalStore(mediaMemory.subscribe, mediaMemory.get);
    const path = useSyncExternalStore(route.subscribe, route.get);
    const enabled = useSettings().mediaPage;
    const last = useRef<'ours' | 'native' | undefined>(undefined);
    const choice = mediaGateChoice({ enabled, available: bindings.available(), path, native: memory.native }, last.current);
    last.current = choice;
    if (choice === 'native') return native;
    return <MediaBoundary fallback={native}><MediaPage bindings={bindings} native={native} /></MediaBoundary>;
}
