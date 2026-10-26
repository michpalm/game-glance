import { Focusable } from '@decky/ui';
import type { GamepadEvent } from '@decky/ui';
import { memo, MouseEvent, PointerEvent as ReactPointerEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browserStores, capsuleUrls, heroUrls, landscapeUrls } from './artwork';
import { displayInfo } from './artShrink';
import { ArtBox, cardBox } from './cardArt';
import { wideArt } from './homeView';
import { knownCardArt, lastCardArt, resolveCardArt } from './wideCardArt';
import { clampFocus, isLibraryFocus, MAX_GHOSTS, RecentsGeometry, recentsLayout, RowStyle, steamRowLayout, minimalRowLayout } from './recentsLayout';
import { cardTap } from './rowDrag';
import { useRowDrag } from './useRowDrag';
import { useHover } from './useMouse';
import type { HomeGame } from './useHomeData';
import { tr } from '../i18n/steamText';

function urls(read: () => string[]): string[] {
    try {
        return read();
    } catch {
        return [];
    }
}

/** Several urls as stacked backgrounds: the first that exists paints over the rest (missing files draw nothing). */
function backgrounds(list: string[]): { backgroundImage?: string } {
    if (list.length === 0) return {};
    return { backgroundImage: list.map((u) => `url("${u.replace(/"/g, '%22')}")`).join(', ') };
}

/**
 * The art to draw on a wide card (null: none yet, or none loads). Known art draws at once; otherwise it is looked up and
 * drawn once loaded and decoded, so the card never waits on a decode (it used to stack all its files as backgrounds,
 * the game's 3840 px hero under the landscape art, each decoded on every step).
 */
