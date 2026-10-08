import React, { useEffect, useState } from 'react';
import { FaPlay, FaInfoCircle, FaMusic, FaFolderOpen } from 'react-icons/fa';
import { browserStores, capsuleUrls as getCapsuleUrls } from '../home/artwork';
import { Chip, gameChips } from '../home/chips';
import { formatHours, minutesToHours, steamLanguageToLocale } from '../logic/format';
import { formatLastPlayed } from '../home/recents';
import { peekSteamLanguage } from '../data/steam';
import { LibraryCollectionItem, LibraryGameItem } from './libraryData';

interface LibraryInspectorProps {
    game: LibraryGameItem | null;
    collection?: LibraryCollectionItem | null;
    isCollectionView?: boolean;
    accent: string;
    description: string | null;
    hltbMainHours: number | null;
    preferLogos?: boolean;
    onPlay: () => void;
    onDetails: () => void;
    onOpenCollection?: () => void;
}

function InspectorFanCover({ game, className }: { game?: LibraryGameItem; className: string }) {
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
            <div className={`sgl-insp-col-card ${className}`}>
                <div style={{ width: '100%', height: '100%', background: '#1c2433', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaFolderOpen size={24} color="rgba(255,255,255,0.4)" />
                </div>
            </div>
        );
    }

    return (
        <div className={`sgl-insp-col-card ${className}`}>
            <img src={src} alt={game.name} onError={handleError} />
        </div>
    );
}

