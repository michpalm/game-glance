import React, { useEffect, useRef } from 'react';
import { FaFolder } from 'react-icons/fa';
import { browserStores, capsuleUrls as getCapsuleUrls, landscapeUrls as getLandscapeUrls } from '../home/artwork';
import { LibraryCollectionItem, LibraryGameItem } from './libraryData';

interface LibraryGridProps {
    games: LibraryGameItem[];
    collections?: LibraryCollectionItem[];
    isCollectionsView?: boolean;
    selectedIndex: number;
    accent: string;
    columns?: number;
    onSelectGame: (index: number) => void;
    onLaunchGame?: (game: LibraryGameItem) => void;
    onOpenCollection?: (collection: LibraryCollectionItem) => void;
    isGridFocused?: boolean;
}

interface BannerCardProps {
    game: LibraryGameItem;
    isFocused: boolean;
    accent: string;
    onClick: () => void;
    onDoubleClick: () => void;
}

function BannerCard({ game, isFocused, accent, onClick, onDoubleClick }: BannerCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    // Ensure focused card scrolls into view vertically within the grid panel (never scrolls parent layout)
    useEffect(() => {
        if (isFocused && cardRef.current) {
            const container = cardRef.current.closest('.sgl-grid-panel');
            if (container) {
                const cRect = container.getBoundingClientRect();
                const elRect = cardRef.current.getBoundingClientRect();
                if (elRect.top < cRect.top + 20) {
                    container.scrollTop += elRect.top - cRect.top - 20;
                } else if (elRect.bottom > cRect.bottom - 20) {
                    container.scrollTop += elRect.bottom - cRect.bottom + 20;
                }
            }
        }
    }, [isFocused]);

    const candidates = React.useMemo(() => {
        if (game.landscapeUrl) return [game.landscapeUrl];
        return getLandscapeUrls(game.appId, browserStores);
    }, [game.appId, game.landscapeUrl]);

    const [src, setSrc] = React.useState<string>(candidates[0] ?? '');
    const [candidateIdx, setCandidateIdx] = React.useState(0);
    const [hasError, setHasError] = React.useState(false);

    useEffect(() => {
        setCandidateIdx(0);
        setHasError(false);
        setSrc(candidates[0] ?? '');
    }, [candidates]);

    const handleError = () => {
        const next = candidateIdx + 1;
        if (next < candidates.length) {
            setCandidateIdx(next);
            setSrc(candidates[next]);
        } else {
            setHasError(true);
        }
    };

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            data-app-id={game.appId}
            className={`sgl-card${isFocused ? ' focused' : ''}`}
            style={{
                '--accent': accent,
                '--accent-glow': `${accent}55`,
            } as React.CSSProperties}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            {src && !hasError ? (
                <img
                    key={src}
                    src={src}
                    alt={game.name}
                    className="sgl-card-img"
                    onError={handleError}
                    loading="lazy"
                />
            ) : (
                <div className="sgl-card-fallback">
                    <span className="sgl-card-title">{game.name}</span>
                </div>
            )}

            {game.running && (
                <div className="sgl-card-running-badge">
                    <div className="sgl-running-dot" />
                    <span>PLAYING</span>
                </div>
            )}

            <div className="sgl-card-bar" />
        </div>
    );
}

