import { Focusable } from '@decky/ui';
import type { GamepadEvent } from '@decky/ui';
import { memo, Ref, useEffect, useMemo, useRef } from 'react';
import { browserStores, capsuleUrls, heroUrls, landscapeUrls } from './artwork';
import { wideArt } from './homeView';
import { clampFocus, isLibraryFocus, MAX_GHOSTS, RecentsGeometry, recentsLayout } from './recentsLayout';
import { focusElement } from './homeNav';
import type { HomeGame } from './useHomeData';

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
 * Blurred base, the sharp portrait capsule at the right, then `art` (the wide card's layers, on the expanded
 * capsule only; homeView.wideArt) mounted last so it sits on top and fades in over the portrait. The portrait
 * is never hidden: if every wide url fails to load, base plus portrait remain (the handoff's fallback).
 */
function CapsuleArt({ cover, art, blur }: { cover: string[]; art: string[] | null; blur: boolean }) {
    return (
        <>
            {blur && <div className="gh-cap-blur" style={backgrounds(cover.slice(0, 1))} />}
            <div className="gh-cap-cover" style={backgrounds(cover)} />
            {art && <div className="gh-cap-art" style={backgrounds(art)} />}
        </>
    );
}

/**
 * Whether card `i` draws its blurred base: only the selected card and the ones next to it. A narrow card's portrait is
 * exactly its width and covers the blur completely, so elsewhere it would only cost: every L1/R1 step slides every
 * card, and each blurred layer is re-composited (20 recents, 35 px blur docked). The neighbours keep theirs so the
 * card that is growing or shrinking during a step never shows a bare edge.
 */
export function capsuleBlur(i: number, selected: number): boolean {
    return Math.abs(i - selected) <= 1;
}

/**
 * One recents card. Memoized on plain props, so an L1/R1 step re-renders only the cards whose place or state changed;
 * its art urls are read from Steam's stores only when the game or its expanded state changes.
 * Rendered as an individual Focusable so Steam dispatches its native navigation sound on every carousel step.
 */
const GameCapsule = memo(function GameCapsule({
    game,
    left,
    width,
    dim,
    wide,
    blur,
    preferred,
    setRef,
    onFocus,
    onButtonDown,
    onActivate,
}: {
    game: HomeGame;
    left: number;
    width: number;
    dim: boolean;
    wide: boolean;
    blur: boolean;
    preferred: boolean;
    setRef?(el: HTMLDivElement | null): void;
    onFocus(): void;
    onButtonDown(evt: GamepadEvent): void;
    onActivate(): void;
}) {
    const appId = game.appId;
    const cover = useMemo(() => urls(() => capsuleUrls(appId, browserStores)), [appId]);
    const art = useMemo(
        () => (wide ? wideArt(urls(() => landscapeUrls(appId, browserStores)), urls(() => heroUrls(appId, browserStores)), cover) : null),
        [appId, wide, cover],
    );
    return (
        <Focusable
            ref={setRef as Ref<HTMLDivElement>}
            className={`gh-cap${wide ? ' gh-cap-wide' : ''}`}
            noFocusRing
            preferredFocus={preferred}
            onFocus={onFocus}
            onGamepadFocus={onFocus}
            onButtonDown={onButtonDown}
            onActivate={onActivate}
            style={{ left: `${left}px`, width: `${width}px`, opacity: dim ? 0.35 : 1 }}
            role="option"
            aria-selected={wide}
        >
            <CapsuleArt cover={cover} art={art} blur={blur} />
            {/* A game new to the library (the "New to library" setting), as Steam's Home marks it. */}
            {game.isNew && <div className="gh-cap-new">New</div>}
            <div className="gh-cap-bar" />
        </Focusable>
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
    /** A: the selected game's page, or the Library on the Library card. */
    onActivate(): void;
}

/**
 * The recents row: games, then "View more in your Library", then the loop preview of the first games.
 * Each card is an individual Focusable so navigation across cards produces Steam's native gamepad sound,
 * while maintaining the exact sliding transform and layout.
 */
export function RecentsRow({
    games,
    selected,
    geometry,
    nav,
    isFocused = true,
}: {
    games: HomeGame[];
    selected: number;
    geometry: RecentsGeometry;
    nav: RecentsRowNav;
    isFocused?: boolean;
}) {
    const count = games.length;
    const at = clampFocus(count, selected);
    const layout = recentsLayout(count, at, geometry);
    const onLibrary = isLibraryFocus(count, at);
    const library = layout.items[count];
    const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

    // Sync active card ref with parent and transfer focus on selection change so Steam plays nav sound
    useEffect(() => {
        const currentEl = itemRefs.current[at];
        if (currentEl) {
            nav.setRef(currentEl);
            if (isFocused && currentEl.ownerDocument?.activeElement !== currentEl) {
                focusElement(currentEl, `card ${at}`);
            }
        }
    }, [at, isFocused, nav]);

    // The loop preview's portraits, read once per list of games (not on every step).
    const ghostCovers = useMemo(() => games.slice(0, MAX_GHOSTS).map((g) => urls(() => capsuleUrls(g.appId, browserStores))), [games]);
    return (
        <div
            className={`gh-recents${isFocused ? ' gh-recents-focus' : ''}`}
            role="listbox"
            aria-label="Recent games"
        >
            <div className="gh-recents-track" style={{ transform: `translateX(${layout.scrollX}px)` }}>
                {games.map((game, i) => (
                    <GameCapsule
                        key={game.appId}
                        game={game}
                        left={layout.items[i].left}
                        width={layout.items[i].width}
                        dim={layout.items[i].dim}
                        wide={!onLibrary && i === at}
                        blur={capsuleBlur(i, at)}
                        preferred={nav.preferred && !onLibrary && i === at}
                        setRef={(el) => {
                            itemRefs.current[i] = el;
                            if (i === at && !onLibrary) nav.setRef(el);
                        }}
                        onFocus={nav.onFocus}
                        onButtonDown={nav.onButtonDown}
                        onActivate={nav.onActivate}
                    />
                ))}
                <Focusable
                    ref={(el) => {
                        itemRefs.current[count] = el as HTMLDivElement | null;
                        if (onLibrary) nav.setRef(el as HTMLDivElement | null);
                    }}
                    className={`gh-cap gh-cap-lib${onLibrary ? ' gh-cap-lib-on' : ''}`}
                    style={{ left: `${library.left}px`, width: `${library.width}px` }}
                    noFocusRing
                    preferredFocus={nav.preferred && onLibrary}
                    onFocus={nav.onFocus}
                    onGamepadFocus={nav.onFocus}
                    onButtonDown={nav.onButtonDown}
                    onActivate={nav.onActivate}
                    role="option"
                    aria-selected={onLibrary}
                >
                    <div className="gh-lib-body">
                        <div className="gh-lib-grid">
                            <div className="gh-lib-cell gh-lib-cell-accent" />
                            <div className="gh-lib-cell" />
                            <div className="gh-lib-cell" />
                            <div className="gh-lib-cell" />
                        </div>
                        <div className="gh-lib-label">View more in your Library</div>
                    </div>
                    <div className="gh-cap-bar" />
                </Focusable>
                {layout.ghosts.map((ghost, j) => (
                    <div
                        key={`ghost-${games[j].appId}`}
                        className="gh-cap gh-ghost"
                        aria-hidden="true"
                        style={{ left: `${ghost.left}px`, width: `${geometry.capsuleW}px`, opacity: ghost.opacity }}
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
        </div>
    );
}