export function LibraryInspector({
    game,
    collection,
    isCollectionView = false,
    accent,
    description,
    hltbMainHours,
    onPlay,
    onDetails,
    onOpenCollection,
}: LibraryInspectorProps) {
    // Collection overview mode with multi-poster fan showcase
    if (isCollectionView && collection) {
        const games = collection.games;
        const game0 = games[0];
        const game1 = games[1];
        const game2 = games[2];

        return (
            <aside className="sgl-inspector" style={{ '--accent': accent } as React.CSSProperties}>
                <div className="sgl-inspector-col-fan">
                    {games.length >= 3 ? (
                        <>
                            <InspectorFanCover game={game1} className="sgl-insp-col-card-left" />
                            <InspectorFanCover game={game2} className="sgl-insp-col-card-right" />
                            <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                        </>
                    ) : games.length === 2 ? (
                        <>
                            <InspectorFanCover game={game1} className="sgl-insp-col-card-left" />
                            <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                        </>
                    ) : games.length === 1 ? (
                        <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                    ) : (
                        <div
                            style={{
                                width: 96,
                                height: 144,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#161b24',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.15)',
                            }}
                        >
                            <FaFolderOpen size={36} color="var(--accent, #58a6ff)" />
                        </div>
                    )}
                </div>

                <div className="sgl-title-box">
                    <div className="sgl-title-text">{collection.name}</div>
                </div>

                <div className="sgl-meta-row">
                    <span className="sgl-source-pill">Collection</span>
                    <span className="sgl-status-pill">{collection.count} Games</span>
                </div>

                <div className="sgl-stats-grid">
                    <div className="sgl-stat-card">
                        <span className="sgl-stat-label">Total Games</span>
                        <span className="sgl-stat-value">{collection.count}</span>
                    </div>
                </div>

                <div className="sgl-description">
                    Custom collection with {collection.count} {collection.count === 1 ? 'game' : 'games'}.
                </div>

                <div className="sgl-actions">
                    <button className="sgl-btn-details" onClick={onOpenCollection} style={{ width: '100%' }}>
                        <FaFolderOpen size={13} />
                        <span>Open Collection</span>
                        <span className="sgl-btn-badge">A</span>
                    </button>
                </div>
            </aside>
        );
    }

    if (!game) {
        return (
            <aside className="sgl-inspector">
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: 40 }}>
                    Select an item
                </div>
            </aside>
        );
    }

    const locale = steamLanguageToLocale(peekSteamLanguage() ?? 'english');

    // Poster artwork candidates
    const posterCandidates = React.useMemo(() => {
        if (game.capsuleUrl) return [game.capsuleUrl];
        return getCapsuleUrls(game.appId, browserStores);
    }, [game.appId, game.capsuleUrl]);

    const [posterSrc, setPosterSrc] = useState<string>(posterCandidates[0] ?? '');
    const [posterCandidateIdx, setPosterCandidateIdx] = useState(0);

    useEffect(() => {
        setPosterCandidateIdx(0);
        setPosterSrc(posterCandidates[0] ?? '');
    }, [posterCandidates]);

    const handlePosterError = () => {
        const nextIdx = posterCandidateIdx + 1;
        if (nextIdx < posterCandidates.length) {
            setPosterCandidateIdx(nextIdx);
            setPosterSrc(posterCandidates[nextIdx]);
        }
    };

    // Compute chips: customized for soundtracks vs regular games
    const chips: Chip[] = React.useMemo(() => {
        if (game.isSoundtrack) {
            const playedHours = minutesToHours(game.playedMinutes);
            const list: Chip[] = [];
            if (game.playedMinutes > 0) {
                list.push({ key: 'played', label: 'Time Listened', value: formatHours(playedHours, locale) });
            }
            if (game.lastPlayed) {
                list.push({ key: 'lastPlayed', label: 'Last played', value: formatLastPlayed(game.lastPlayed, Math.floor(Date.now() / 1000), locale) });
            }
            list.push({ key: 'type', label: 'Format', value: 'Soundtrack' });
            return list;
        }

        return gameChips(
            {
                playedMinutes: game.playedMinutes,
                achievements: game.achievements,
                lastPlayed: game.lastPlayed ?? 0,
                hltbMainHours,
            },
            Date.now(),
            locale
        );
    }, [game.isSoundtrack, game.playedMinutes, game.achievements, game.lastPlayed, hltbMainHours, locale]);

    const playLabel = game.running
        ? (game.isSoundtrack ? 'Playing' : 'Resume')
        : game.installed
            ? (game.isSoundtrack ? 'Play Soundtrack' : 'Play')
            : 'Install';

    return (
        <aside className="sgl-inspector" style={{ '--accent': accent } as React.CSSProperties}>
            {/* Poster Art: vertical 2:3 for games, square 1:1 for soundtracks */}
            <div className={`sgl-poster-wrapper${game.isSoundtrack ? ' sgl-poster-square' : ''}`}>
                {posterSrc ? (
                    <img
                        key={posterSrc}
                        src={posterSrc}
                        alt={game.name}
                        className="sgl-poster-img"
                        onError={handlePosterError}
                    />
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#161b24',
                            color: '#8b949e',
                            fontSize: 12,
                            padding: 12,
                            textAlign: 'center',
                        }}
                    >
                        {game.name}
                    </div>
                )}
            </div>

            {/* Game Title: Clean typography, no cluttered secondary logo */}
            <div className="sgl-title-box">
                <div className="sgl-title-text">{game.name}</div>
            </div>

            {/* Badges row: Source and Status */}
            <div className="sgl-meta-row">
                <span className="sgl-source-pill">{game.isSoundtrack ? 'Soundtrack' : game.source}</span>
                {game.running && <span className="sgl-status-pill">Running</span>}
                {!game.installed && (
                    <span
                        className="sgl-source-pill"
                        style={{ background: 'rgba(238, 175, 43, 0.2)', color: '#e3b341', borderColor: 'rgba(238, 175, 43, 0.3)' }}
                    >
                        Not installed
                    </span>
                )}
            </div>

            {/* Glance Stats Grid */}
            <div className="sgl-stats-grid">
                {chips.map((chip) => (
                    <div key={chip.key} className="sgl-stat-card">
                        <span className="sgl-stat-label">{chip.label}</span>
                        <span className="sgl-stat-value">{chip.value}</span>
                        {typeof chip.progress === 'number' && (
                            <div className="sgl-stat-bar">
                                <div
                                    className="sgl-stat-fill"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, chip.progress * 100))}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Short Description */}
            {description && <div className="sgl-description">{description}</div>}

            {/* Action Buttons: Single button for soundtracks, Details (A) and Play (Y) for games */}
            {game.isSoundtrack ? (
                <div className="sgl-actions">
                    <button className="sgl-btn-details" onClick={onDetails} style={{ width: '100%' }}>
                        <FaMusic size={12} />
                        <span>Open Soundtrack</span>
                        <span className="sgl-btn-badge">A</span>
                    </button>
                </div>
            ) : (
                <div className="sgl-actions">
                    <button className="sgl-btn-details" onClick={onDetails}>
                        <FaInfoCircle size={13} />
                        <span>Details</span>
                        <span className="sgl-btn-badge">A</span>
                    </button>
                    <button className="sgl-btn-play" onClick={onPlay}>
                        <FaPlay size={11} />
                        <span>{playLabel}</span>
                        <span className="sgl-btn-badge">Y</span>
                    </button>
                </div>
            )}
        </aside>
    );
}
