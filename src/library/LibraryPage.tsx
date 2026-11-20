import { DialogButton, Focusable, Menu, MenuItem, Navigation, showContextMenu } from '@decky/ui';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { settings, useSettings } from '../data/settings';
import { NAV_MAINTAIN_X } from '../home/focusZones';
import { useProton } from '../data/useProton';
import type { ProtonResult } from '../data/protondb';
import { browserStores, capsuleUrls, heroUrls } from '../home/artwork';
import { knownLogo, type LogoChoice } from '../home/logo';
import { logoList, resolveLogo } from '../home/logoArt';
import { logoStyle } from '../components/GameTitle';
import { memoAchievements } from '../home/detailsMemo';
import { peekHltb } from '../home/warmup';
import { takeSteamFocus } from '../home/steamFocus';
import { useWarmup } from '../home/useWarmup';
import { Bar, Fact, PageFrame, Pill, shoulderHandler, Tabs, type KitTab } from '../pageKit/PageKit';
import { routeSource, type RouteSource } from '../search/steam';
import { ensureNativeReset, gateChoice, libraryProtonWanted } from './libraryGate';
import { glance, type Glance, type KnownStats } from './libraryFacts';
import { buildTabs, collectionsOf, nextSort, SORT_LABELS, tabGames, warmPriority, type LibGame, type LibrarySnapshot, type RouteChoice, type SortKey, type TabKey } from './libraryModel';
import { initialTab, libraryMemory, restoreFocus } from './libraryState';
import { libraryStyles } from './libraryStyles';
import { sharedLibraryBindings, type LibraryBindings } from './steamLibrary';
import { useSettled } from './useSettled';
import { ProtonMark } from '../home/ProtonMark';
import { warmProton, type ProtonWarmDeps } from '../home/warmup';
import { knownSpace, warmSpace, type SpaceWarmDeps } from './librarySpace';
import { protonGames } from '../data/protonGame';
import { protonKnown, seedProton } from '../data/useProton';
import { memoSpaceRequired } from '../home/detailsMemo';
import { readSteamProgress, requestSteamProgress } from './steamAchievements';
import { openGameMenu } from '../home/gameMenu';

type AnyComponent = ComponentType<Record<string, unknown>>;
const Button = DialogButton as unknown as AnyComponent;
const Area = Focusable as unknown as AnyComponent;

/** The covers' grid (mock-up L11): 13 covers of 120 × 180 units a row; only rows near the highlight are mounted. */
export const GRID = { cols: 13, coverW: 120, coverH: 180, gap: 14, windowRowsBefore: 3, windowRowsAfter: 4 };
const ROW_H = GRID.coverH + GRID.gap;
/** The Library shows hero/logo art, achievements and HowLongToBeat only (ProtonDB follows Home's Game info slot rule). */
const LIBRARY_WARM = { pills: false, cardArt: false, descriptions: false, players: false };

/** The rows to mount around the highlighted cover; `last` is -1 for an empty list. */
export function visibleRows(focusIndex: number, total: number): { first: number; last: number } {
    const lastRow = Math.ceil(total / GRID.cols) - 1;
    if (lastRow < 0) return { first: 0, last: -1 };
    const row = Math.min(lastRow, Math.max(0, Math.floor(focusIndex / GRID.cols)));
    return { first: Math.max(0, row - GRID.windowRowsBefore), last: Math.min(lastRow, row + GRID.windowRowsAfter) };
}

interface Box { top: number; bottom: number }
/**
 * Scrolls the grid just enough to show a focused cover with room for its ring (`pad` px). Steam's own focus scrolling
 * did not follow upward moves here (PS5 check 2026-11-19: the highlight went above the grid's view), so the cover asks.
 */
export function keepCoverInView(grid: { scrollTop: number; getBoundingClientRect(): Box } | null | undefined, cover: { getBoundingClientRect(): Box }, pad: number, bottomPad = pad): void {
    if (!grid) return;
    const g = grid.getBoundingClientRect(), c = cover.getBoundingClientRect();
    if (c.top < g.top + pad) grid.scrollTop -= g.top + pad - c.top;
    else if (c.bottom > g.bottom - bottomPad) grid.scrollTop += c.bottom - (g.bottom - bottomPad);
}
const RING_ROOM = 10;
/** The grid runs under Steam's footer: a focused cover stays this many page units above the screen's bottom (PS5 check). */
const FOOTER_ROOM = 72; // just above the footer bar (Michael: 120 jumped too far)
const footerRoomPx = (el: HTMLElement) => Math.round(FOOTER_ROOM * ((el.ownerDocument?.defaultView?.innerWidth ?? 1920) / 1920));

