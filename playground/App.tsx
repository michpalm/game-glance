import React, { useState } from 'react';
import { FaCloud, FaCog, FaGamepad, FaPlay, FaSlidersH, FaTv, FaMobileAlt, FaHome, FaThLarge, FaLayerGroup } from 'react-icons/fa';
import { CleanInfo } from '../src/components/CleanInfo';
import { HltbCard } from '../src/components/HltbCard';
import { InfoCard } from '../src/components/InfoCard';
import { SettingsPanel } from '../src/components/SettingsPanel';
import { SourcePill } from '../src/components/SourcePill';
import { useSettings } from '../src/data/settings';
import { MOCK_GAMES } from './mockData';
import { SpotlightHomePreview } from './SpotlightHomePreview';
import { SpotlightLibraryPreview } from './SpotlightLibraryPreview';

export function App() {
    const currentSettings = useSettings();
    const [currentView, setCurrentView] = useState<'details' | 'home' | 'library'>('library');
    const [selectedGameIdx, setSelectedGameIdx] = useState(0);
    const [restyle, setRestyle] = useState(true);
    const [cleanLook, setCleanLook] = useState(false);
    const [deviceMode, setDeviceMode] = useState<'handheld' | 'tv'>('handheld');
    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
    const [customAccent, setCustomAccent] = useState<string | null>(null);
    const [detailsLogoLoaded, setDetailsLogoLoaded] = useState(false);
    const [showDetailsFallbackText, setShowDetailsFallbackText] = useState(false);

    const game = MOCK_GAMES[selectedGameIdx];
    const accentColor = customAccent ?? game.accent;

    React.useEffect(() => {
        setDetailsLogoLoaded(false);
        if (!currentSettings.preferLogos || !game.logoUrl) {
            setShowDetailsFallbackText(true);
            return;
        }
        setShowDetailsFallbackText(false);
        const timer = setTimeout(() => {
            setShowDetailsFallbackText(true);
        }, 350);
        return () => clearTimeout(timer);
    }, [selectedGameIdx, currentSettings.preferLogos, game.logoUrl]);

    // Scale unit for device mode
    const scaleUnit = deviceMode === 'tv' ? '1.5px' : '1px';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {/* Top Developer Control Toolbar */}
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 20px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    zIndex: 100,
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#58a6ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Game Glance</span>
                        <span style={{ fontSize: 11, background: '#21262d', color: '#8b949e', padding: '2px 8px', borderRadius: 12, border: '1px solid #30363d' }}>
                            v2.1.0 Preview
                        </span>
                    </div>

                    {/* View Switcher: Game Page vs Home Screen */}
                    <div style={{ display: 'flex', background: '#0d1117', borderRadius: 8, padding: 3, border: '1px solid #30363d' }}>
                        <button
                            onClick={() => setCurrentView('home')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 700,
                                border: 'none',
                                background: currentView === 'home' ? '#1f6feb' : 'transparent',
                                color: currentView === 'home' ? '#ffffff' : '#8b949e',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <FaHome size={14} /> Spotlight Home
                        </button>
                        <button
                            onClick={() => setCurrentView('library')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 700,
                                border: 'none',
                                background: currentView === 'library' ? '#1f6feb' : 'transparent',
                                color: currentView === 'library' ? '#ffffff' : '#8b949e',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <FaLayerGroup size={13} /> Spotlight Library
                        </button>
                        <button
                            onClick={() => setCurrentView('details')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 700,
                                border: 'none',
                                background: currentView === 'details' ? '#1f6feb' : 'transparent',
                                color: currentView === 'details' ? '#ffffff' : '#8b949e',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <FaThLarge size={13} /> Game Page Details
                        </button>
                    </div>

                    {/* Game Selector (Active in Details view) */}
                    {currentView === 'details' && (
                        <div style={{ display: 'flex', gap: 6, marginLeft: 6 }}>
                            {MOCK_GAMES.map((g, idx) => (
                                <button
                                    key={g.info.appId}
                                    onClick={() => {
                                        setSelectedGameIdx(idx);
                                        setCustomAccent(null);
                                    }}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        border: '1px solid',
                                        borderColor: selectedGameIdx === idx ? '#58a6ff' : '#30363d',
                                        background: selectedGameIdx === idx ? '#1f6feb26' : '#21262d',
                                        color: selectedGameIdx === idx ? '#58a6ff' : '#c9d1d9',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {g.info.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Toggles and controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {currentView === 'details' && (
                        <>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={restyle}
                                    onChange={(e) => setRestyle(e.target.checked)}
                                    style={{ accentColor: '#58a6ff', cursor: 'pointer' }}
                                />
                                <span>Restyle (2.1 Theme)</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={cleanLook}
                                    onChange={(e) => setCleanLook(e.target.checked)}
                                    style={{ accentColor: '#58a6ff', cursor: 'pointer' }}
                                />
                                <span>Clean Look</span>
                            </label>
                        </>
                    )}

                    {/* Device selector */}
                    <div style={{ display: 'flex', background: '#21262d', borderRadius: 6, padding: 2, border: '1px solid #30363d' }}>
                        <button
                            onClick={() => setDeviceMode('handheld')}
                            title="Handheld (1280x800 scale)"
                            style={{
                                padding: '4px 8px',
                                background: deviceMode === 'handheld' ? '#30363d' : 'transparent',
                                border: 'none',
                                color: deviceMode === 'handheld' ? '#fff' : '#8b949e',
                                borderRadius: 4,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                            }}
                        >
                            <FaMobileAlt /> Handheld
                        </button>
                        <button
                            onClick={() => setDeviceMode('tv')}
                            title="Docked TV (1920x1080 scale)"
                            style={{
                                padding: '4px 8px',
                                background: deviceMode === 'tv' ? '#30363d' : 'transparent',
                                border: 'none',
                                color: deviceMode === 'tv' ? '#fff' : '#8b949e',
                                borderRadius: 4,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                            }}
                        >
                            <FaTv /> TV
                        </button>
                    </div>

                    {/* Accent Color */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b949e' }}>
                        <span>Accent:</span>
                        <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setCustomAccent(e.target.value)}
                            style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                        />
                    </div>

                    {/* Quick Access Drawer Button */}
                    <button
                        onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                        style={{
                            padding: '6px 12px',
                            background: showSettingsDrawer ? '#238636' : '#21262d',
                            color: 'white',
                            border: '1px solid #30363d',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <FaSlidersH /> Quick Access
                    </button>
                </div>
            </header>

            {/* Main Preview Area */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    background: '#05070a',
                }}
            >
                {/* View 1: Spotlight Home Screen */}
                {currentView === 'home' && (
                    <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                        <SpotlightHomePreview deviceMode={deviceMode} customAccent={customAccent} />
                    </div>
                )}

                {/* View 2: Spotlight Library Screen */}
                {currentView === 'library' && (
                    <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                        <SpotlightLibraryPreview deviceMode={deviceMode} customAccent={customAccent} />
                    </div>
                )}

                {/* View 2: Simulated Steam Game Page Container */}
                {currentView === 'details' && (
                    <div
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            height: '100%',
                        }}
                    >
                        {/* Hero Background Art */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundImage: `url(${game.heroUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center top',
                                zIndex: 0,
                            }}
                        />

                        {/* Steam Vignette / Scrim Gradients */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: `
                                    linear-gradient(0deg, rgba(8, 11, 15, 0.94) 0%, rgba(8, 11, 15, 0.6) 34%, transparent 65%),
                                    linear-gradient(90deg, rgba(8, 11, 15, 0.65) 0%, rgba(8, 11, 15, 0.2) 45%, transparent 75%)
                                `,
                                zIndex: 1,
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Injected Content Layer */}
                        <div
                            style={{
                                position: 'relative',
                                zIndex: 2,
                                minHeight: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                padding: '3vw',
                                boxSizing: 'border-box',
                                ['--gg-u' as any]: scaleUnit,
                                ['--gg-accent' as any]: accentColor,
                            }}
                        >
                            {/* Game Logo or Title Block */}
                            {(() => {
                                const canTryLogo = currentSettings.preferLogos && Boolean(game.logoUrl);
                                const shouldShowText = !detailsLogoLoaded && (!canTryLogo || showDetailsFallbackText);

                                return (
                                    <div style={{ marginBottom: 24, maxWidth: 520, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                                        {canTryLogo && (
                                            <img
                                                key={game.logoUrl}
                                                src={game.logoUrl}
                                                alt={game.info.name}
                                                onLoad={() => {
                                                    setDetailsLogoLoaded(true);
                                                    setShowDetailsFallbackText(false);
                                                }}
                                                onError={() => {
                                                    setShowDetailsFallbackText(true);
                                                }}
                                                style={{
                                                    maxHeight: 200,
                                                    maxWidth: 520,
                                                    objectFit: 'contain',
                                                    objectPosition: 'left bottom',
                                                    margin: 0,
                                                    display: detailsLogoLoaded ? 'block' : 'none',
                                                    filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.75))',
                                                }}
                                            />
                                        )}
                                        {shouldShowText && (
                                            <h1 style={{ fontSize: 40, fontWeight: 800, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.8)', margin: 0 }}>
                                                {game.info.name}
                                            </h1>
                                        )}

                                        {restyle && (
                                            <div style={{ fontSize: 13, color: '#8b949e', marginTop: 8, fontWeight: 600 }}>
                                                Last played · Today
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Simulated Steam Action Row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 24,
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: 999,
                                        background: accentColor,
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <button
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '12px 28px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#ffffff',
                                            fontSize: 16,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <FaPlay style={{ fontSize: 13 }} />
                                        <span>PLAY</span>
                                    </button>
                                </div>

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
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: 'rgba(31, 191, 143, 0.15)',
                                        color: '#1fbf8f',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title="Steam Cloud Up to Date"
                                >
                                    <FaCloud size={16} />
                                </div>

                                <div style={{ marginLeft: 'auto' }}>
                                    <SourcePill label={game.source} />
                                </div>
                            </div>

                            {/* Clean Look Stats */}
                            {cleanLook && (
                                <div style={{ marginBottom: 16 }}>
                                    <CleanInfo game={game.info} hltb={game.hltb} locale="en" />
                                </div>
                            )}

                            {/* Game Glance Cards (InfoCard + HltbCard) */}
                            <div
                                className="gg-cards"
                                style={{
                                    display: 'flex',
                                    gap: 'calc(14 * var(--gg-u))',
                                    maxWidth: 960,
                                }}
                            >
                                <InfoCard game={game.info} locale="en" description={game.description} />
                                <HltbCard result={game.hltb} playedMinutes={game.info.playedMinutes} locale="en" restyle={restyle} />
                            </div>

                            <div
                                style={{
                                    marginTop: 24,
                                    textAlign: 'center',
                                    fontSize: 24,
                                    opacity: 0.35,
                                    color: '#fff',
                                }}
                            >
                                ⌄
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Access Drawer */}
                {showSettingsDrawer && (
                    <aside
                        style={{
                            width: 340,
                            height: '100%',
                            background: '#161920',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '-8px 0 24px rgba(0,0,0,0.6)',
                            animation: 'slideIn 0.2s ease-out',
                        }}
                    >
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Quick Access Menu</h3>
                            <button
                                onClick={() => setShowSettingsDrawer(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#8b949e',
                                    cursor: 'pointer',
                                    fontSize: 16,
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                            <SettingsPanel />
                        </div>
                    </aside>
                )}
            </div>

            {/* Embedded styles for Game Glance CSS classes */}
            <style>{`
                :root {
                    --gg-accent: ${accentColor};
                    --gg-ok: #1fbf8f;
                    --gg-warn: #e6b800;
                    --gg-bad: #e5484d;
                    --gg-off: #8a8f98;
                    --gg-glass: rgba(18, 22, 28, 0.72);
                    --gg-border: rgba(255, 255, 255, 0.12);
                    --gg-muted: rgba(255, 255, 255, 0.65);
                    --gg-u: ${scaleUnit};
                }

                .gg-cards {
                    display: flex;
                    gap: calc(14 * var(--gg-u));
                    align-items: stretch;
                }
                .gg-card {
                    flex: 1 1 0;
                    min-width: 0;
                    background: var(--gg-glass);
                    border: 1px solid var(--gg-border);
                    border-radius: calc(12 * var(--gg-u));
                    padding: calc(12 * var(--gg-u)) calc(16 * var(--gg-u));
                    backdrop-filter: blur(16px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                }
                .gg-card.gg-hltb {
                    flex: 1 1 0;
                }
                .gg-label {
                    font-size: calc(9 * var(--gg-u));
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--gg-muted);
                    white-space: nowrap;
                }
                .gg-value {
                    font-size: calc(18 * var(--gg-u));
                    font-weight: 700;
                    white-space: nowrap;
                    color: #fff;
                    margin-top: calc(2 * var(--gg-u));
                }
                .gg-stats {
                    display: flex;
                    gap: calc(20 * var(--gg-u));
                    margin-top: calc(4 * var(--gg-u));
                }
                .gg-desc {
                    margin: calc(8 * var(--gg-u)) 0 0;
                    font-size: calc(11 * var(--gg-u));
                    line-height: 1.45;
                    color: rgba(255, 255, 255, 0.85);
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .gg-bar {
                    margin-top: calc(10 * var(--gg-u));
                    height: calc(5 * var(--gg-u));
                    border-radius: calc(3 * var(--gg-u));
                    background: rgba(255, 255, 255, 0.14);
                    overflow: hidden;
                }
                .gg-bar > div {
                    height: 100%;
                    border-radius: calc(3 * var(--gg-u));
                    background: var(--gg-accent);
                    transition: width 0.3s ease;
                }
                .gg-caption {
                    margin-top: calc(6 * var(--gg-u));
                    font-size: calc(11 * var(--gg-u));
                    color: var(--gg-muted);
                }
                .gg-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 999px;
                    background: rgba(0, 0, 0, 0.55);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    font-size: calc(12 * var(--gg-u));
                    font-weight: 600;
                    color: #fff;
                    backdrop-filter: blur(8px);
                }
                .gg-pill-icon {
                    width: 14px;
                    height: 14px;
                }
                .gg-clean-info {
                    display: flex;
                    gap: 20px;
                    background: rgba(0, 0, 0, 0.5);
                    padding: 10px 16px;
                    border-radius: 8px;
                    width: fit-content;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
