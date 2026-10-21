import type { GamepadEvent } from '@decky/ui';
import { CSSProperties, PointerEvent as ReactPointerEvent, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActionRow, LibraryActionRow, openGameActions } from './ActionRow';
import { FeedSheet } from './FeedSheet';
import { feedSpace, feedViewportInset } from './feedLayout';
import { pillInset, rowInset, sideInset } from './insets';
import { isTvScreen } from '../styles/screenScale';
import { focusElement, focusElementSettled, openGame, openLibrary } from './homeNav';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { recentsButton, selectionForButton, type Zone } from './focusZones';
import { sheetSwipe } from './rowDrag';
import { rowWheelTarget } from './mouse';
import { useWheelStep } from './useMouse';
import { installMouseMode } from './mouseMode';
import { HeroBackground } from './HeroBackground';
import { neighbourIds } from './heroLayers';
import { HERO_PRELOAD_DELAY_MS, HERO_PRELOAD_RADIUS, RETURN_TIMINGS } from './motion';
import { steamEnterOffCss } from '../styles/theme';
import { legibleAccent } from './accent';
import { solveRaiseDelta } from './raised';
import { findLegendHeight, legendReserve } from './legend';
import { FEED_SHEET, homeCss, stackShift } from './homeCss';
import { noteHome, recentIndexFor, recentRefFor, takeRestore } from './homeMemory';
import { eyebrowText, showEmptyMessage, usableSize } from './homeView';
import { HomePills } from './HomePills';
import { useFamilyCopies } from '../hooks/useFamilyCopies';
import { loadStoreVersions } from '../data/storeVersions';
import { useAsync } from '../hooks/useAsync';
import { GameStatusBar } from '../components/GameStatusBar';
import { RecentsRow } from './RecentsRow';
import { CARD_SCALE_HANDHELD, cardScaleFor, clampFocus, heroIndex, isLibraryFocus, recentsGeometry } from './recentsLayout';
import { useFastCycle } from './fastCycle';
import { noteDisplay } from './artShrink';
import { canvasStyle, homeCanvas } from './scale';
import { OpenExtras } from './OpenExtras';
import { useUnifideckInstalled } from '../hooks/useUnifideckInstalled';
import { useUnifideckSize } from '../hooks/useUnifideckSize';
import { knownSizeLabel, sizeStat } from '../logic/sizeStat';
import { TitleBlock } from './TitleBlock';
import { useBumperSelect, useDirectionSelect } from './useBumperSelect';
import { useCloud } from './useCloud';
import { useHomeData } from './useHomeData';
import { collectionEyebrow } from './collections';
import { preloadLogos } from './logoArt';
import { tr } from '../i18n/steamText';
import { FaTrash } from 'react-icons/fa';

/** Hero dim: none at rest (the art is shaded as on the game page, homeCss .gh-scrim-page), .45 while the feed sheet is up. */
const DIM_REST = 0;
const DIM_SHEET = 0.45;

interface Size {
    width: number;
    height: number;
}

/**
 * The size of Home's own layout box (untransformed), or null until it has a usable one. Plugin code runs in SharedJSContext, whose
 * `window` is 1x1, so the window size is never used: the element is observed (ResizeObserver from the window
 * that owns it, Steam's Big Picture window; else that window's resize event) and unusable measures are ignored,
 * keeping the last good size.
 */
/**
 * Steam's legend height in css px (legend.findLegendHeight), measured when Home's box changes and again shortly after
 * mount (the footer may not be laid out yet); null when it is not found. Layout reads only, no transforms.
 */
function useLegendHeight(ref: RefObject<HTMLDivElement | null>, size: Size | null): number | null {
    const [height, setHeight] = useState<number | null>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const measure = () => setHeight((old) => {
            const next = findLegendHeight(el);
            return old === next ? old : next;
        });
        measure();
        const later = [setTimeout(measure, 500), setTimeout(measure, 2000)];
        return () => later.forEach(clearTimeout);
    }, [ref, size?.width, size?.height]);
    return height;
}