/** An image tried url by url (as Downloads' FallbackImg), loaded lazily; `fallback` once none loads. */
export function CoverImg({ urls, className, alt = '', fallback = null, lazy = false }: { urls: string[]; className?: string; alt?: string; fallback?: ReactNode; lazy?: boolean }) {
    const [at, setAt] = useState(0);
    const src = urls[at];
    if (!src) return <>{fallback}</>;
    return <img className={className} src={src} alt={alt} loading={lazy ? 'lazy' : undefined} onError={() => setAt(at + 1)} />;
}

export interface CollectionTile { key: TabKey; name: string; count: number }
export interface LibraryViewProps {
    tabs: KitTab[];
    tab: TabKey;
    games: LibGame[];
    focusIndex: number;
    /** The highlighted game once the highlight has rested; its hero and facts are drawn. */
    settled: LibGame | null;
    glance: Glance | null;
    collectionTiles: CollectionTile[];
    /** The active sort's name, shown beside the tabs (X changes it). */
    sortLabel: string;
    hero(appId: number): { urls: string[]; soft: boolean };
    cover(appId: number): string[];
    onTab(key: TabKey): void;
    onFocus(index: number): void;
    onOpen(game: LibGame): void;
    onSort(): void;
    onOptions(): void;
    onBack(): void;
    /** ≡ on a cover: Steam's own menu for that game, as Steam's Library opens it. */
    onGameMenu(game: LibGame, anchor: unknown): void;
}

function HeroArt({ game, hero }: { game: LibGame; hero: LibraryViewProps['hero'] }) {
    const art = hero(game.appId);
    return <div className={art.soft ? 'gg-library-hero gg-library-hero-soft' : 'gg-library-hero'} key={game.appId}>
        <CoverImg className="gg-library-hero-img" urls={art.urls} />
        <div className="gg-library-hero-shade" />
    </div>;
}

/** The logo's class: a dark one (measured luma under .3) gets a light lift so it reads on dark art. */
export const logoClass = (luma: number | undefined) => (luma !== undefined && luma < .3 ? 'gg-library-logo gg-library-logo-dark' : 'gg-library-logo');
/** Home draws logos at 560 × 180 on its 1440-wide canvas; the Library's slot is 0.8 of that in its 1920 units (448 × 144). */
const LOGO_SCALE = 0.8;
const libraryUnit = (n: number) => `calc(var(--gg-d,1px) * ${n})`;

/**
 * The game's logo the way Home draws it (home/logoArt, GameTitle.logoStyle): cropped to its visible part and sized by
 * area, so a logo floating in a big transparent file is not drawn small; the name while none is found.
 */
export function LibraryLogo({ appId, name }: { appId: number; name: string }) {
    const list = useMemo(() => logoList(appId), [appId]);
    const known = knownLogo(appId, list.key);
    const [found, setFound] = useState<{ appId: number; choice: LogoChoice | null } | null>(null);
    useEffect(() => {
        if (known !== undefined) return undefined;
        let live = true;
        resolveLogo(appId, list).then(choice => { if (live) setFound({ appId, choice }); });
        return () => { live = false; };
    }, [appId, list.key]);
    const choice = known !== undefined ? known : found?.appId === appId ? found.choice : undefined;
    if (choice === undefined) return <div className="gg-library-logo-slot" />;
    if (choice === null) return <div className="gg-library-logo-slot"><h2 className="gg-library-name">{name}</h2></div>;
    return <div className="gg-library-logo-slot">
        <img className={logoClass(choice.luma)} style={logoStyle(choice, libraryUnit, LOGO_SCALE)} src={choice.src ?? choice.url} alt={name} crossOrigin="anonymous" />
    </div>;
}

