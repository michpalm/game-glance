import React, { useEffect, useRef, useState } from 'react';
import { FaBatteryThreeQuarters, FaChevronLeft, FaChevronRight, FaCloud, FaCog, FaGamepad, FaPlay, FaWifi } from 'react-icons/fa';
import { gameChips } from '../src/home/chips';
import { homeCss } from '../src/home/homeCss';
import { CARD_SCALE_HANDHELD, CARD_SCALE_DOCKED } from '../src/home/recentsLayout';
import { SourcePill } from '../src/components/SourcePill';
import { useSettings } from '../src/data/settings';
import { TrailerPlayer } from '../src/home/TrailerPlayer';
import { resolveGameTrailer, type GameTrailer } from '../src/home/trailers';
import { playNavSound } from '../src/home/navSound';
import { MOCK_GAMES, MockGame } from './mockData';

interface Props {
    deviceMode: 'handheld' | 'tv';
    customAccent: string | null;
}

const MOCK_FRIENDS = [
    { name: 'Alex', game: 'Hades', status: 'ingame', avatar: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg' },
    { name: 'Sarah', game: null, status: 'online', avatar: 'https://avatars.steamstatic.com/c1762c95b4526b3c22b16df89d9c222ffda5903b_medium.jpg' },
    { name: 'Marcus', game: 'Cyberpunk 2077', status: 'ingame', avatar: 'https://avatars.steamstatic.com/b5bd56c1aa4607f30f57f4ba9a1613386308a4ac_medium.jpg' },
    { name: 'Elena', game: null, status: 'away', avatar: 'https://avatars.steamstatic.com/6c934383c272a716766468bbca3efbc3a1c6a2ba_medium.jpg' },
];

const MOCK_NEWS = [
    {
        title: 'Patch 4.04 Notes — Complete Edition Updates',
        sub: 'The Witcher 3: Wild Hunt · Yesterday',
        image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
    },
    {
        title: 'Update 2.13 Available Now on PC & Steam Deck',
        sub: 'Cyberpunk 2077 · 3 days ago',
        image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
    },
];

const MOCK_DEALS = [
    { title: 'Chrono Trigger', discount: '-50%', price: '$7.49', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/637670/header.jpg' },
    { title: 'Hollow Knight', discount: '-50%', price: '$7.49', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg' },
    { title: 'Dead Cells', discount: '-40%', price: '$14.99', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/588650/header.jpg' },
];

export function SpotlightHomePreview({ deviceMode, customAccent }: Props) {
    const currentSettings = useSettings();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'news' | 'friends' | 'recommended'>('news');
    const [forceTextTitle, setForceTextTitle] = useState(false);
    const [logoFailed, setLogoFailed] = useState(false);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [showFallbackText, setShowFallbackText] = useState(false);

    const [trailer, setTrailer] = useState<GameTrailer | null>(null);
    const [showTrailer, setShowTrailer] = useState(false);
    const idleTrailerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Multi-layer hero background for seamless directional crossfade
    const [bgLayers, setBgLayers] = useState<Array<{ id: number; url: string; direction: 'left' | 'right' | 'none' }>>([
        { id: 1, url: MOCK_GAMES[0].heroUrl, direction: 'none' },
    ]);
    const pruneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismissTrailer = () => {
        if (showTrailer) setShowTrailer(false);
    };

    const handleSelectIndex = (nextIndex: number) => {
        if (nextIndex === selectedIndex) return;
        playNavSound();
        dismissTrailer();
        const direction: 'left' | 'right' = nextIndex < selectedIndex ? 'left' : 'right';
        setSelectedIndex(nextIndex);
        setLogoFailed(false);
        setLogoLoaded(false);
        setShowFallbackText(false);

        const nextUrl = MOCK_GAMES[nextIndex].heroUrl;
        const id = Date.now();
        setBgLayers((prev) => [...prev.slice(-1), { id, url: nextUrl, direction }]);

        if (pruneTimer.current) clearTimeout(pruneTimer.current);
        pruneTimer.current = setTimeout(() => {
            setBgLayers((prev) => prev.filter((l) => l.id >= id));
        }, 550);
    };

    // Keyboard navigation with Left and Right arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            dismissTrailer();
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = (selectedIndex - 1 + MOCK_GAMES.length) % MOCK_GAMES.length;
                handleSelectIndex(prev);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = (selectedIndex + 1) % MOCK_GAMES.length;
                handleSelectIndex(next);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, showTrailer]);

    const currentGame: MockGame = MOCK_GAMES[selectedIndex];

    // 5-second idle lock trailer background
    useEffect(() => {
        setShowTrailer(false);
        setTrailer(null);
        if (idleTrailerTimerRef.current) clearTimeout(idleTrailerTimerRef.current);
        if (!currentSettings.trailerBackground) return undefined;

        let active = true;
        const resolvePromise = currentGame.trailerUrl
            ? Promise.resolve({ url: currentGame.trailerUrl, isHls: false } as GameTrailer)
            : resolveGameTrailer(currentGame.info);

        idleTrailerTimerRef.current = setTimeout(async () => {
            const resolved = await resolvePromise;
            if (!active) return;
            if (resolved) {
                setTrailer(resolved);
                setShowTrailer(true);
            }
        }, 5000);

        return () => {
            active = false;
            if (idleTrailerTimerRef.current) clearTimeout(idleTrailerTimerRef.current);
        };
    }, [selectedIndex, currentSettings.trailerBackground, currentGame.info, currentGame.trailerUrl]);

    useEffect(() => {
        setLogoLoaded(false);
        if (!currentSettings.preferLogos || forceTextTitle || !currentGame.logoUrl) {
            setShowFallbackText(true);
            return;
        }
        setShowFallbackText(false);
        const timer = setTimeout(() => {
            setShowFallbackText(true);
        }, 350);
        return () => clearTimeout(timer);
    }, [selectedIndex, forceTextTitle, currentSettings.preferLogos, currentGame.logoUrl]);
    const accentColor = customAccent ?? currentGame.accent;
    const cardScale = deviceMode === 'tv' ? CARD_SCALE_DOCKED : CARD_SCALE_HANDHELD;
    const css = homeCss(cardScale);

    // Calculate real chips using game's stats
    const chips = gameChips(
        {
            playedMinutes: currentGame.info.playedMinutes,
            achievements: currentGame.info.achievements,
            lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 2, // 2 hours ago
            hltbMainHours: currentGame.hltb.status === 'found' ? currentGame.hltb.times.main : null,
        },
        Math.floor(Date.now() / 1000),
        'en',
    );

    return (
        <div
            className="gh-root"
            onClick={dismissTrailer}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#05070a',
                ['--glance-accent' as any]: accentColor,
                ['--glance-accent-text' as any]: '#ffffff',
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {/* Spotlight Home Core CSS from homeCss.ts */}
            <style>{css}</style>

            {/* Custom local overrides for preview container */}
            <style>{`
                .gh-root {
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                }
                @keyframes gh-hero-in-left {
                    from {
                        opacity: 0;
                        transform: scale(1.09) translate3d(-45px, 0, 0);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1.02) translate3d(0, 0, 0);
                    }
                }
                @keyframes gh-hero-in-right {
                    from {
                        opacity: 0;
                        transform: scale(1.09) translate3d(45px, 0, 0);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1.02) translate3d(0, 0, 0);
                    }
                }
                @keyframes gh-hero-ambient {
                    0% {
                        transform: scale(1.02) translate3d(0, 0, 0);
                    }
                    50% {
                        transform: scale(1.06) translate3d(16px, -8px, 0);
                    }
                    100% {
                        transform: scale(1.03) translate3d(-12px, 6px, 0);
                    }
                }
                .gh-bg-layer {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                    z-index: 0;
                }
                .gh-bg-layer.gh-hero-in-left {
                    animation: gh-hero-in-left 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .gh-bg-layer.gh-hero-in-right {
                    animation: gh-hero-in-right 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .gh-bg-layer.gh-bg-settled {
                    animation: none;
                    opacity: 1;
                }
                .gh-bg-image {
                    position: absolute;
                    inset: -40px;
                    background-size: cover;
                    background-position: center 30%;
                    background-repeat: no-repeat;
                    animation: gh-hero-ambient 24s ease-in-out infinite alternate;
                    will-change: transform;
                }
                .gh-scrim-layer {
                    position: absolute;
                    inset: 0;
                    background:
                        linear-gradient(180deg, rgba(5,7,10,0.7) 0%, rgba(5,7,10,0.15) 30%, rgba(5,7,10,0.85) 75%, rgba(5,7,10,0.98) 100%),
                        linear-gradient(90deg, rgba(5,7,10,0.85) 0%, rgba(5,7,10,0.3) 50%, transparent 80%);
                    z-index: 1;
                    pointer-events: none;
                }
                .gh-content-container {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 20px 48px 30px;
                    box-sizing: border-box;
                    overflow-y: auto;
                }
                .gh-top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 20px;
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.7);
                }
                .gh-capsule-item {
                    transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
                    cursor: pointer;
                    user-select: none;
                }
                .gh-capsule-item:hover {
                    transform: translateY(-4px);
                }
            `}</style>

            {/* Background Hero Art with Directional Zoom-in & Ambient Breathing Pulse */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {bgLayers.map((layer, i) => {
                    const isTop = i === bgLayers.length - 1;
                    const dirClass = layer.direction === 'left' ? 'gh-hero-in-left' : layer.direction === 'right' ? 'gh-hero-in-right' : '';
                    return (
                        <div
                            key={layer.id}
                            className={`gh-bg-layer ${isTop ? dirClass : 'gh-bg-settled'}`}
                        >
                            <div
                                className="gh-bg-image"
                                style={{
                                    backgroundImage: `url(${layer.url})`,
                                }}
                            />
                        </div>
                    );
                })}
                {trailer && <TrailerPlayer trailer={trailer} active={showTrailer} onDismiss={dismissTrailer} />}
            </div>
            <div className="gh-scrim-layer" />

            {/* Main Interactive Screen Content */}
            <div className="gh-content-container">
                {/* 1. Top Status Bar (Clock, Battery, Wi-Fi, Persona Status Dot) */}
                <div className="gh-top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1fbf8f', boxShadow: '0 0 8px #1fbf8f' }} />
                        <span>Online</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <FaWifi size={14} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>95%</span>
                            <FaBatteryThreeQuarters size={16} />
                        </div>
                        <span>4:30 PM</span>
                    </div>
                </div>

                {/* 2. Spotlight Title Block */}
                <div style={{ marginTop: 24, marginBottom: 20, maxWidth: 650 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                            Last played · Today
                        </div>
                        <button
                            onClick={() => setForceTextTitle((v) => !v)}
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: 4,
                                background: forceTextTitle ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                            title="Toggle between game logo and text title fallback"
                        >
                            {forceTextTitle ? 'Mode: Text Fallback' : 'Mode: Game Logo'}
                        </button>
                    </div>

                    {/* Game Title Slot: Logo when available and loaded, otherwise H1 text */}
                    {(() => {
                        const canTryLogo = currentSettings.preferLogos && !forceTextTitle && Boolean(currentGame.logoUrl) && !logoFailed;
                        const shouldShowText = !logoLoaded && (!canTryLogo || showFallbackText);

                        return (
                            <div
                                style={{
                                    height: 150,
                                    minHeight: 150,
                                    maxHeight: 190,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'flex-start',
                                    marginBottom: 16,
                                    position: 'relative',
                                }}
                            >
                                {canTryLogo && (
                                    <img
                                        key={currentGame.logoUrl}
                                        src={currentGame.logoUrl}
                                        alt={currentGame.info.name}
                                        onLoad={() => {
                                            setLogoLoaded(true);
                                            setShowFallbackText(false);
                                        }}
                                        onError={() => {
                                            setLogoFailed(true);
                                            setShowFallbackText(true);
                                        }}
                                        style={{
                                            maxHeight: 150,
                                            maxWidth: 520,
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            objectPosition: 'left center',
                                            margin: 0,
                                            filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.85))',
                                            userSelect: 'none',
                                            pointerEvents: 'none',
                                            display: logoLoaded ? 'block' : 'none',
                                            animation: 'gh-fade-in 250ms ease both',
                                        }}
                                    />
                                )}
                                {shouldShowText && (
                                    <h1
                                        style={{
                                            fontSize: 44,
                                            fontWeight: 800,
                                            margin: 0,
                                            textShadow: '0 4px 16px rgba(0,0,0,0.8)',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1.1,
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                    >
                                        {currentGame.info.name}
                                    </h1>
                                )}
                            </div>
                        );
                    })()}

                    {/* Chips Row (Played, Achievements, HLTB Main) */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {chips.map((c) => (
                            <div
                                key={c.key}
                                style={{
                                    background: 'rgba(12, 16, 22, 0.65)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    backdropFilter: 'blur(12px)',
                                    minWidth: 100,
                                }}
                            >
                                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)' }}>
                                    {c.label}
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                                    {c.value}
                                </div>
                                {c.progress !== undefined && (
                                    <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.round(c.progress * 100)}%`, background: accentColor }} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Action Row (Play Pill, Controller, Settings, Cloud, Store Pill) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 32px',
                            borderRadius: 999,
                            background: accentColor,
                            color: '#ffffff',
                            border: 'none',
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: `0 4px 20px -4px ${accentColor}`,
                        }}
                    >
                        <FaPlay size={13} />
                        <span>PLAY</span>
                    </button>

                    <button
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                        title="Controller settings"
                    >
                        <FaGamepad size={18} />
                    </button>

                    <button
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                        title="Manage game"
                    >
                        <FaCog size={18} />
                    </button>

                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'rgba(31, 191, 143, 0.15)',
                            color: '#1fbf8f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Steam Cloud in sync"
                    >
                        <FaCloud size={16} />
                    </div>

                    <div style={{ marginLeft: 8 }}>
                        <SourcePill label={currentGame.source} />
                    </div>
                </div>

                {/* 4. Recents Row Carousel */}
                <div style={{ marginBottom: 36 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Recent Games (Click to switch / ◀ ▶ keys / L1 R1)
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => handleSelectIndex((selectedIndex - 1 + MOCK_GAMES.length) % MOCK_GAMES.length)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                                title="Select game to the left (Zoom in Left)"
                            >
                                <FaChevronLeft size={10} />
                                <span>Left (L1)</span>
                            </button>
                            <button
                                onClick={() => handleSelectIndex((selectedIndex + 1) % MOCK_GAMES.length)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                                title="Select game to the right (Zoom in Right)"
                            >
                                <span>Right (R1)</span>
                                <FaChevronRight size={10} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', overflowX: 'auto', paddingBottom: 10 }}>
                        {MOCK_GAMES.map((g, idx) => {
                            const isSelected = selectedIndex === idx;
                            return (
                                <div
                                    key={g.info.appId}
                                    className="gh-capsule-item"
                                    onClick={() => handleSelectIndex(idx)}
                                    style={{
                                        position: 'relative',
                                        flexShrink: 0,
                                        width: isSelected ? 320 : 130,
                                        height: 180,
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        boxShadow: isSelected
                                            ? `0 0 0 2px ${accentColor}, 0 16px 36px -10px ${accentColor}80`
                                            : '0 8px 20px rgba(0,0,0,0.4)',
                                        border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <img
                                        src={isSelected ? g.heroUrl : `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.info.appId}/library_600x900.jpg`}
                                        alt={g.info.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    {/* Bottom gradient on wide capsule */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: isSelected
                                                ? 'linear-gradient(0deg, rgba(5,7,10,0.9) 0%, rgba(5,7,10,0.2) 50%, transparent 80%)'
                                                : 'linear-gradient(0deg, rgba(5,7,10,0.7) 0%, transparent 60%)',
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 12,
                                            bottom: 10,
                                            right: 12,
                                            fontSize: isSelected ? 15 : 12,
                                            fontWeight: 700,
                                            color: '#fff',
                                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {g.info.name}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. Feed Sheet (What's New / Friends / Recommended) */}
                <div
                    style={{
                        background: 'rgba(12, 16, 22, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 16,
                        padding: '20px 24px',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Tab Bar */}
                    <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12, marginBottom: 16 }}>
                        <button
                            onClick={() => setActiveTab('news')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'news' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                                position: 'relative',
                                paddingBottom: 4,
                            }}
                        >
                            What's New
                            {activeTab === 'news' && (
                                <div style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: 3, background: accentColor, borderRadius: 2 }} />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('friends')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'friends' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                                position: 'relative',
                                paddingBottom: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <span>Friends</span>
                            <span style={{ fontSize: 11, background: '#1fbf8f', color: '#000', padding: '1px 6px', borderRadius: 10, fontWeight: 800 }}>
                                3
                            </span>
                            {activeTab === 'friends' && (
                                <div style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: 3, background: accentColor, borderRadius: 2 }} />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('recommended')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'recommended' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                                position: 'relative',
                                paddingBottom: 4,
                            }}
                        >
                            Recommended Deals
                            {activeTab === 'recommended' && (
                                <div style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: 3, background: accentColor, borderRadius: 2 }} />
                            )}
                        </button>
                    </div>

                    {/* Tab Content: News */}
                    {activeTab === 'news' && (
                        <div style={{ display: 'flex', gap: 16 }}>
                            {MOCK_NEWS.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <img src={item.image} alt={item.title} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                                    <div style={{ padding: 12 }}>
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{item.sub}</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 4 }}>{item.title}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab Content: Friends */}
                    {activeTab === 'friends' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                            {MOCK_FRIENDS.map((f, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: 10,
                                        borderRadius: 8,
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <img src={f.avatar} alt={f.name} style={{ width: 40, height: 40, borderRadius: 6, display: 'block' }} />
                                        <span
                                            style={{
                                                position: 'absolute',
                                                bottom: -2,
                                                right: -2,
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: f.status === 'ingame' ? '#1fbf8f' : f.status === 'online' ? '#58a6ff' : '#8b949e',
                                                border: '2px solid #0c1016',
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{f.name}</div>
                                        <div style={{ fontSize: 11, color: f.status === 'ingame' ? '#1fbf8f' : 'rgba(255,255,255,0.5)' }}>
                                            {f.game ? `In: ${f.game}` : f.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab Content: Recommended Deals */}
                    {activeTab === 'recommended' && (
                        <div style={{ display: 'flex', gap: 16 }}>
                            {MOCK_DEALS.map((d, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <img src={d.image} alt={d.title} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                                    <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{d.title}</div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{d.price}</div>
                                        </div>
                                        <span style={{ background: '#238636', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 800, fontSize: 12 }}>
                                            {d.discount}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
