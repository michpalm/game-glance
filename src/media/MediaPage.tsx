import { ConfirmModal, DialogButton, Focusable, Menu, MenuItem, Navigation, showContextMenu, showModal } from '@decky/ui';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { browserStores, landscapeUrls } from '../home/artwork';
import { NAV_MAINTAIN_X } from '../home/focusZones';
import { takeSteamFocus } from '../home/steamFocus';
import { CoverImg, keepCoverInView } from '../library/LibraryPage';
import { Eyebrow, PageFrame, shoulderHandler, Tabs, type KitTab, type PadEvent } from '../pageKit/PageKit';
import { routeSource, type RouteSource } from '../search/steam';
import { buildItems, dayGroups, focusAfterDelete, formatDuration, formatWhen, gameCollections, itemsForGame, mediaTabs, stepItem, tabItems, type MediaGameCollection, type MediaItem, type MediaTab, type ShotItem } from './mediaModel';
import { ensureMediaNativeReset, focusGone, mediaGateChoice, mediaGameFromPath, mediaHasInvalidGameQuery, mediaItemFromPath, mediaKeepsNative, mediaMemory, mediaViewAfterTab, openingScreen, runDelete, runUpload } from './mediaState';
import { mediaStyles } from './mediaStyles';
import { sharedMediaBindings, type MediaBindings } from './steamMedia';

type AnyComponent = ComponentType<Record<string, unknown>>;
const Button = DialogButton as unknown as AnyComponent;
const Area = Focusable as unknown as AnyComponent;