function GlanceView({ game, glance }: { game: LibGame; glance: Glance | null }) {
    return <div className="gg-library-glance" key={game.appId}>
        <LibraryLogo appId={game.appId} name={game.name} />
        {glance && (glance.progress.length > 0 || glance.facts.length > 0) && <div className="gg-library-groups">
            {glance.progress.length > 0 && <div className="gg-library-progress">
                {glance.progress.map(line => <div className="gg-library-line" key={line.label}>
                    <span className="gg-library-line-head"><span className="gg-pk-fact-label">{line.label}</span><span className="gg-pk-fact-value">{line.value}</span></span>
                    <Bar ratio={line.ratio} />
                </div>)}
            </div>}
            {glance.facts.length > 0 && <div className="gg-library-facts">{glance.facts.map(f => f.tone
                ? <span className="gg-pk-fact" key={f.label}><span className="gg-pk-fact-label">{f.label}</span>
                    <span className="gg-pk-fact-value gg-library-tone" data-tone={f.tone}><span className="gg-library-mark" aria-hidden="true"><ProtonMark /></span>{f.value}</span></span>
                : <Fact key={f.label} label={f.label} value={f.value} />)}</div>}
        </div>}
        {glance && glance.collections.length > 0 && <div className="gg-library-pills">{glance.collections.map(c => <Pill key={c}>{c}</Pill>)}</div>}
    </div>;
}

/** Game Glance's Library (mock-up L11): the highlighted game's hero and facts, the tabs, then the covers. */
export function LibraryPageView(p: LibraryViewProps) {
    const coverButton = (game: LibGame, index: number) => <Button key={game.appId} className="gg-library-cover" data-gg-focus={`library:${game.appId}`}
        onClick={() => p.onOpen(game)} onOKActionDescription="Game page" onSecondaryButton={p.onSort} onSecondaryActionDescription="Sort"
        onMenuButton={(evt: { currentTarget?: unknown } | undefined) => p.onGameMenu(game, evt?.currentTarget)} onMenuActionDescription="Game options"
        onFocus={(evt: { currentTarget?: HTMLElement } | undefined) => {
            const el = evt?.currentTarget;
            if (el) keepCoverInView(el.closest<HTMLElement>('.gg-library-grid'), el, RING_ROOM, footerRoomPx(el));
            p.onFocus(index);
        }} aria-label={game.name}>
        <CoverImg urls={p.cover(game.appId)} lazy alt="" fallback={<span className="gg-library-cover-name">{game.name}</span>} />
    </Button>;
    const { first, last } = visibleRows(p.focusIndex, p.games.length);
    const rows: ReactNode[] = [];
    for (let r = first; r <= last; r++) {
        const start = r * GRID.cols;
        rows.push(<Area key={r} className="gg-library-row" flow-children="row" navEntryPreferPosition={NAV_MAINTAIN_X}>{p.games.slice(start, start + GRID.cols).map((g, i) => coverButton(g, start + i))}</Area>);
    }
    const lastRow = Math.ceil(p.games.length / GRID.cols) - 1;
    const tiles = p.tab === 'collections';
    return <PageFrame className="gg-library" title="Library" onBack={p.onBack} onOptions={p.onOptions} optionsLabel="Options"
        onButtonDown={shoulderHandler(p.tabs.map(t => t.key), p.tab, key => p.onTab(key as TabKey))}
        backdrop={<>
            <style>{libraryStyles}</style>
            {p.settled && !tiles ? <>
                {p.hero(p.settled.appId).urls[0] && <div className="gg-pk-backdrop" style={{ backgroundImage: `url("${p.hero(p.settled.appId).urls[0]}")` }} />}
                <div className="gg-library-floor" />
                <HeroArt game={p.settled} hero={p.hero} />
            </> : <div className="gg-pk-shade" />}
        </>}>
        {p.settled && !tiles && <GlanceView game={p.settled} glance={p.glance} />}
        <div className="gg-library-tabs">
            <Tabs tabs={p.tabs} active={p.tab} onChange={key => p.onTab(key as TabKey)} />
            {<span className="gg-library-sort"><span className="gg-library-glyph" aria-hidden="true">X</span>{p.sortLabel}</span>}
        </div>
        <Area className="gg-library-grid" flow-children="column">
            {tiles
                ? <Area className="gg-library-row" flow-children="row">{p.collectionTiles.map(t => <Button key={t.key} className="gg-library-col" data-gg-focus={`library:${t.key}`}
                    onClick={() => p.onTab(t.key)} onOKActionDescription="Open">
                    <span className="gg-library-col-name">{t.name}</span><span className="gg-library-col-count">{`${t.count} games`}</span>
                </Button>)}</Area>
                : <>
                    {first > 0 && <div className="gg-library-spacer" style={{ height: `calc(var(--gg-d,1px) * ${first * ROW_H})` }} />}
                    {rows}
                    {last < lastRow && <div className="gg-library-spacer" style={{ height: `calc(var(--gg-d,1px) * ${(lastRow - last) * ROW_H})` }} />}
                </>}
        </Area>
    </PageFrame>;
}