function useBoxSize(ref: RefObject<HTMLDivElement | null>): Size | null {
    const [size, setSize] = useState<Size | null>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const view = (el.ownerDocument?.defaultView ?? null) as (Window & { ResizeObserver?: typeof ResizeObserver }) | null;
        const measure = () => {
            try {
                // The layout size, not getBoundingClientRect: that includes transforms, and Steam's route animation
                // scales the page to 0.95 while Home mounts, so Home kept a 95% box (probed docked: root 1500x845,
                // canvas measured 1425x802) and the ResizeObserver never fires when the transform ends.
                const rect = { width: el.offsetWidth, height: el.offsetHeight };
                if (!usableSize(rect.width, rect.height)) return;
                setSize((old) => (old && old.width === rect.width && old.height === rect.height ? old : { width: rect.width, height: rect.height }));
            } catch {
                // keep the last size
            }
        };
        measure();
        let observer: ResizeObserver | null = null;
        try {
            const Observer = view?.ResizeObserver ?? (typeof ResizeObserver === 'function' ? ResizeObserver : undefined);
            if (Observer) {
                observer = new Observer(() => measure());
                observer.observe(el);
            }
        } catch {
            observer = null;
        }
        if (!observer) {
            try {
                view?.addEventListener('resize', measure);
            } catch {
                // no way to follow resizes; the first good measure stays
            }
        }
        return () => {
            try {
                if (observer) observer.disconnect();
                else view?.removeEventListener('resize', measure);
            } catch {
                // window already gone
            }
        };
    }, [ref]);
    return size;
}

