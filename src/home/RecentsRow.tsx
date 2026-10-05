import { browserStores, capsuleUrls, heroUrls, landscapeUrls } from './artwork';
import { wideArt } from './homeView';
import { clampFocus, isLibraryFocus, RecentsGeometry, recentsLayout } from './recentsLayout';
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
function CapsuleArt({ cover, art }: { cover: string[]; art: string[] | null }) {
    return (
        <>
            <div className="gh-cap-blur" style={backgrounds(cover.slice(0, 1))} />
            <div className="gh-cap-cover" style={backgrounds(cover)} />
            {art && <div className="gh-cap-art" style={backgrounds(art)} />}
        </>
    );
}

function GameCapsule({ game, left, width, dim, wide }: { game: HomeGame; left: number; width: number; dim: boolean; wide: boolean }) {
    const cover = urls(() => capsuleUrls(game.appId, browserStores));
    const art = wide
        ? wideArt(urls(() => landscapeUrls(game.appId, browserStores)), urls(() => heroUrls(game.appId, browserStores)), cover)
        : null;
    return (
        <div className={`gh-cap${wide ? ' gh-cap-wide' : ''}`} style={{ left: `${left}px`, width: `${width}px`, opacity: dim ? 0.35 : 1 }}>
            <CapsuleArt cover={cover} art={art} />
            <div className="gh-cap-bar" />
        </div>
    );
}

/**
 * The recents row: games, then "View more in your Library", then the loop preview of the first games. Display only
 * (bumper navigation): nothing here is focusable or takes a press, tap or click (pointer events are off in homeCss);
 * L1/R1 on the action row changes `selected`, which lives in SpotlightHome (it drives hero, title and actions), and
 * the row slides to follow. Rendered only with games. `geometry` is the card scale's sizes (handheld or docked),
 * the same SpotlightHome gives homeCss.
 */
export function RecentsRow({ games, selected, geometry }: { games: HomeGame[]; selected: number; geometry: RecentsGeometry }) {
    const count = games.length;
    const at = clampFocus(count, selected);
    const layout = recentsLayout(count, at, geometry);
    const onLibrary = isLibraryFocus(count, at);
    const library = layout.items[count];
    return (
        <div className="gh-recents" aria-hidden="true">
            <div className="gh-recents-track" style={{ transform: `translateX(${layout.scrollX}px)` }}>
                {games.map((game, i) => (
                    <GameCapsule
                        key={game.appId}
                        game={game}
                        left={layout.items[i].left}
                        width={layout.items[i].width}
                        dim={layout.items[i].dim}
                        wide={!onLibrary && i === at}
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
                        <div className="gh-lib-label">View more in your Library</div>
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
                        <div className="gh-cap-cover" style={backgrounds(urls(() => capsuleUrls(games[j].appId, browserStores)))} />
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