// ---- The live page ---------------------------------------------------------------------------------------------------

const steamHistory = () => (globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { History?: { location?: { pathname?: string }; listen?(fn: () => void): unknown } } } } })
    .SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.History;
/** "Steam's library" resets on leaving the Library and its game pages; watching starts once Steam's history exists. */
export const watchNativeReset = () => ensureNativeReset(steamHistory);

function heroOf(appId: number): { urls: string[]; soft: boolean } {
    try {
        const hero = heroUrls(appId, browserStores);
        return hero.length > 0 ? { urls: hero, soft: false } : { urls: capsuleUrls(appId, browserStores), soft: true };
    } catch { return { urls: [], soft: false }; }
}
const coverOf = (appId: number) => { try { return capsuleUrls(appId, browserStores); } catch { return []; } };

function focusKey(root: ParentNode | null | undefined, key: string): boolean {
    const el = root?.querySelector<HTMLElement>(`[data-gg-focus="${key}"]`);
    if (!el) return false;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
    return true;
}

/**
 * A game's required space: Steam's own details store first (it keeps every game it loaded; Game Glance's details memo
 * keeps 64, and warming the whole library pushed sizes out of it), then that memo. Positive numbers only; never throws.
 */
export function requiredSpace(store: { GetAppDetails?(appId: number): { lDiskSpaceRequiredBytes?: unknown } | null | undefined } | undefined,
    appId: number, memo: (appId: number) => number | undefined): number | undefined {
    try {
        const bytes = Number(store?.GetAppDetails?.(appId)?.lDiskSpaceRequiredBytes);
        if (bytes > 0) return bytes;
    } catch { /* Steam's store unavailable: the memo */ }
    const known = memo(appId);
    return known !== undefined && known > 0 ? known : undefined;
}
const steamDetailsStore = () => (globalThis as { appDetailsStore?: Parameters<typeof requiredSpace>[0] }).appDetailsStore;

function knownStats(game: LibGame | null, proton: ProtonResult | undefined): KnownStats {
    if (!game) return {};
    const known: KnownStats = {};
    const ach = readSteamProgress(undefined, game.appId) ?? memoAchievements(game.appId);
    if (ach) known.achievements = { achieved: ach.achieved, total: ach.total };
    const hltb = peekHltb(game.appId);
    if (hltb?.status === 'found' && hltb.times.main) known.hltbMainHours = hltb.times.main;
    if (proton?.status === 'found') known.protonTier = proton.tier;
    const required = requiredSpace(steamDetailsStore(), game.appId, id => knownSpace(id) ?? memoSpaceRequired(id));
    if (required) known.requiredBytes = required;
    return known;
}

/** The Steam games for the ProtonDB warm-up, in the warm order given (shortcuts go by their Steam match on the game page). */
export function protonWarmList(games: LibGame[]): number[] {
    return games.filter(g => !g.shortcut).map(g => g.appId);
}

/** The uninstalled Steam games for the Required space warm-up, in the warm order given. */
export function spaceWarmList(games: LibGame[]): number[] {
    return games.filter(g => !g.installed && !g.shortcut).map(g => g.appId);
}