function useCardArt(appId: number, list: string[] | null, box: ArtBox): string | null {
    const known = list ? knownCardArt(appId, list) : null;
    const key = list ? `${appId}|${list.join('|')}` : '';
    const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);
    useEffect(() => {
        if (!list || known !== undefined) return undefined;
        let live = true;
        resolveCardArt(appId, list, box).then((url) => {
            if (live) setLoaded({ key, url });
        }, () => undefined);
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    if (!list) return null;
    if (known !== undefined) return known;
    if (loaded && loaded.key === key) return loaded.url;
    // Steam just listed another file for the game (its details loaded): the art it had stays up while that is looked up.
    return lastCardArt(appId) ?? null;
}

/**
 * Blurred base, the sharp portrait capsule at the right, then `art` (the wide card's art, on the expanded capsule only)
 * mounted last so it sits on top and fades in over the portrait. The portrait is never hidden: if no wide art loads,
 * base plus portrait remain (the handoff's fallback).
 */
function CapsuleArt({ cover, art, blur }: { cover: string[]; art: string | null; blur: boolean }) {
    return (
        <>
            {blur && <div className="gh-cap-blur" style={backgrounds(cover.slice(0, 1))} />}
            <div className="gh-cap-cover" style={backgrounds(cover)} />
            {art && <div className="gh-cap-art" style={backgrounds([art])} />}
        </>
    );
}

/**
 * Whether card `i` draws its blurred base: only the selected card and the ones next to it. A narrow card's portrait is
 * exactly its width and covers the blur completely, so elsewhere it would only cost: every L1/R1 step slides every
 * card, and each blurred layer is re-composited (20 recents, 35 px blur docked). The neighbours keep theirs so the
 * card that is growing or shrinking during a step never shows a bare edge.
 */
export function capsuleBlur(i: number, selected: number, firstWide = false): boolean {
    return Math.abs(i - selected) <= 1 || (firstWide && i === 0);
}

/**
 * Whether a card is drawn greyed out: a game not installed on this device (as Steam's library shows them). Non-Steam
 * shortcuts never are (Steam's `installed` does not describe them). The selected card shows its colours (homeCss).
 */
export function greyedOut(game: Pick<HomeGame, 'installed' | 'shortcut'>, enabled = true): boolean {
    return enabled && !game.installed && game.shortcut !== true;
}

/**
 * One recents card. Memoized on plain props, so an L1/R1 step re-renders only the cards whose place or state changed;
 * its art urls are read from Steam's stores only when the game or its expanded state changes.
 */
const GameCapsule = memo(function GameCapsule({ game, index, left, width, dim, wide, selected, hover, blur, box, onTap, grayUninstalled }: { game: HomeGame; index: number; left: number; width: number; dim: boolean; wide: boolean; selected: boolean; hover: boolean; blur: boolean; box: ArtBox; onTap(index: number, event: MouseEvent): void; grayUninstalled: boolean }) {
    const appId = game.appId;
    const cover = useMemo(() => urls(() => capsuleUrls(appId, browserStores)), [appId]);
    const list = useMemo(
        () => (wide ? wideArt(urls(() => landscapeUrls(appId, browserStores)), urls(() => heroUrls(appId, browserStores)), cover) : null),
        [appId, wide, cover],
    );
    const art = useCardArt(appId, list, box);
    return (
        <div className={`gh-cap${wide ? ' gh-cap-wide' : ''}${selected ? ' gh-cap-sel' : ''}${hover ? ' gh-cap-hover' : ''}${greyedOut(game, grayUninstalled) ? ' gh-cap-off' : ''}`} data-hover={`g${index}`} style={{ left: `${left}px`, width: `${width}px`, opacity: dim ? 0.35 : 1 }} onClick={(event) => onTap(index, event)}>
            <CapsuleArt cover={cover} art={art} blur={blur} />
            {/* A game new to the library, as Steam's Home marks it, and a demo: side by side on the wide card, stacked on a capsule. */}
            {(game.isNew || game.demo) && (
                <div className="gh-cap-marks">
                    {game.isNew && <div className="gh-cap-new">{tr('newMark')}</div>}
                    {game.demo && <div className="gh-cap-new">{tr('demoMark')}</div>}
                </div>
            )}
            <div className="gh-cap-bar" />
        </div>
    );
});

/** The row's gamepad handling, given by SpotlightHome (it owns the selection, the bumpers and the pages to open). */
export interface RecentsRowNav {
    /** Takes focus when Home first gets focus (a cold start: the first game card, as on Steam's own Home). */
    preferred: boolean;
    setRef(el: HTMLDivElement | null): void;
    onFocus(): void;
    /** Left/Right, L1/R1, View/Menu (focusZones.recentsButton). */
    onButtonDown(evt: GamepadEvent): void;
    /** A held Left/Right let go: its repeat stops. */
    onButtonUp?(evt: GamepadEvent): void;
    /** A: the selected game's page, or the Library on the Library card. */
    onActivate(): void;
    /** A tap on another card (or a drag, useRowDrag): select it, with controller focus on the row. */
    onSelect(index: number): void;
    /** Screen px per logical px: Home's canvas as drawn, for a finger's distances. */
    scale(): number;
    /** A drag (with its flick) is running: a fast run, like a held stick (home/fastCycle). */
    onRun(running: boolean): void;
    /** False while a game opens: a flick stops instead of moving the selection under the transition. */
    canStep?(): boolean;
}

/**
 * The recents row: games, then "View more in your Library", then the loop preview of the first games. One focusable for
 * the whole row (the cards slide by transform, so Steam's spatial navigation never moves between them): while it has
 * focus the selected card is highlighted, Left/Right select games and A opens the selected one (`nav`, from
 * SpotlightHome, which owns `selected`: it drives hero, title and actions; the row slides to follow). A tap (the
 * browser's click) on another card selects it, on the selected card opens it (rowDrag.cardTap); a ghost selects its game. Rendered only with games. `geometry` is the card scale's sizes
 * (handheld or docked), the same SpotlightHome gives homeCss.
 */
export function RecentsRow({ games, selected, geometry, nav, rowStyle = 'spotlight', viewport = 0, expand = true, snap = false, grayUninstalled = true }: { games: HomeGame[]; selected: number; geometry: RecentsGeometry; nav: RecentsRowNav; rowStyle?: RowStyle; viewport?: number; expand?: boolean; snap?: boolean; grayUninstalled?: boolean }) {
    const count = games.length;
    const at = clampFocus(count, selected);
    // Steam's style: the first game is the wide card and the selection moves to the middle (`viewport`); a fast run
    // changes nothing there (no card widens). Spotlight: the selected game widens at the left edge.
    const steam = rowStyle === 'steam';
    const layout = rowStyle === 'minimal' ? minimalRowLayout(count, at, geometry, viewport)
        : steam ? steamRowLayout(count, at, geometry, viewport) : recentsLayout(count, at, geometry, expand);
    // The wide card in device px: its art is loaded for that size (home/artShrink).
    const perCanvas = displayInfo().perCanvas;
    const box = useMemo(() => cardBox(geometry, perCanvas), [geometry, perCanvas]);
    const onLibrary = isLibraryFocus(count, at);
    const library = layout.items[count];
    // The loop preview's portraits, read once per list of games (not on every step).
    const ghostCovers = useMemo(() => games.slice(0, MAX_GHOSTS).map((g) => urls(() => capsuleUrls(g.appId, browserStores))), [games]);
    // A tap on card `index` (count: the Library card). The latest nav and selection, behind one stable callback, so a
    // tap never re-renders the memoised cards.
    const tapTarget = useRef({ nav, at });
    tapTarget.current = { nav, at };
    const onTap = useCallback((index: number, event: MouseEvent) => {
        event.stopPropagation();
        const { nav: n, at: focused } = tapTarget.current;
        if (cardTap(index, focused) === 'open') n.onActivate();
        else n.onSelect(index);
    }, []);
    // A finger on the row: drags step the selection (the layout carries the row) and the track adds the finger's
    // remainder beyond the selected card, so a release only settles that (useRowDrag).
    const drag = useRowDrag({ index: at, count, step: geometry.step, scale: () => nav.scale(), onSelect: (i) => nav.onSelect(i), onRun: (r) => nav.onRun(r), canStep: () => nav.canStep?.() !== false, wraps: true });
    const trackX = layout.scrollX + (drag.dragging ? drag.offset : 0);
    // A mouse over a card lights it (home/mouse); pressing to drag, or a finger, clears it.
    const hover = useHover();
    const handlers = {
        ...drag.handlers,
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
            hover.clear();
            drag.handlers.onPointerDown(event);
        },
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
            hover.onPointerMove(event);
            drag.handlers.onPointerMove(event);
        },
        onPointerLeave: hover.clear,
    };
    return (
        <Focusable
            ref={nav.setRef as Ref<HTMLDivElement>}
            className={`gh-recents${drag.dragging ? ' gh-recents-drag' : ''}`}
            focusClassName="gh-recents-focus"
            noFocusRing
            preferredFocus={nav.preferred}
            onFocus={nav.onFocus}
            onGamepadFocus={nav.onFocus}
            onButtonDown={nav.onButtonDown}
            onButtonUp={nav.onButtonUp}
            onActivate={nav.onActivate}
            {...handlers}
            role="listbox"
            aria-label={tr('recentGames')}
        >
            <div className={`gh-recents-track${snap ? ' gh-recents-snap' : ''}`} style={{ transform: `translateX(${trackX}px)` }}>
                {games.map((game, i) => (
                    <GameCapsule
                        key={game.appId}
                        game={game}
                        grayUninstalled={grayUninstalled}
                        index={i}
                        onTap={onTap}
                        left={layout.items[i].left}
                        width={layout.items[i].width}
                        dim={layout.items[i].dim}
                        wide={layout.items[i].width > geometry.capsuleW}
                        selected={!onLibrary && i === at}
                        hover={hover.hovered === `g${i}`}
                        box={box}
                        blur={rowStyle !== 'minimal' && capsuleBlur(i, at, steam)}
                    />
                ))}
                <div className={`gh-cap gh-cap-lib${onLibrary ? ' gh-cap-lib-on' : ''}${hover.hovered === 'lib' ? ' gh-cap-hover' : ''}`} data-hover="lib" style={{ left: `${library.left}px`, width: `${library.width}px` }} onClick={(event) => onTap(count, event)}>
                    <div className="gh-lib-body">
                        <div className="gh-lib-grid">
                            <div className="gh-lib-cell gh-lib-cell-accent" />
                            <div className="gh-lib-cell" />
                            <div className="gh-lib-cell" />
                            <div className="gh-lib-cell" />
                        </div>
                        <div className="gh-lib-label">{tr('viewLibrary')}</div>
                    </div>
                    <div className="gh-cap-bar" />
                </div>
                {layout.ghosts.map((ghost, j) => (
                    <div
                        key={`ghost-${games[j].appId}`}
                        className={`gh-cap gh-ghost${greyedOut(games[j], grayUninstalled) ? ' gh-cap-off' : ''}${hover.hovered === `x${j}` ? ' gh-cap-hover' : ''}`}
                        data-hover={`x${j}`}
                        aria-hidden="true"
                        style={{ left: `${ghost.left}px`, width: `${geometry.capsuleW}px`, opacity: ghost.opacity }}
                        onClick={(event) => onTap(j, event)}
                    >
                        {/* Cover only: a ghost is exactly the portrait's width, so a blur base would be fully hidden. */}
                        <div className="gh-cap-cover" style={backgrounds(ghostCovers[j] ?? [])} />
                        {j === 0 && (
                            <div className="gh-ghost-badge">
                                <div className="gh-ghost-icon">↻</div>
                                <div className="gh-ghost-label">BACK TO START</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Focusable>
    );
}
