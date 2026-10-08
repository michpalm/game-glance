import React, { useEffect, useRef } from 'react';
import { browserStores, landscapeUrls as getLandscapeUrls } from '../home/artwork';
import { LibraryGameItem } from './libraryData';

interface LibraryGridProps {
    games: LibraryGameItem[];
    selectedIndex: number;
    accent: string;
    columns?: number;
    onSelectGame: (index: number) => void;
    onLaunchGame: (game: LibraryGameItem) => void;
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

export function LibraryGrid({
    games,
    selectedIndex,
    accent,
    columns = 3,
    onSelectGame,
    onLaunchGame,
    isGridFocused = true,
}: LibraryGridProps) {
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
                        onDoubleClick={() => onLaunchGame(game)}
                    />
                ))}
            </div>
        </main>
    );
}