function MiniCover({ game, className }: { game?: LibraryGameItem; className: string }) {
    const candidates = React.useMemo(() => {
        if (!game) return [];
        if (game.capsuleUrl) return [game.capsuleUrl];
        return getCapsuleUrls(game.appId, browserStores);
    }, [game]);

    const [src, setSrc] = React.useState<string>(candidates[0] ?? '');
    const [idx, setIdx] = React.useState(0);
    const [hasError, setHasError] = React.useState(false);

    useEffect(() => {
        setIdx(0);
        setHasError(false);
        setSrc(candidates[0] ?? '');
    }, [candidates]);

    const handleError = () => {
        const next = idx + 1;
        if (next < candidates.length) {
            setIdx(next);
            setSrc(candidates[next]);
        } else {
            setHasError(true);
        }
    };

    if (!game || !src || hasError) {
        return (
            <div className={`sgl-col-fan-card ${className}`}>
                <div style={{ width: '100%', height: '100%', background: '#1c2433', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaFolder size={18} color="rgba(255,255,255,0.4)" />
                </div>
            </div>
        );
    }

    return (
        <div className={`sgl-col-fan-card ${className}`}>
            <img src={src} alt={game.name} onError={handleError} loading="lazy" />
        </div>
    );
}

interface CollectionCardProps {
    collection: LibraryCollectionItem;
    isFocused: boolean;
    accent: string;
    onClick: () => void;
    onDoubleClick: () => void;
}

function CollectionCard({ collection, isFocused, accent, onClick, onDoubleClick }: CollectionCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFocused && cardRef.current) {
            const container = cardRef.current.closest('.sgl-grid-panel');
            if (container) {
                const cRect = container.getBoundingClientRect();
                const elRect = cardRef.current.getBoundingClientRect();
                if (elRect.top < cRect.top + 20) {
                    container.scrollTop += elRect.top - cRect.top - 20;
                } else if (elRect.bottom > cRect.bottom - 20) {
                    container.scrollTop += elRect.bottom - cRect.bottom + 20;
                }
            }
        }
    }, [isFocused]);

    const games = collection.games;
    const game0 = games[0];
    const game1 = games[1];
    const game2 = games[2];
    const game3 = games[3];
    const game4 = games[4];

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            data-collection-id={collection.id}
            className={`sgl-card-collection${isFocused ? ' focused' : ''}`}
            style={{
                '--accent': accent,
                '--accent-glow': `${accent}55`,
            } as React.CSSProperties}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            <div className="sgl-col-fan-area">
                {games.length >= 5 ? (
                    <>
                        <MiniCover game={game3} className="sgl-col-card-far-left" />
                        <MiniCover game={game1} className="sgl-col-card-left" />
                        <MiniCover game={game4} className="sgl-col-card-far-right" />
                        <MiniCover game={game2} className="sgl-col-card-right" />
                        <MiniCover game={game0} className="sgl-col-card-center" />
                    </>
                ) : games.length === 4 ? (
                    <>
                        <MiniCover game={game3} className="sgl-col-card-far-left" />
                        <MiniCover game={game1} className="sgl-col-card-left" />
                        <MiniCover game={game2} className="sgl-col-card-right" />
                        <MiniCover game={game0} className="sgl-col-card-center" />
                    </>
                ) : games.length === 3 ? (
                    <>
                        <MiniCover game={game1} className="sgl-col-card-left" />
                        <MiniCover game={game2} className="sgl-col-card-right" />
                        <MiniCover game={game0} className="sgl-col-card-center" />
                    </>
                ) : games.length === 2 ? (
                    <>
                        <MiniCover game={game1} className="sgl-col-card-left" />
                        <MiniCover game={game0} className="sgl-col-card-center" />
                    </>
                ) : games.length === 1 ? (
                    <MiniCover game={game0} className="sgl-col-card-center" />
                ) : (
                    <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <FaFolder size={32} color="var(--accent, #58a6ff)" />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Empty Collection</span>
                    </div>
                )}
            </div>

            <div className="sgl-col-footer">
                <span className="sgl-col-footer-title">{collection.name}</span>
                <span className="sgl-col-footer-badge">{collection.count} {collection.count === 1 ? 'GAME' : 'GAMES'}</span>
            </div>

            <div className="sgl-card-bar" />
        </div>
    );
}

export function LibraryGrid({
    games,
    collections,
    isCollectionsView = false,
    selectedIndex,
    accent,
    columns = 3,
    onSelectGame,
    onLaunchGame,
    onOpenCollection,
    isGridFocused = true,
}: LibraryGridProps) {
    if (isCollectionsView) {
        const cols = collections ?? [];
        if (cols.length === 0) {
            return (
                <main className="sgl-grid-panel">
                    <div className="sgl-empty">
                        <span>No user collections found</span>
                    </div>
                </main>
            );
        }

        return (
            <main className="sgl-grid-panel">
                <div className="sgl-grid" style={{ '--sgl-columns': columns } as React.CSSProperties}>
                    {cols.map((col, idx) => (
                        <CollectionCard
                            key={`col-${col.id}-${idx}`}
                            collection={col}
                            isFocused={isGridFocused && idx === selectedIndex}
                            accent={accent}
                            onClick={() => onSelectGame(idx)}
                            onDoubleClick={() => onOpenCollection?.(col)}
                        />
                    ))}
                </div>
            </main>
        );
    }

    if (games.length === 0) {
        return (
            <main className="sgl-grid-panel">
                <div className="sgl-empty">
                    <span>No games found in this category</span>
                </div>
            </main>
        );
    }

    return (
        <main className="sgl-grid-panel">
            <div className="sgl-grid" style={{ '--sgl-columns': columns } as React.CSSProperties}>
                {games.map((game, idx) => (
                    <BannerCard
                        key={`${game.appId}-${game.isSoundtrack ? 'ost' : 'game'}-${idx}`}
                        game={game}
                        isFocused={isGridFocused && idx === selectedIndex}
                        accent={accent}
                        onClick={() => onSelectGame(idx)}
                        onDoubleClick={() => onLaunchGame?.(game)}
                    />
                ))}
            </div>
        </main>
    );
}
