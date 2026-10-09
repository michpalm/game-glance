import type { GamepadEvent } from '@decky/ui';
import { CSSProperties, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActionRow, LibraryActionRow, openGameActions } from './ActionRow';
import { FeedSheet } from './FeedSheet';
import { feedSpace, feedViewportInset } from './feedLayout';
import { pillInset, rowInset, sideInset } from './insets';
import { isTvScreen } from '../styles/screenScale';
import { focusElement, focusElementSettled, gameOpenArt, openGame, openLibrary } from './homeNav';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { recentsButton, repeatStep, RepeatState, selectionForButton, type Zone } from './focusZones';
import { HeroBackground } from './HeroBackground';
import { neighbourIds } from './heroLayers';
import { HERO_PRELOAD_DELAY_MS, HERO_PRELOAD_RADIUS } from './motion';
import { legibleAccent } from './accent';
import { solveRaiseDelta } from './raised';
import { findLegendHeight, legendReserve } from './legend';
import { FEED_SHEET, homeCss, stackShift } from './homeCss';
import { noteHome, recentIndexFor, recentRefFor, takeRestore } from './homeMemory';
import { eyebrowText, showEmptyMessage, usableSize } from './homeView';
import { FamilyPill, SourcePill } from '../components/SourcePill';
import { familyPillLabel } from '../data/family';
import { GameStatusBar } from '../components/GameStatusBar';
import { RecentsRow } from './RecentsRow';
import { CARD_SCALE_HANDHELD, cardScaleFor, clampFocus, isLibraryFocus, recentsGeometry } from './recentsLayout';
import { homeCanvas } from './scale';
import { TitleBlock } from './TitleBlock';
import { useBumperSelect } from './useBumperSelect';
import { gameStepSound, playNavSound } from './navSound';
import { useCloud } from './useCloud';
import { useHomeData } from './useHomeData';
import { collectionEyebrow } from './collections';
import { preloadLogos } from './logoArt';
import { tr } from '../i18n/steamText';