export function SpotlightHome() {
    // The selected recents item: 0..games.length, where games.length is the Library card (the hero then stays on the
    // last game). Left/Right on the game cards and L1/R1 (from the cards or the action row) change it.
    const [recentIndex, setRecentIndex] = useState(0);
    // Where Home was when the user left it for a game, news or store page (homeMemory), taken once per mount; null on
    // a cold start. It is applied as soon as the recents are known and before the content mounts, so Home never shows
    // the first game and then jumps. `restoring` also keeps the Play pill from claiming focus while it runs.
    const [restore] = useState(takeRestore);
    // Home is clean: the What's new, Friends and Recommended tabs are always there (Down reaches them) but stay out of sight until focus is in them.
    const { homeStatusBar, gameLogo, homeRowStyle } = useSettings();
    const [resolved, setResolved] = useState(restore === null);
    const [restoring, setRestoring] = useState(restore !== null);
    // Back from a page (B): Home is just there (motion.RETURN_TIMINGS): Steam's page fades are off for a moment and its UI fades in.
    const [back, setBack] = useState(restore !== null);
    useEffect(() => {
        if (!back) return undefined;
        const timer = setTimeout(() => setBack(false), RETURN_TIMINGS.hold);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const enterOff = useMemo(() => (back ? steamEnterOffCss() : ''), [back]);
    const data = useHomeData(recentIndex);
    const focusIndex = clampFocus(data.games.length, recentIndex);
    const onLibrary = isLibraryFocus(data.games.length, focusIndex);
    // A fast run of L1/R1 or Left/Right (home/fastCycle): the hero, the accent and the wide card hold what they showed
    // while only the selection moves along the narrow cards; the run ends on the selection, shown at once.
    // A held L1/R1, d-pad or stick that is repeating (useBumperSelect): the run lasts until it is let go.
    const [bumperRepeating, setBumperRepeating] = useState(false);
    const [directionRepeating, setDirectionRepeating] = useState(false);
    // A finger dragging the game cards (useRowDrag), and its flick: a run as well.
    const [dragRunning, setDragRunning] = useState(false);
    const cycle = useFastCycle(focusIndex, bumperRepeating || directionRepeating || dragRunning);
    const shownAt = heroIndex(data.games.length, cycle.shown);
    const shownGame = shownAt === null ? null : data.games[shownAt] ?? null;
    const heldAccent = useRef(data.accent);
    if (!cycle.holding) heldAccent.current = data.accent;
    const accent = heldAccent.current;
    // The zone holding gamepad focus, as reported by each zone's focus events; tabs/feed raise the sheet.
    const [zone, setZone] = useState<Zone>('recents');
    // Set once Home has had focus in this mount: until then the game cards claim Steam's preferred focus (Home opens on
    // them), afterwards the Play pill does, so Up from the cards lands on Play (the action row enters at its preferred child).
    const [focusedOnce, setFocusedOnce] = useState(false);
    const sheetUp = zone === 'tabs' || zone === 'feed';
    const gameIds = useMemo(() => data.games.map((g) => g.appId), [data.games]);
    // The games either side of the selection, whose hero art is pre-loaded so L1/R1 crossfade at once.
    // Not while a fast run holds the screen: their loads would land on the run's end, as its card widens.
    const heroNeighbours = useMemo(() => (cycle.holding ? [] : neighbourIds(gameIds, focusIndex, HERO_PRELOAD_RADIUS)), [gameIds, focusIndex, cycle.holding]);
    // With the logo option, their logos too (home/logoArt), on the same rest as the art, so L1/R1 draw the next logo on the step.
    const neighbourKey = heroNeighbours.join(',');
    useEffect(() => {
        if (!gameLogo || heroNeighbours.length === 0) return undefined;
        const timer = setTimeout(() => preloadLogos(heroNeighbours), HERO_PRELOAD_DELAY_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameLogo, neighbourKey]);
    useLayoutEffect(() => {
        if (resolved || !restore || (gameIds.length === 0 && !data.recentsSettled)) return;
        if (gameIds.length > 0) {
            setRecentIndex(recentIndexFor(restore.recent, gameIds));
            setZone(restore.zone);
        } else {
            setRestoring(false);
        }
        setResolved(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolved, gameIds, data.recentsSettled]);
    const rootRef = useRef<HTMLDivElement>(null);
    // Hover looks follow a mouse (mouseMode), on Steam's document, which the game page shares.
    useEffect(() => {
        const doc = rootRef.current?.ownerDocument;
        return doc ? installMouseMode(doc) : undefined;
    }, []);
    const cloud = useCloud(onLibrary ? null : data.focused?.appId ?? null);
    // The action button that last had focus. A button can leave while focused (the cloud circle when the next game
    // has none, the circles on the Library card): focus then moves to the row's last button instead of being lost.
    const lastAction = useRef<HTMLElement | null>(null);
    useLayoutEffect(() => {
        const was = lastAction.current;
        if (!was || was.isConnected || zone !== 'actions') return;
        const buttons = actionButtons();
        lastAction.current = buttons[buttons.length - 1] ?? null;
        focusElement(lastAction.current, 'the last action');
    });
    const actionsRef = useRef<HTMLElement>(null);
    const actionButtons = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('.gh-actions .gh-btn, .gh-copy-choice, .gh-store-choice') ?? [])];
    // The game card row (one focusable, RecentsRow). B from the tabs and from the action row returns to it; on the cards
    // Home leaves B to Steam (focusZones.onBack).
    const recentsRef = useRef<HTMLDivElement | null>(null);
    const focusGames = () => focusElement(recentsRef.current, 'the game cards');
    // L1/R1: a new selection. Moving onto the Library card drops the circles, so a focused circle hands focus to the
    // pill first (the pill element itself stays, it only turns into the Library pill).
    const select = (next: number) => {
        if (isLibraryFocus(data.games.length, next)) {
            const [pill] = actionButtons();
            if (pill && !pill.contains(pill.ownerDocument.activeElement)) focusElement(pill, 'the Play pill');
        }
        setRecentIndex(next);
    };
    const bumpers = useBumperSelect(actionsRef, focusIndex, data.games.length, select, setBumperRepeating);
    // The game cards (focusZones.recentsButton): Left/Right select the previous / next game and focus stays on the
    // cards; L1/R1 move focus to the Play pill first, then select as on the action row (its held-bumper repeat goes on
    // there); View/Menu open the selected game's menu at its card.
    // Left/Right on the cards, held: Home's own timer at a held bumper's pace (useBumperSelect.useDirectionSelect).
    const directions = useDirectionSelect(recentsRef, focusIndex, data.games.length, setRecentIndex, setDirectionRepeating);
    const onRecentsButtonDown = (evt: GamepadEvent) => {
        try {
            const isRepeat = Boolean(evt?.detail?.is_repeat);
            const what = recentsButton(Number(evt?.detail?.button), focusIndex, data.games.length, isRepeat);
            if (what === null) return;
            if (what === 'actions') {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                directions.stop();
                focusElement(actionButtons()[0], 'the Play pill');
                return;
            }
            if (what === 'bumper') {
                directions.stop();
                focusElement(actionButtons()[0], 'the Play pill');
                bumpers.onButtonDown(evt);
                return;
            }
            if (what === 'menu') {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (!evt?.detail?.is_repeat && !onLibrary && data.focused) openGameActions(data.focused.appId, selectedCard());
                return;
            }
            directions.onButtonDown(evt);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: game card navigation failed`, error);
        }
    };
    // The expanded (selected) card: the open transition's source and the menu's anchor (narrow during a fast run); the row itself if not found.
    // The selected card first: in Steam's row style the wide card is always the first game, whichever is selected.
    const selectedCard = () => (recentsRef.current?.querySelector<HTMLElement>('.gh-cap-sel') ?? recentsRef.current?.querySelector<HTMLElement>('.gh-cap-wide') ?? recentsRef.current);
    // After the next frames in Big Picture's window (a run just ended: the wide card and the hero first have to be up).
    const afterFrames = (run: () => void) => {
        const view = rootRef.current?.ownerDocument?.defaultView;
        if (view?.requestAnimationFrame) view.requestAnimationFrame(() => view.requestAnimationFrame(run));
        else setTimeout(run, 50);
    };
    // A on the cards: the selected game's page (expanding from its card), or the Library on the Library card. One
    // action per press (A and a touch can both arrive).
    const lastOpen = useRef(0);
    const onRecentsActivate = () => {
        const now = Date.now();
        if (now - lastOpen.current < 1000) return;
        lastOpen.current = now;
        try {
            if (onLibrary || !data.focused) return openLibrary();
            const appId = data.focused.appId;
            // In a fast run Home still shows another game: it shows the selected one first, then opens it from there.
            if (cycle.holding) {
                cycle.settle();
                afterFrames(() => openGame(appId, selectedCard()));
                return;
            }
            openGame(appId, selectedCard());
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: opening the selected game failed`, error);
        }
    };
    // The action row's buttons: L1/R1 always put focus on the Play pill (from any circle), then select as before.
    const actionRowButtons = {
        onButtonDown: (evt: GamepadEvent) => {
            try {
                if (Number(evt?.detail?.button) === 10) {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    focusGames();
                    return;
                }
                if (selectionForButton(focusIndex, Number(evt?.detail?.button), data.games.length) !== null) focusElement(actionButtons()[0], 'the Play pill');
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home: focusing Play for L1/R1 failed`, error);
            }
            bumpers.onButtonDown(evt);
        },
        onButtonUp: bumpers.onButtonUp,
    };
    const recentsNav = {
        preferred: !restoring && !focusedOnce,
        setRef: (el: HTMLDivElement | null) => {
            recentsRef.current = el;
        },
        onFocus: () => {
            setZone('recents');
            setFocusedOnce(true);
        },
        onButtonDown: onRecentsButtonDown,
        onButtonUp: directions.onButtonUp,
        onActivate: onRecentsActivate,
        // A tap on another card: controller focus moves to the row with it, so the stick goes on from there.
        // (setRecentIndex, not select: select hands focus to the pill on the Library card, which is for L1/R1; a touch
        // leaves focus on the row, where the finger was.)
        onSelect: (index: number) => {
            focusGames();
            setRecentIndex(index);
        },
        canStep: () => !rootRef.current?.hasAttribute('data-gh-opening'),
        scale: () => canvasScale(),
        onRun: setDragRunning,
    };
    // Screen px per logical px, as Home's canvas is drawn right now (also during Steam's mount animation): a finger's
    // distances in logical px.
    const canvasScale = () => {
        const drawn = rootRef.current?.querySelector('.gh-canvas')?.getBoundingClientRect().width ?? 0;
        return drawn > 0 && canvas.logicalWidth > 0 ? drawn / canvas.logicalWidth : canvas.scale;
    };
    // A vertical swipe anywhere on Home (rowDrag.sheetSwipe): up raises the feed sheet (focus to its current tab, as
    // Down does), down lowers it (focus back on the game cards, as B does). Sideways drags are the rows' own.
    const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
    /** Raises the feed sheet as Down does: focus to its current tab (the swipe up, the mouse's sheet toggle). */
    const raiseSheet = () => {
        const root = rootRef.current;
        focusElement(root?.querySelector<HTMLElement>('.gh-tab-on') ?? root?.querySelector<HTMLElement>('.gh-tab'), 'the feed tab');
    };
    const onRootPointerDown = (event: ReactPointerEvent) => {
        if (event.isPrimary) swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onRootPointerUp = (event: ReactPointerEvent) => {
        const start = swipeStart.current;
        if (!start || start.id !== event.pointerId) return;
        swipeStart.current = null;
        const scale = canvasScale() || 1;
        const swipe = sheetSwipe((event.clientX - start.x) / scale, (event.clientY - start.y) / scale, sheetUp);
        if (swipe === 'raise') raiseSheet();
        else if (swipe === 'lower') focusGames();
    };
    const onRootPointerCancel = () => {
        swipeStart.current = null;
    };
    // The mouse wheel anywhere on Home with the sheet down steps through the games, one notch a card (home/mouse), with
    // controller focus on the row, as a tap; it stops at the ends. A quick spin is a fast run as quick taps of
    // Left/Right are (home/fastCycle). With the sheet up the feed rows take the wheel (FeedSheet).
    const wheelAt = useRef(focusIndex);
    wheelAt.current = focusIndex;
    const onRootWheel = useWheelStep((steps) => {
        if (sheetUp || rootRef.current?.hasAttribute('data-gh-opening')) return;
        const next = rowWheelTarget(wheelAt.current, steps, data.games.length);
        if (next === wheelAt.current) return;
        wheelAt.current = next;
        focusGames();
        setRecentIndex(next);
    });
    // Which action button holds focus (its index among the row's buttons), remembered for the way back.
    const onActionsFocus = (event: { target: EventTarget }) => {
        setZone('actions');
        setFocusedOnce(true);
        try {
            const buttons = actionButtons();
            const at = buttons.findIndex((b) => b.contains(event.target as Node));
            if (at >= 0) {
                lastAction.current = buttons[at];
                noteHome({ action: at });
            }
        } catch {
            // keep the last one
        }
    };
    // Focus left the action row: a held bumper stops repeating.
    const onActionsBlur = (event: { relatedTarget: EventTarget | null }) => {
        try {
            if (!actionsRef.current?.contains(event.relatedTarget as Node | null)) bumpers.stop();
        } catch {
            bumpers.stop();
        }
    };
    // Remember the selection and focus for the way back (homeMemory); not before the restore has been applied.
    useEffect(() => {
        if (!resolved) return;
        const recent = recentRefFor(focusIndex, gameIds);
        noteHome(recent ? { zone, recent } : { zone });
    }, [resolved, zone, focusIndex, gameIds]);
    const size = useBoxSize(rootRef);
    const canvas = homeCanvas(size?.width ?? 0, size?.height ?? 0);
    // The screen in device px, for the size art is loaded at (home/artShrink).
    useLayoutEffect(() => {
        if (size) noteDisplay(size.width, size.height, rootRef.current?.ownerDocument?.defaultView?.devicePixelRatio ?? 1, canvas.scale);
    }, [size, canvas.scale]);
    // Width is the authored one (wider on a screen wider than 16:9: homeCanvas scales those by height, so the height is
    // never shorter than the authored one); height follows the real screen so the reserved bars sit on Steam's bars, and the
    // whole stack moves down into the slack under the tab strip (homeCss.stackShift), or with the bottom section hidden
    // into the tab strip's place too.
    const logicalHeight = size ? size.height / canvas.scale : canvas.logicalHeight;
    // Bigger cards docked to a TV: the shared TV check (screenScale: a 1080p-class TV only, the Deck is not docked), from Home's own
    // measured box (the Big Picture window's CSS px: 828x466 handheld, 1500x844 on a 1080p TV). Null until measured:
    // the canvas content mounts only then, so the recents row never renders at the handheld size first and then
    // slides to the docked one. The measure runs in a layout effect, so the content still mounts before the first paint.
    const measuredScale = cardScaleFor(size);
    // The side margin: the handheld's 56, a TV's tighter 40 (insets.ts).
    const tv = size ? isTvScreen(size.width, size.height) : false;
    const side = sideInset(tv);
    const scale = measuredScale ?? CARD_SCALE_HANDHELD;
    const legend = legendReserve(useLegendHeight(rootRef, size), canvas.scale);
    // How much further the raised view rises so its top margin equals its bottom margin (raised.solveRaiseDelta).
    const raiseDelta = solveRaiseDelta(logicalHeight, legend, scale);
    const geometry = useMemo(() => recentsGeometry(scale), [scale]);
    // Steam's row style centres the selection on the screen: the row starts at the row inset, so its visible width with
    // the same inset on the right puts the middle at the screen's.
    const rowViewport = canvas.logicalWidth - 2 * rowInset(side, tv);
    const css = useMemo(() => homeCss(scale), [scale]);
    const game = data.focused;
    // A game from the family library: "Family Sharing · Lender" beside the store pill (data/family).
    const copies = useFamilyCopies(game?.appId ?? 0, !onLibrary && !cycle.holding);
    const family = copies.label;
    const versions = useAsync(game && !onLibrary && !cycle.holding ? `store-versions:${game.appId}` : null, () => loadStoreVersions(game!.appId)) ?? [];
    const contentUp = measuredScale !== null && resolved;
    // A Unifideck game's size, as its page shows it right after Played (not during a fast run): the open draws that column
    // (OpenExtras), in Unifideck's own word once a page has shown it, so nothing shifts or pops in at the hand-over.
    const uniShortcut = !!game && !onLibrary && game.gameId !== undefined && !cycle.holding;
    const uniInstalled = useUnifideckInstalled(game?.appId ?? null, uniShortcut);
    const uniBytes = useUnifideckSize(game?.appId ?? null, uniShortcut && typeof uniInstalled === 'boolean', uniInstalled === true, uniShortcut);
    const sizeColumn = uniShortcut && typeof uniInstalled === 'boolean' ? sizeStat(uniBytes, uniInstalled, data.locale, knownSizeLabel(uniInstalled)) : null;
    // Once the content is up: focus what was focused. The game cards or the actions here; the tabs and the feed are
    // the feed sheet's (their cards may still be loading), which says when it is done. Without a restore (a cold start
    // or a fresh visit) Home opens on the first game card, as Steam's own Home does.
    const restoreZone: Zone = restore?.zone ?? 'recents';
    useEffect(() => {
        if (contentUp && !restore) focusElementSettled(recentsRef.current, 'the game cards');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentUp]);
    useEffect(() => {
        if (!contentUp || !restoring) return;
        if (restoreZone === 'recents') {
            focusElementSettled(recentsRef.current, 'the game cards');
        } else if (restoreZone === 'actions') {
            const buttons = actionButtons();
            focusElementSettled(buttons[Math.min(Math.max(0, restore?.action ?? 0), Math.max(0, buttons.length - 1))], 'the action');
        } else if (game) {
            return; // the feed sheet finishes it
        }
        setRestoring(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentUp, restoring]);

    return (
        <div ref={rootRef} className={`gh-root${back ? ' gh-back' : ''}`} onPointerDown={onRootPointerDown} onPointerUp={onRootPointerUp} onPointerCancel={onRootPointerCancel} onWheel={onRootWheel} style={{ '--glance-accent': accent, '--glance-accent-text': legibleAccent(accent), '--gh-dim': sheetUp ? DIM_SHEET : DIM_REST, '--gh-side': `${side}px`, '--gh-row': `${rowInset(side, tv)}px`, '--gh-pill': `${pillInset(tv)}px`, '--gh-bottom': `${legend}px`, '--gh-shift': `${stackShift(logicalHeight, legend, false)}px`, '--gh-raise': `${FEED_SHEET.raise + raiseDelta}px` } as CSSProperties}>
            <style>{css}</style>
            {enterOff && <style>{enterOff}</style>}
            {/* No game until the restore is applied (Home back on B): the first game's art would flash before the selected one's. */}
            <HeroBackground appId={resolved ? shownGame?.appId ?? null : null} detailsVersion={data.detailsVersion} neighbours={heroNeighbours} />
            {/* The opened game's hero (a feed card's, homeCss.openingRules), the feed sheet's dim, and the page's shading. */}
            <div className="gh-hero-open" />
            <div className="gh-scrim gh-scrim-dim" />
            <div className="gh-scrim gh-scrim-page" />
            <div
                className="gh-canvas"
                style={canvasStyle(canvas, logicalHeight, Boolean(size))}
            >
                {/* In Steam's top strip, above the safe area: clock, battery, connection and your online status. */}
                {/* The status bar is drawn above Steam's menu layers, outside this root (components/GameStatusBar): the menus blur everything under them. */}
                {homeStatusBar && contentUp && <GameStatusBar hidden={sheetUp} />}
                {/* Open transition: the glass panels the chips grow into, one per page card (hidden until opening). */}
                <div className="gh-open-shell" data-i="0" />
                <div className="gh-open-shell" data-i="1" />
                {/* An installed Unifideck game's page has Uninstall as a fourth circle (its trash glyph): drawn there as it opens. */}
                {!onLibrary && uniInstalled === true && <div className="gh-open-circle"><FaTrash /></div>}
                {/* Between Steam's top bar (52) and button legend (46); Home draws neither. */}
                <div className="gh-safe">
                    {/* The page container: moved down by the stack shift (homeCss.stackShift); raised while focus is in the tabs or feed. */}
                    <div className={`gh-page${sheetUp ? ' gh-page-up' : ''}`}>
                        {/* The mouse's sheet toggle (homeCss: shown in mouse mode only; not Focusable, so the controller never lands on it). */}
                        {contentUp && game ? (
                            <div className="gh-sheet-toggle" role="button" aria-label={sheetUp ? 'Back to the games' : 'Show the feed'} onClick={() => (sheetUp ? focusGames() : raiseSheet())}>
                                <svg viewBox="0 0 28 12" aria-hidden="true">
                                    <path d="M2 2 L14 10 L26 2" />
                                </svg>
                            </div>
                        ) : null}
                        {!contentUp ? null : game ? (
                            <>
                                <section className="gh-title-block" ref={actionsRef} onFocus={onActionsFocus} onBlur={onActionsBlur}>
                                    {onLibrary ? (
                                        <TitleBlock eyebrow={eyebrowText(null, true)} title={tr('viewLibrary')} chips={data.libraryChips} />
                                    ) : (
                                        <TitleBlock eyebrow={collectionEyebrow(data.rowCollection, eyebrowText(data.lastPlayedLabel, false, data.focusedIsNew, data.rowCollection !== null))} title={game.name} chips={data.chips} appId={game.appId} logo={gameLogo} version={data.detailsVersion} resolve={!cycle.holding} />
                                    )}
                                    <ActionRow
                                        game={onLibrary ? null : game}
                                        running={data.focusedRunning}
                                        download={data.download}
                                        status={data.pillStatus}
                                        preferred={!restoring && focusedOnce}
                                        buttons={actionRowButtons}
                                        cloud={onLibrary ? null : cloud}
                                        onBack={focusGames}
                                        unifideck={!onLibrary && typeof uniInstalled === 'boolean' ? { installed: uniInstalled } : null}
                                    />
                                </section>
                                {/* The selected game's store, as the game page's pill; not on the Library card. */}
                                {!onLibrary && data.source && (
                                    <HomePills appId={game.appId} source={data.source} family={family} count={copies.count} versions={versions} onFocus={onActionsFocus} onBack={focusGames} buttons={actionRowButtons} />
                                )}
                                <RecentsRow games={data.games} selected={focusIndex} geometry={geometry} nav={recentsNav} rowStyle={homeRowStyle} viewport={rowViewport} expand={!cycle.narrow} snap={cycle.holding} />
                                <FeedSheet
                                        data={data}
                                        raised={sheetUp}
                                        viewport={canvas.logicalWidth - feedViewportInset(side, tv)}
                                        space={feedSpace(logicalHeight, legend, raiseDelta)}
                                        onZone={setZone}
                                        onBackToGames={focusGames}
                                        scale={canvasScale}
                                        restore={restore}
                                        onRestored={() => setRestoring(false)}
                                    />
                            </>
                        ) : showEmptyMessage(data.games.length, data.recentsSettled) ? (
                            // No recents once the boot-time retries are over: the Library action, so Home is never
                            // a dead end. During the retries only the plain hero shows.
                            <div className="gh-empty">
                                <LibraryActionRow preferred />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            {/* Open transition: the page's parts Home draws as it turns into the page (hidden until opening; not built during a fast run). */}
            {game && !cycle.holding && <OpenExtras description={data.description} hltb={data.hltb} playedMinutes={data.playedMinutes} locale={data.locale} source={data.source} family={family} familyMultiple={copies.count > 1} sourceMultiple={versions.length > 1} playedMissing={!data.chips.some((c) => c.key === 'played')} size={sizeColumn} />}
        </div>
    );
}
