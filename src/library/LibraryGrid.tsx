import React, { useEffect, useRef } from 'react';
import { FaFolder } from 'react-icons/fa';
import { browserStores, landscapeUrls as getLandscapeUrls } from '../home/artwork';
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

    // Ensure focused card scrolls into view
    useEffect(() => {
        if (isFocused && cardRef.current) {
            cardRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            });
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
            cardRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            });
        }
    }, [isFocused]);

    const firstGame = collection.games[0];
    const candidates = React.useMemo(() => {
        if (!firstGame) return [];
        if (firstGame.landscapeUrl) return [firstGame.landscapeUrl];
        return getLandscapeUrls(firstGame.appId, browserStores);
    }, [firstGame]);

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
                    alt={collection.name}
                    className="sgl-card-img"
                    onError={handleError}
                    loading="lazy"
                />
            ) : (
                <div className="sgl-card-fallback">
                    <span className="sgl-card-title">{collection.name}</span>
                </div>
            )}

            <div className="sgl-card-col-badge">
                <FaFolder size={11} />
                <span>COLLECTION</span>
            </div>

            <div className="sgl-card-col-info">
                <div className="sgl-card-col-title">{collection.name}</div>
                <div className="sgl-card-col-count">{collection.count} {collection.count === 1 ? 'GAME' : 'GAMES'}</div>
            </div>
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
