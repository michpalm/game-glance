import React, { useEffect, useState } from 'react';
import { FaPlay, FaInfoCircle } from 'react-icons/fa';
import { browserStores, capsuleUrls as getCapsuleUrls, logoUrls as getLogoUrls } from '../home/artwork';
import { Chip, gameChips } from '../home/chips';
import { steamLanguageToLocale } from '../logic/format';
import { peekSteamLanguage } from '../data/steam';
import { LibraryGameItem } from './libraryData';

interface LibraryInspectorProps {
    game: LibraryGameItem | null;
    accent: string;
    description: string | null;
    hltbMainHours: number | null;
    preferLogos?: boolean;
    onPlay: () => void;
    onDetails: () => void;
}

export function LibraryInspector({
    game,
    accent,
    description,
    hltbMainHours,
    preferLogos = true,
    onPlay,
    onDetails,
}: LibraryInspectorProps) {
    if (!game) {
        return (
            <aside className="sgl-inspector">
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: 40 }}>
                    Select a game
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

    // Logo artwork candidates
    const logoCandidates = React.useMemo(() => {
        if (game.logoUrl) return [game.logoUrl];
        return getLogoUrls(game.appId, browserStores);
    }, [game.appId, game.logoUrl]);

    const [logoSrc, setLogoSrc] = useState<string>(logoCandidates[0] ?? '');
    const [logoCandidateIdx, setLogoCandidateIdx] = useState(0);
    const [logoFailed, setLogoFailed] = useState(false);

    useEffect(() => {
        setLogoCandidateIdx(0);
        setLogoFailed(false);
        setLogoSrc(logoCandidates[0] ?? '');
    }, [logoCandidates]);

    const handleLogoError = () => {
        const nextIdx = logoCandidateIdx + 1;
        if (nextIdx < logoCandidates.length) {
            setLogoCandidateIdx(nextIdx);
            setLogoSrc(logoCandidates[nextIdx]);
        } else {
            setLogoFailed(true);
        }
    };

    // Compute chips using gameChips helper
    const chips: Chip[] = React.useMemo(() => {
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
    }, [game.playedMinutes, game.achievements, game.lastPlayed, hltbMainHours, locale]);

    const playLabel = game.running ? 'Resume' : game.installed ? 'Play' : 'Install';

    return (
        <aside className="sgl-inspector" style={{ '--accent': accent } as React.CSSProperties}>
            {/* Vertical Poster Art */}
            <div className="sgl-poster-wrapper">
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

            {/* Game Title or Logo */}
            <div className="sgl-title-box">
                {preferLogos && logoSrc && !logoFailed ? (
                    <img
                        key={logoSrc}
                        src={logoSrc}
                        alt={game.name}
                        className="sgl-title-logo"
                        onError={handleLogoError}
                    />
                ) : (
                    <div className="sgl-title-text">{game.name}</div>
                )}
            </div>

            {/* Badges row: Source and Status */}
            <div className="sgl-meta-row">
                <span className="sgl-source-pill">{game.source}</span>
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

            {/* Action Buttons */}
            <div className="sgl-actions">
                <button className="sgl-btn-play" onClick={onPlay}>
                    <FaPlay size={11} />
                    <span>{playLabel}</span>
                    <span className="sgl-btn-badge">A</span>
                </button>
                <button className="sgl-btn-details" onClick={onDetails}>
                    <FaInfoCircle size={13} />
                    <span>Details</span>
                    <span className="sgl-btn-badge">Y</span>
                </button>
            </div>
        </aside>
    );
}
