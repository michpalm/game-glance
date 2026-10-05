import type { GamepadEvent } from '@decky/ui';
import { CSSProperties, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActionRow, LibraryActionRow } from './ActionRow';
import { FeedSheet } from './FeedSheet';
import { FEED_VIEWPORT_INSET, feedSpace } from './feedLayout';
import { focusElement, focusElementSettled } from './homeNav';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { edgeStep, stepSelection, type Zone } from './focusZones';
import { HeroBackground } from './HeroBackground';
import { neighbourIds } from './heroLayers';
import { HERO_PRELOAD_RADIUS } from './motion';
import { legibleAccent } from './accent';
import { solveRaiseDelta } from './raised';
import { findLegendHeight, legendReserve } from './legend';
import { FEED_SHEET, homeCss, stackShift } from './homeCss';
import { noteHome, recentIndexFor, recentRefFor, takeRestore } from './homeMemory';
import { eyebrowText, showEmptyMessage, usableSize } from './homeView';
import { SourcePill } from '../components/SourcePill';
import { RecentsRow } from './RecentsRow';
import { CARD_SCALE_HANDHELD, cardScaleFor, clampFocus, isLibraryFocus, recentsGeometry } from './recentsLayout';
import { homeCanvas } from './scale';
import { TitleBlock } from './TitleBlock';
import { useBumperSelect } from './useBumperSelect';
import { useCloud } from './useCloud';
import { useHomeData } from './useHomeData';

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
    // last game). L1/R1 on the action row changes it (bumper navigation); the recents row only displays it.
    const [recentIndex, setRecentIndex] = useState(0);
    // Where Home was when the user left it for a game, news or store page (homeMemory), taken once per mount; null on
    // a cold start. It is applied as soon as the recents are known and before the content mounts, so Home never shows
    // the first game and then jumps. `restoring` also keeps the Play pill from claiming focus while it runs.
    const [restore] = useState(takeRestore);
    // The bottom section (What's new, Friends, Recommended tabs); off: Home is the selected game only, focus stays on
    // the action row and a remembered tab or feed zone restores to the actions instead.
    const { homeFeed: feed } = useSettings();
    const [resolved, setResolved] = useState(restore === null);
    const [restoring, setRestoring] = useState(restore !== null);
    const data = useHomeData(recentIndex);
    const focusIndex = clampFocus(data.games.length, recentIndex);
    const onLibrary = isLibraryFocus(data.games.length, focusIndex);
    // The zone holding gamepad focus, as reported by each zone's focus events; tabs/feed raise the sheet.
    const [zone, setZone] = useState<Zone>('actions');
    const sheetUp = feed && (zone === 'tabs' || zone === 'feed');
    const gameIds = useMemo(() => data.games.map((g) => g.appId), [data.games]);
    // The games either side of the selection, whose hero art is pre-loaded so L1/R1 crossfade at once.
    const heroNeighbours = useMemo(() => neighbourIds(gameIds, focusIndex, HERO_PRELOAD_RADIUS), [gameIds, focusIndex]);
    useLayoutEffect(() => {
        if (resolved || !restore || (gameIds.length === 0 && !data.recentsSettled)) return;
        if (gameIds.length > 0) {
            setRecentIndex(recentIndexFor(restore.recent, gameIds));
            setZone(feed ? restore.zone : 'actions');
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
    // B from the tabs returns to the Play pill; from the actions Home leaves B to Steam (stock).
    const backToActions = () => focusElement(actionButtons()[0], 'the Play pill');
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
    // Left on the Play pill and Right on the last button step to the previous / next game (focusZones.edgeStep), the
    // same step as L1/R1, with focus on the Play pill. Everything else goes on to the bumpers.
    const onRowButtonDown = (evt: GamepadEvent) => {
        try {
            const buttons = actionButtons();
            const active = rootRef.current?.ownerDocument?.activeElement ?? null;
            const at = buttons.findIndex((b) => b.contains(active));
            const step = edgeStep(Number(evt?.detail?.button), at, buttons.length, Boolean(evt?.detail?.is_repeat));
            const next = step === null ? null : stepSelection(focusIndex, step, data.games.length);
            if (next !== null) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                bumpers.stop();
                // Focus first, so the row remembers the pill (onActionsFocus) before a circle that is about to go away.
                focusElement(buttons[0], 'the Play pill');
                setRecentIndex(next);
                return;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: edge navigation failed`, error);
        }
        bumpers.onButtonDown(evt);
    };
    const rowButtons = { onButtonDown: onRowButtonDown, onButtonUp: bumpers.onButtonUp };
    // Which action button holds focus (its index among the row's buttons), remembered for the way back.
    const onActionsFocus = (event: { target: EventTarget }) => {
        setZone('actions');
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
    // The bottom section turned off while focus was in it (Quick Access): focus goes back to the Play pill.
    useEffect(() => {
        if (feed || zone === 'actions') return;
        setZone('actions');
        backToActions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feed]);
    // Remember the selection and focus for the way back (homeMemory); not before the restore has been applied.
    useEffect(() => {
        if (!resolved) return;
        const recent = recentRefFor(focusIndex, gameIds);
        noteHome(recent ? { zone, recent } : { zone });
    }, [resolved, zone, focusIndex, gameIds]);
    const size = useBoxSize(rootRef);
    const canvas = homeCanvas(size?.width ?? 0, size?.height ?? 0);
    // Width is the authored one; height follows the real screen so the reserved bars sit on Steam's bars, and the
    // whole stack moves down into the slack under the tab strip (homeCss.stackShift).
    const logicalHeight = size ? size.height / canvas.scale : canvas.logicalHeight;
    // Bigger cards docked to a TV: the shared TV check (screenScale: a 1080p-class TV only, the Deck is not docked), from Home's own
    // measured box (the Big Picture window's CSS px: 828x466 handheld, 1500x844 on a 1080p TV). Null until measured:
    // the canvas content mounts only then, so the recents row never renders at the handheld size first and then
    // slides to the docked one. The measure runs in a layout effect, so the content still mounts before the first paint.
    const measuredScale = cardScaleFor(size);
    const scale = measuredScale ?? CARD_SCALE_HANDHELD;
    const legend = legendReserve(useLegendHeight(rootRef, size), canvas.scale);
    // How much further the raised view rises so its top margin equals its bottom margin (raised.solveRaiseDelta).
    const raiseDelta = solveRaiseDelta(logicalHeight, legend, scale);
    const geometry = useMemo(() => recentsGeometry(scale), [scale]);
    const css = useMemo(() => homeCss(scale), [scale]);
    const game = data.focused;
    const contentUp = measuredScale !== null && resolved;
    // Once the content is up: focus what was focused. The actions here; the tabs and the feed are the feed sheet's
    // (their cards may still be loading), which says when it is done.
    const restoreZone = feed && (restore?.zone === 'tabs' || restore?.zone === 'feed') ? restore.zone : 'actions';
    useEffect(() => {
        if (!contentUp || !restoring) return;
        if (restoreZone === 'actions') {
            const buttons = actionButtons();
            focusElementSettled(buttons[Math.min(Math.max(0, restore?.action ?? 0), Math.max(0, buttons.length - 1))], 'the action');
        } else if (game) {
            return; // the feed sheet finishes it
        }
        setRestoring(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentUp, restoring]);

    return (
        <div ref={rootRef} className="gh-root" style={{ '--glance-accent': data.accent, '--glance-accent-text': legibleAccent(data.accent), '--gh-dim': sheetUp ? DIM_SHEET : DIM_REST, '--gh-bottom': `${legend}px`, '--gh-shift': `${stackShift(logicalHeight, legend)}px`, '--gh-raise': `${FEED_SHEET.raise + raiseDelta}px` } as CSSProperties}>
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
                {/* Between Steam's top bar (52) and button legend (46); Home draws neither. */}
                <div className="gh-safe">
                    {/* The page container: moved down by the stack shift (homeCss.stackShift); raised while focus is in the tabs or feed. */}
                    <div className={`gh-page${sheetUp ? ' gh-page-up' : ''}`}>
                        {!contentUp ? null : game ? (
                            <>
                                <section className="gh-title-block" ref={actionsRef} onFocus={onActionsFocus} onBlur={onActionsBlur}>
                                    {onLibrary ? (
                                        <TitleBlock eyebrow={eyebrowText(null, true)} title="View more in your Library" chips={data.libraryChips} />
                                    ) : (
                                        <TitleBlock eyebrow={eyebrowText(data.lastPlayedLabel)} title={game.name} chips={data.chips} />
                                    )}
                                    <ActionRow
                                        game={onLibrary ? null : game}
                                        running={data.focusedRunning}
                                        download={data.download}
                                        status={data.pillStatus}
                                        preferred={!restoring}
                                        buttons={rowButtons}
                                        cloud={onLibrary ? null : cloud}
                                    />
                                </section>
                                {/* The selected game's store, as the game page's pill; not on the Library card. */}
                                {!onLibrary && data.source && <SourcePill label={data.source} className="gh-source" iconClassName="gh-source-icon" />}
                                <RecentsRow games={data.games} selected={focusIndex} geometry={geometry} />
                                {feed && (
                                    <FeedSheet
                                        data={data}
                                        raised={sheetUp}
                                        viewport={canvas.logicalWidth - FEED_VIEWPORT_INSET}
                                        space={feedSpace(logicalHeight, legend, raiseDelta)}
                                        onZone={setZone}
                                        onBackToActions={backToActions}
                                        restore={restore}
                                        onRestored={() => setRestoring(false)}
                                    />
                                )}
                            </>
                        ) : showEmptyMessage(data.games.length, data.recentsSettled) ? (
                            // No recents once the boot-time retries are over: the Library action, so Home is never
                            // a dead end. During the retries only the plain hero shows.
                            <div className="gh-empty">
                                <div className="gh-empty-text">Play a game and it will show up here</div>
                                <LibraryActionRow preferred />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