export type MediaScreen = { kind: 'gallery' } | { kind: 'viewer'; id: string } | { kind: 'full'; id: string };
export interface MediaViewProps {
    screen: MediaScreen;
    tab: MediaTab | 'games';
    tabs: KitTab[];
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
    onTab(tab: MediaTab | 'games'): void;
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
    view?: 'all' | 'games';
    games?: MediaGameCollection[];
    gameId?: string | null;
    gameName?: string | null;
    onOpenGame?(gameId: string): void;
    onFocusGame?(gameId: string): void;
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
    return <PageFrame className="gg-media" title={p.gameId ? `Media — ${p.gameName || 'Unknown game'}` : 'Media'} onBack={p.onBack}
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

function GameCard({ p, game }: { p: MediaViewProps; game: MediaGameCollection }) {
    const art = game.artUrl ? [game.artUrl] : game.items.length ? p.clipArt(game.items[0].appId) : [];
    return <Button className="gg-media-game" data-gg-focus={`media-game:${game.gameId}`} aria-label={`${game.name}, ${game.screenshots} screenshots, ${game.recordings} recordings`}
        onClick={() => p.onOpenGame?.(game.gameId)} onOKActionDescription="Open game media"
        onFocus={(evt: { currentTarget?: HTMLElement } | undefined) => {
            const el = evt?.currentTarget;
            if (el) keepCoverInView(el.closest<HTMLElement>('.gg-media-games'), el, RING_ROOM, footerRoomPx(el));
            p.onFocusGame?.(game.gameId);
        }}>
        {art.length > 0 ? <CoverImg urls={art} lazy alt="" /> : <span className="gg-media-game-fallback" />}
        <span className="gg-media-game-shade" />
        <span className="gg-media-game-copy"><strong>{game.name}</strong><small>{`${game.screenshots} screenshots · ${game.recordings} recordings`}</small></span>
    </Button>;
}

function GamesIndex({ p }: { p: MediaViewProps }) {
    const games = p.games ?? [];
    return <PageFrame className="gg-media" title="Media" onBack={p.onBack}
        onButtonDown={shoulderHandler(p.tabs.map(t => t.key), 'games', key => p.onTab(key as MediaTab | 'games'))}
        backdrop={<><style>{mediaStyles}</style><div className="gg-pk-shade" /></>}>
        <div className="gg-media-tabs"><Tabs tabs={p.tabs} active="games" onChange={key => p.onTab(key as MediaTab | 'games')} /></div>
        {games.length === 0
            ? <Area className="gg-media-empty" flow-children="column"><span>Games will appear here after you save a screenshot or recording</span></Area>
            : <Area className="gg-media-games" flow-children="grid">{games.map(game => <GameCard key={game.gameId} p={p} game={game} />)}</Area>}
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
    return <PageFrame className="gg-media gg-media-viewer" title={p.gameId ? `Media — ${p.gameName || 'Unknown game'}` : 'Media'} onBack={p.onBack}
        onButtonDown={(evt: PadEvent) => { const s = shoulderStep(evt); if (s !== null) { evt.preventDefault?.(); evt.stopPropagation?.(); p.onStep(s); } }}
        backdrop={<>
            <style>{mediaStyles}</style>
            <div className="gg-pk-backdrop" style={{ backgroundImage: `url("${shot.url}")` }} />
            <div className="gg-pk-shade" />
        </>}>
        <div className="gg-media-view-shot"><CoverImg urls={[shot.url]} alt="" /></div>
        <Area className="gg-media-panel" flow-children="column">
            {/* The name, never the logo (Michael, PS5 check: SIGNALIS's logo did not fit the card). */}
            {name && <h2 className="gg-media-panel-name">{name}</h2>}
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
    return <PageFrame className="gg-media gg-media-full" title={p.gameId ? `Media — ${p.gameName || 'Unknown game'}` : 'Media'} onBack={p.onBack}
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
    if (!p.gameId && p.view === 'games') return <GamesIndex p={p} />;
    return <Gallery p={p} />;
}

// ---- The live page ---------------------------------------------------------------------------------------------------

const STRIP_MS = 2500;
const MESSAGE_MS = 3000;
const PRIVACY: { label: string; value: 0 | 1 | 2 }[] = [{ label: 'Public', value: 0 }, { label: 'Friends only', value: 1 }, { label: 'Private', value: 2 }];

const steamHistory = () => (globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { History?: { location?: { pathname?: string; search?: string }; listen?(fn: () => void): unknown } } } } })
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
export function MediaPage({ bindings, native, openItem = null, gameId = null }: { bindings: MediaBindings; native: ReactNode; openItem?: string | null; gameId?: string | null }) {
    const [items, setItems] = useState<MediaItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<MediaTab>(() => mediaMemory.get().tab);
    const [view, setView] = useState<'all' | 'games'>(() => mediaMemory.get().view);
    const [screen, setScreen] = useState<MediaScreen>({ kind: 'gallery' });
    const [focusId, setFocusId] = useState<string | null>(() => mediaMemory.get().focusId);
    const [message, setMessage] = useState<string | null>(null);
    const [stripVisible, setStripVisible] = useState(true);
    const host = useRef<HTMLDivElement | null>(null);
    const opened = useRef(false);
    const stripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Read on open, and again when Steam writes a new screenshot (it joins the top; the highlight stays on its item).
    useEffect(() => {
        let live = true;
        const load = () => bindings.list().then(r => {
            if (!live) return;
            if (!r) { setFailed(true); return; }
            const built = buildItems(r.shots, r.clips);
            setItems(built);
            // Steam asked for one shot (a notification's View): open the viewer on it, once (Michael, 2026-11-19).
            const opening = opened.current ? null : openingScreen(built, openItem);
            opened.current = true;
            if (opening) { setTab(opening.tab); setFocusId(opening.focusId); setScreen(opening.screen); }
        });
        void load();
        const stop = bindings.onNewShot(() => { void load(); });
        return () => { live = false; stop(); };
    }, [bindings]);
    useEffect(() => () => {
        if (stripTimer.current) clearTimeout(stripTimer.current);
        if (messageTimer.current) clearTimeout(messageTimer.current);
    }, []);
    useEffect(() => { mediaMemory.remember({ tab, focusId, view }); }, [tab, focusId, view]);

    const allItems = items ?? [];
    const games = useMemo(() => gameCollections(allItems, bindings.gameName), [items, bindings]);
    const selectedGame = gameId === null ? null : games.find(g => g.gameId === gameId) ?? null;
    const sourceItems = gameId !== null ? (selectedGame ? itemsForGame(allItems, selectedGame.gameId) : []) : allItems;
    const list = useMemo(() => tabItems(sourceItems, tab), [items, tab, gameId]);
    const shots = useMemo(() => list.filter((i): i is ShotItem => i.kind === 'shot'), [list]);
    const now = new Date();
    const groups = useMemo(() => dayGroups(list, now), [list, now.toDateString()]);
    const tabs = useMemo<KitTab[]>(() => {
        const scoped = mediaTabs(sourceItems);
        return gameId !== null ? scoped : [...scoped, { key: 'games', label: 'Games', count: games.length }];
    }, [items, selectedGame, games.length, gameId]);

    // Focus: on each screen, and again whenever the list changes under the gallery (a new shot moves tiles between rows).
    const focusTarget = screen.kind === 'viewer' ? 'media-action:Full screen'
        : screen.kind === 'full' ? `media-full:${screen.id}`
            : !gameId && view === 'games' ? (games.length ? `media-game:${games.some(game => game.gameId === mediaMemory.get().gameFocusId) ? mediaMemory.get().gameFocusId : games[0].gameId}` : 'tab:games')
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

    const onTab = (next: MediaTab | 'games') => {
        const nextView = mediaViewAfterTab(view, gameId !== null, next);
        setView(nextView);
        mediaMemory.remember({ view: nextView });
        if (next === 'games') return;
        if (next === tab) return;
        setTab(next);
        setFocusId(tabItems(sourceItems, next)[0]?.id ?? null);
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
    const onOpenGame = (id: string) => {
        mediaMemory.openGame(id);
        Navigation.Navigate(`/media/grid?game=${encodeURIComponent(id)}`);
    };
    const onFocusGame = (id: string) => mediaMemory.remember({ gameFocusId: id });
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
        <MediaPageView screen={screen} tab={gameId ? tab : view === 'games' ? 'games' : tab} tabs={tabs} groups={groups} items={list} now={now} focusId={focusId}
            name={bindings.gameName} clipArt={clipArtOf} message={message} stripVisible={stripVisible}
            onTab={onTab} onFocus={setFocusId} onOpen={onOpen} onFull={onFull} onStep={onStep} onUpload={onUpload}
            onDelete={onDelete} onSteamMedia={onSteamMedia} onBack={onBack} onPress={showStrip}
            view={view} games={games} gameId={gameId} gameName={selectedGame?.name ?? 'Unknown game'}
            onOpenGame={onOpenGame} onFocusGame={onFocusGame} />
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
const mediaRoute = () => sharedRoute ??= (() => {
    const source = routeSource(steamHistory as () => never);
    return {
        get: () => {
            try {
                const location = steamHistory()?.location;
                return typeof location?.pathname === 'string' ? `${location.pathname}${location.search ?? ''}` : null;
            } catch { return null; }
        },
        subscribe: source.subscribe,
    };
})();

/** Steam's `/media` route renders this: Game Glance's Media, or Steam's own element (spec §1). */
export function MediaGate({ native, bindings = sharedMediaBindings(), route = mediaRoute() }: { native: ReactNode; bindings?: MediaBindings; route?: RouteSource }): ReactNode {
    watchMediaNativeReset();
    const memory = useSyncExternalStore(mediaMemory.subscribe, mediaMemory.get);
    const path = useSyncExternalStore(route.subscribe, route.get);
    const last = useRef<'ours' | 'native' | undefined>(undefined);
    const choice = mediaGateChoice({ enabled: true, available: bindings.available(), path, native: memory.native }, last.current);
    last.current = choice;
    // While Steam leaves Media the path names the next page: keep the shot asked for, so the page doesn't remount on the way out.
    const asked = useRef<string | null>(null);
    if (path === null || mediaKeepsNative(path)) asked.current = mediaItemFromPath(path);
    const openItem = asked.current;
    const gameId = mediaGameFromPath(path);
    if (choice === 'native' || mediaHasInvalidGameQuery(path)) return native;
    // Keyed by the asked-for shot: a notification opening another shot while Media is shown opens it too.
    return <MediaBoundary fallback={native}><MediaPage key={openItem ?? 'media'} bindings={bindings} native={native} openItem={openItem} gameId={gameId} /></MediaBoundary>;
}