const sleepMs = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Game Glance's Library, live from Steam's library and Game Glance's caches (spec §5, §6). */
export function LibraryPage({ bindings, routeTab }: { bindings: LibraryBindings; routeTab: TabKey | null }) {
    const [snapshot, setSnapshot] = useState<LibrarySnapshot>(() => bindings.read() ?? { games: [], installedIds: [], collections: [] });
    const tabs = useMemo(() => buildTabs(snapshot), [snapshot]);
    const pickTab = (want: TabKey | null) => (want && tabs.some(t => t.key === want) ? want : tabs[0]?.key ?? 'all');
    const [tab, setTab] = useState<TabKey>(() => pickTab(initialTab(routeTab, libraryMemory.get())));
    const [sort, setSort] = useState<SortKey>(() => libraryMemory.get().sorts[tab] ?? 'lastPlayed');
    const games = useMemo(() => tabGames(snapshot, tab, sort), [snapshot, tab, sort]);
    // Every warm-up follows one order over all games (warmPriority), whatever the tab; it restarts only when the library does.
    const priority = useMemo(() => warmPriority(snapshot), [snapshot]);
    const priorityKey = useMemo(() => priority.map(g => g.appId).join(','), [priority]);
    const [focusIndex, setFocusIndex] = useState(() => restoreFocus(games, libraryMemory.get(), tab));
    useEffect(() => { libraryMemory.set({ entry: routeTab }); }, []); // the path this visit began with (set after render: the gate listens)
    const [, bump] = useState(0);
    const host = useRef<HTMLDivElement | null>(null);
    const grid = () => host.current?.querySelector<HTMLElement>('.gg-library-grid') ?? null;

    const settledIndex = useSettled(focusIndex, 150);
    const settled = tab === 'collections' ? null : games[settledIndex] ?? games[0] ?? null;
    const settingsNow = useSettings();
    const proton = useProton(settled ? { appId: settled.appId, name: settled.name, isShortcut: settled.shortcut } : null, libraryProtonWanted(settingsNow.infoSlots), true);
    const facts = settled ? glance(settled, knownStats(settled, proton), collectionsOf(snapshot, settled.appId), new Date()) : null;

    // All games warmed in warmPriority's order (centre 0: the list is already in order); nothing waits for the highlight.
    useWarmup(priority, 0, true, id => ({ isShortcut: snapshot.games.find(g => g.appId === id)?.shortcut ?? false, heroic: null }), () => bump(n => n + 1), LIBRARY_WARM);

    // ProtonDB ahead, for the whole tab from the highlight outward (Michael, PS5 check 2026-11-19), at once: the disk cache
    // first, then online one at a time as Home does. Only while ProtonDB is in a Game info slot (it sends the app id out).
    const protonWanted = libraryProtonWanted(settingsNow.infoSlots);
    useEffect(() => {
        if (!protonWanted || priority.length === 0) return undefined;
        let cancelled = false;
        const names = new Map(priority.map(g => [g.appId, g.name]));
        const asGame = (appId: number) => ({ appId, name: names.get(appId) ?? '', isShortcut: false });
        const deps: ProtonWarmDeps = {
            known: protonKnown, seed: seedProton, sleep: sleepMs, allowNetwork: () => settings.get().autoPreload,
            readCached: appId => protonGames.cachedOnly(asGame(appId)), prefetch: appId => protonGames.prefetch(asGame(appId)),
        };
        warmProton(protonWarmList(priority), deps, () => cancelled, () => bump(n => n + 1)).catch(() => undefined);
        return () => { cancelled = true; };
    }, [priorityKey, protonWanted]);

    // Achievements: Steam's own batched progress (as its Library asks), for the whole tab at once (Steam batches them).
    useEffect(() => {
        if (requestSteamProgress(undefined, protonWarmList(priority)) === 0) return undefined;
        const timer = setTimeout(() => bump(n => n + 1), 900);
        return () => clearTimeout(timer);
    }, [priorityKey]);

    // Required space: Steam's details for the tab's uninstalled games, nearest the highlight first. Home's achievements
    // warm-up skips a game whose achievements are cached, so its size would otherwise wait for the highlight.
    useEffect(() => {
        let cancelled = false;
        const deps: SpaceWarmDeps = {
            register: (appId, onDetails) => (globalThis as { SteamClient?: { Apps?: { RegisterForAppDetails?(id: number, cb: (d: unknown) => void): { unregister(): void } } } })
                .SteamClient?.Apps?.RegisterForAppDetails?.(appId, onDetails),
            sleep: sleepMs,
        };
        const missing = spaceWarmList(priority).filter(id => requiredSpace(steamDetailsStore(), id, knownSpace) === undefined);
        warmSpace(missing, deps, () => cancelled, () => bump(n => n + 1)).catch(() => undefined);
        return () => { cancelled = true; };
    }, [priorityKey]);

    const remember = () => {
        const at = games[focusIndex];
        const m = libraryMemory.get();
        libraryMemory.set({ tab, focus: at ? { ...m.focus, [tab]: at.appId } : m.focus, index: { ...m.index, [tab]: focusIndex }, scroll: { ...m.scroll, [tab]: grid()?.scrollTop ?? 0 } });
    };
    // First focus (and after a tab change): the remembered cover, else the first; the grid's remembered scroll.
    const placed = useRef<TabKey | null>(null);
    useLayoutEffect(() => {
        if (placed.current === tab) return;
        const el = grid();
        if (el) el.scrollTop = libraryMemory.get().scroll[tab] ?? 0;
        const at = games[focusIndex];
        const key = tab === 'collections' ? null : at ? `library:${at.appId}` : null;
        if (key ? focusKey(host.current, key) : focusKey(host.current, `tab:${tab}`)) placed.current = tab;
    });

    const onTab = (key: TabKey) => {
        if (key === tab) return;
        remember();
        const next = pickTab(key);
        const nextSortKey = libraryMemory.get().sorts[next] ?? 'lastPlayed';
        const fresh = bindings.read() ?? snapshot; // a tab change picks up installs and playtime since the page opened
        setSnapshot(fresh);
        setTab(next);
        setSort(nextSortKey);
        setFocusIndex(restoreFocus(tabGames(fresh, next, nextSortKey), libraryMemory.get(), next));
        libraryMemory.set({ tab: next });
    };
    // A new sort starts at the top: the first cover highlighted, the grid scrolled up (Michael, PS5 check 2026-11-19).
    const applySort = (next: SortKey) => {
        setSort(next);
        const m = libraryMemory.get();
        libraryMemory.set({ sorts: { ...m.sorts, [tab]: next }, index: { ...m.index, [tab]: 0 } });
        setFocusIndex(0);
        requestAnimationFrame(() => {
            const el = grid();
            if (el) el.scrollTop = 0;
            const g = tabGames(snapshot, tab, next)[0];
            if (g) focusKey(host.current, `library:${g.appId}`);
        });
    };
    const onOptions = () => showContextMenu(<Menu label="Library" cancelText="Cancel">
        <MenuItem onSelected={() => { remember(); libraryMemory.set({ native: true }); }}>Steam's library</MenuItem>
    </Menu>, host.current ?? undefined);

    const collectionTiles = tabs.filter(t => t.key.startsWith('col:')).map(t => ({ key: t.key, name: t.label, count: t.count ?? 0 }));
    return <div ref={host} style={{ height: '100%' }}>
        <LibraryPageView tabs={tabs} tab={tab} games={games} focusIndex={focusIndex} settled={settled} glance={facts} collectionTiles={collectionTiles}
            hero={heroOf} cover={coverOf} onTab={onTab} onFocus={setFocusIndex}
            onOpen={game => { remember(); Navigation.Navigate(`/library/app/${game.appId}`); }}
            sortLabel={SORT_LABELS[sort]} onSort={() => applySort(nextSort(sort))} onOptions={onOptions} onBack={() => { remember(); Navigation.NavigateBack(); }}
            onGameMenu={game => openGameMenu(game.appId, host.current?.querySelector<HTMLElement>(`[data-gg-focus="library:${game.appId}"]`))} />
    </div>;
}