/** Hero dim (handoff heroDim): .15 at rest, +.30 while the feed sheet is up. */
const DIM_REST = 0.15;
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
    const { homeStatusBar, gameLogo } = useSettings();
    const [resolved, setResolved] = useState(restore === null);
    const [restoring, setRestoring] = useState(restore !== null);
    const data = useHomeData(recentIndex);
    const focusIndex = clampFocus(data.games.length, recentIndex);
    const onLibrary = isLibraryFocus(data.games.length, focusIndex);
    // The zone holding gamepad focus, as reported by each zone's focus events; tabs/feed raise the sheet.
    const [zone, setZone] = useState<Zone>('recents');
    // Set once Home has had focus in this mount: until then the game cards claim Steam's preferred focus (Home opens on
    // them), afterwards the Play pill does, so Up from the cards lands on Play (the action row enters at its preferred child).
    const [focusedOnce, setFocusedOnce] = useState(false);
    const sheetUp = zone === 'tabs' || zone === 'feed';
    const gameIds = useMemo(() => data.games.map((g) => g.appId), [data.games]);
    // The games either side of the selection, whose hero art is pre-loaded so L1/R1 crossfade at once.
    const heroNeighbours = useMemo(() => neighbourIds(gameIds, focusIndex, HERO_PRELOAD_RADIUS), [gameIds, focusIndex]);
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
    const actionButtons = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('.gh-actions .gh-btn') ?? [])];
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
    const bumpers = useBumperSelect(actionsRef, focusIndex, data.games.length, select);
    // The game cards (focusZones.recentsButton): Left/Right select the previous / next game and focus stays on the
    // cards; L1/R1 move focus to the Play pill first, then select as on the action row (its held-bumper repeat goes on
    // there); View/Menu open the selected game's menu at its card.
    // A held Left/Right steps at a held bumper's pace (focusZones.repeatStep), not at Steam's own faster repeat.
    const heldDirection = useRef<RepeatState | null>(null);
    const onRecentsButtonDown = (evt: GamepadEvent) => {
        try {
            const isRepeat = Boolean(evt?.detail?.is_repeat);
            const what = recentsButton(Number(evt?.detail?.button), focusIndex, data.games.length, isRepeat);
            if (what === null) return;
            if (what === 'bumper') {
                focusElement(actionButtons()[0], 'the Play pill');
                bumpers.onButtonDown(evt);
                return;
            }
            evt.preventDefault?.();
            evt.stopPropagation?.();
            if (what === 'menu') {
                if (!evt?.detail?.is_repeat && !onLibrary && data.focused) openGameActions(data.focused.appId, selectedCard());
                return;
            }
            const paced = repeatStep(Date.now(), heldDirection.current, isRepeat);
            heldDirection.current = paced.next;
            if (paced.step) {
                setRecentIndex(what.select);
                // Home took the press, so Steam plays no move sound for it: play its own (navSound.gameStepSound).
                const sound = gameStepSound(focusIndex, what.select, 'dpad');
                if (sound) playNavSound(sound);
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: game card navigation failed`, error);
        }
    };
    // The expanded (selected) card: the open transition's source and the menu's anchor; the row itself if not found.
    const selectedCard = () => (recentsRef.current?.querySelector<HTMLElement>('.gh-cap-wide') ?? recentsRef.current);
    // A on the cards: the selected game's page (expanding from its card), or the Library on the Library card. One
    // action per press (A and a touch can both arrive).
    const lastOpen = useRef(0);
    const onRecentsActivate = () => {
        const now = Date.now();
        if (now - lastOpen.current < 1000) return;
        lastOpen.current = now;
        try {
            if (onLibrary || !data.focused) return openLibrary();
            openGame(data.focused.appId, selectedCard(), gameOpenArt(data.focused.appId));
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: opening the selected game failed`, error);
        }
    };
    // The action row's buttons: L1/R1 always put focus on the Play pill (from any circle), then select as before.
    const actionRowButtons = {
        onButtonDown: (evt: GamepadEvent) => {
            try {
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
        onActivate: onRecentsActivate,
    };
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
    // Width is the authored one; height follows the real screen so the reserved bars sit on Steam's bars, and the
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
    const css = useMemo(() => homeCss(scale), [scale]);
    const game = data.focused;
    // A game from the family library: "Family Sharing · Grave" beside the store pill (data/family).
    const family = game ? familyPillLabel(game.appId) : null;
    const contentUp = measuredScale !== null && resolved;
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
        <div ref={rootRef} className="gh-root" style={{ '--glance-accent': data.accent, '--glance-accent-text': legibleAccent(data.accent), '--gh-dim': sheetUp ? DIM_SHEET : DIM_REST, '--gh-side': `${side}px`, '--gh-row': `${rowInset(side, tv)}px`, '--gh-pill': `${pillInset(tv)}px`, '--gh-bottom': `${legend}px`, '--gh-shift': `${stackShift(logicalHeight, legend, false)}px`, '--gh-raise': `${FEED_SHEET.raise + raiseDelta}px` } as CSSProperties}>
            <style>{css}</style>
            <HeroBackground appId={game?.appId ?? null} detailsVersion={data.detailsVersion} neighbours={heroNeighbours} />
            <div className="gh-scrim gh-scrim-dim" />
            <div className="gh-scrim gh-scrim-v" />
            <div className="gh-scrim gh-scrim-l" />
            <div
                className="gh-canvas"
                style={{
                    width: `${canvas.logicalWidth}px`,
                    height: `${logicalHeight}px`,
                    transform: `scale(${canvas.scale})`,
                    // Not shown until the box has a real size, so it never flashes at the wrong scale.
                    visibility: size ? 'visible' : 'hidden',
                }}
            >
                {/* In Steam's top strip, above the safe area: clock, battery, connection and your online status. */}
                {/* The status bar is drawn above Steam's menu layers, outside this root (components/GameStatusBar): the menus blur everything under them. */}
                {homeStatusBar && contentUp && <GameStatusBar hidden={sheetUp} />}
                {/* Between Steam's top bar (52) and button legend (46); Home draws neither. */}
                <div className="gh-safe">
                    {/* The page container: moved down by the stack shift (homeCss.stackShift); raised while focus is in the tabs or feed. */}
                    <div className={`gh-page${sheetUp ? ' gh-page-up' : ''}`}>
                        {!contentUp ? null : game ? (
                            <>
                                <section className="gh-title-block" ref={actionsRef} onFocus={onActionsFocus} onBlur={onActionsBlur}>
                                    {onLibrary ? (
                                        <TitleBlock eyebrow={eyebrowText(null, true)} title={tr('viewLibrary')} chips={data.libraryChips} />
                                    ) : (
                                        <TitleBlock eyebrow={collectionEyebrow(data.rowCollection, eyebrowText(data.lastPlayedLabel, false, data.focusedIsNew, data.rowCollection !== null))} title={game.name} chips={data.chips} appId={game.appId} logo={gameLogo} version={data.detailsVersion} />
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
                                    />
                                </section>
                                {/* The selected game's store, as the game page's pill; not on the Library card. */}
                                {!onLibrary && data.source && (
                                    <SourcePill label={data.source} className="gh-source" iconClassName="gh-source-icon">
                                        {family && <FamilyPill label={family} className="gh-family" iconClassName="gh-family-icon" />}
                                    </SourcePill>
                                )}
                                <RecentsRow games={data.games} selected={focusIndex} geometry={geometry} nav={recentsNav} />
                                <FeedSheet
                                        data={data}
                                        raised={sheetUp}
                                        viewport={canvas.logicalWidth - feedViewportInset(side, tv)}
                                        space={feedSpace(logicalHeight, legend, raiseDelta)}
                                        onZone={setZone}
                                        onBackToGames={focusGames}
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
        </div>
    );
}
