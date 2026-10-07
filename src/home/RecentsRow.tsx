import { Focusable } from '@decky/ui';
import type { GamepadEvent } from '@decky/ui';
import { memo, Ref, useMemo } from 'react';
import { browserStores, capsuleUrls, heroUrls, landscapeUrls } from './artwork';
import { wideArt } from './homeView';
import { clampFocus, isLibraryFocus, MAX_GHOSTS, RecentsGeometry, recentsLayout } from './recentsLayout';
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
 */
const GameCapsule = memo(function GameCapsule({ game, left, width, dim, wide, blur }: { game: HomeGame; left: number; width: number; dim: boolean; wide: boolean; blur: boolean }) {
    const appId = game.appId;
    const cover = useMemo(() => urls(() => capsuleUrls(appId, browserStores)), [appId]);
    const art = useMemo(
        () => (wide ? wideArt(urls(() => landscapeUrls(appId, browserStores)), urls(() => heroUrls(appId, browserStores)), cover) : null),
        [appId, wide, cover],
    );
    return (
        <div className={`gh-cap${wide ? ' gh-cap-wide' : ''}`} style={{ left: `${left}px`, width: `${width}px`, opacity: dim ? 0.35 : 1 }}>
            <CapsuleArt cover={cover} art={art} blur={blur} />
            {/* A game new to the library (the "New to library" setting), as Steam's Home marks it. */}
            {game.isNew && <div className="gh-cap-new">{tr('newMark')}</div>}
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
    /** A: the selected game's page, or the Library on the Library card. */
    onActivate(): void;
}

/**
 * The recents row: games, then "View more in your Library", then the loop preview of the first games. One focusable for
 * the whole row (the cards slide by transform, so Steam's spatial navigation never moves between them): while it has
 * focus the selected card is highlighted, Left/Right select games and A opens the selected one (`nav`, from
 * SpotlightHome, which owns `selected`: it drives hero, title and actions; the row slides to follow). Taps and clicks
 * still do nothing (pointer events are off in homeCss). Rendered only with games. `geometry` is the card scale's sizes
 * (handheld or docked), the same SpotlightHome gives homeCss.
 */
export function RecentsRow({ games, selected, geometry, nav }: { games: HomeGame[]; selected: number; geometry: RecentsGeometry; nav: RecentsRowNav }) {
    const count = games.length;
    const at = clampFocus(count, selected);
    const layout = recentsLayout(count, at, geometry);
    const onLibrary = isLibraryFocus(count, at);
    const library = layout.items[count];
    // The loop preview's portraits, read once per list of games (not on every step).
    const ghostCovers = useMemo(() => games.slice(0, MAX_GHOSTS).map((g) => urls(() => capsuleUrls(g.appId, browserStores))), [games]);
    return (
        <Focusable
            ref={nav.setRef as Ref<HTMLDivElement>}
            className="gh-recents"
            focusClassName="gh-recents-focus"
            noFocusRing
            preferredFocus={nav.preferred}
            onFocus={nav.onFocus}
            onGamepadFocus={nav.onFocus}
            onButtonDown={nav.onButtonDown}
            onActivate={nav.onActivate}
            role="listbox"
            aria-label={tr('recentGames')}
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
                    />
                ))}
                <div className={`gh-cap gh-cap-lib${onLibrary ? ' gh-cap-lib-on' : ''}`} style={{ left: `${library.left}px`, width: `${library.width}px` }}>
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
        </Focusable>
    );
}