/** A render failure shows Steam's Library for this visit (spec §8). */
class LibraryBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: unknown) { console.error(`${LOG_PREFIX} Library render failed; showing Steam's`, error); }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

let sharedRoute: RouteSource | null = null;
const libraryRoute = () => sharedRoute ??= routeSource(steamHistory as () => never);

/** Steam's `/library` route renders this: Game Glance's Library, or Steam's own element (spec §2). */
export function LibraryGate({ native, bindings = sharedLibraryBindings(), route = libraryRoute() }: { native: ReactNode; bindings?: LibraryBindings; route?: RouteSource }): ReactNode {
    watchNativeReset(); // Steam's history may not have existed when the plugin loaded
    const memory = useSyncExternalStore(libraryMemory.subscribe, libraryMemory.get);
    const path = useSyncExternalStore(route.subscribe, route.get);
    const enabled = useSettings().libraryPage;
    const snapshot = enabled && !memory.native ? bindings.read() : null;
    const last = useRef<RouteChoice | undefined>(undefined);
    const choice = gateChoice({ enabled, snapshot, path, native: memory.native }, last.current);
    last.current = choice;
    if (choice.kind === 'native') return native;
    return <LibraryBoundary fallback={native}><LibraryPage key={choice.tab ?? 'library'} bindings={bindings} routeTab={choice.tab} /></LibraryBoundary>;
}
