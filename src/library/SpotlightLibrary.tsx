import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { cache } from '../data/cache';
import { HltbResult, lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { getDescription, peekSteamLanguage } from '../data/steam';
import { accentFor, DEFAULT_ACCENT } from '../home/accent';
import { sampleAccent } from '../home/accentSample';
import { browserStores, heroUrls as getHeroUrls } from '../home/artwork';
import { playNavSound } from '../home/navSound';
import { LibraryBackground } from './LibraryBackground';
import { LibraryCategoryBar } from './LibraryCategoryBar';
import { LibraryGrid } from './LibraryGrid';
import { LibraryInspector } from './LibraryInspector';
import { LIBRARY_CSS } from './libraryCss';
import { buildCategories, LibraryCategory, LibraryGameItem } from './libraryData';

interface SpotlightLibraryProps {
    mockGames?: LibraryGameItem[];
}

const COLUMNS = 3;

/** Launch source 100 is Steam's Big Picture library launch source */
const LAUNCH_SOURCE = 100;

function runGameId(appId: number, shortcutGameId: string | undefined): string {
    return typeof shortcutGameId === 'string' && shortcutGameId.length > 0 ? shortcutGameId : String(appId);
}

export function SpotlightLibrary({ mockGames }: SpotlightLibraryProps) {
    const currentSettings = useSettings();
    const categories: LibraryCategory[] = useMemo(() => buildCategories(mockGames), [mockGames]);

    const [activeCategoryId, setActiveCategoryId] = useState<string>(() => categories[0]?.id ?? 'installed');
    const [selectedGameIdx, setSelectedGameIdx] = useState<number>(0);
    const [focusZone, setFocusZone] = useState<'grid' | 'tabs'>('grid');

    const activeCategory = useMemo(() => {
        return categories.find((c) => c.id === activeCategoryId) ?? categories[0];
    }, [categories, activeCategoryId]);

    const games = activeCategory?.games ?? [];
    const selectedGame: LibraryGameItem | null = games[selectedGameIdx] ?? null;

    // Reset game index when category changes
    const selectCategory = useCallback((id: string) => {
        setActiveCategoryId(id);
        setSelectedGameIdx(0);
        playNavSound();
    }, []);

    // Tab bumper cycling
    const cycleCategory = useCallback((direction: -1 | 1) => {
        const curIdx = categories.findIndex((c) => c.id === activeCategoryId);
        if (curIdx < 0) return;
        const nextIdx = (curIdx + direction + categories.length) % categories.length;
        selectCategory(categories[nextIdx].id);
    }, [categories, activeCategoryId, selectCategory]);

    // Asynchronous details for selected game (HLTB, Description, Accent, Hero art)
    const [gameAccent, setGameAccent] = useState<string>(selectedGame?.accent ?? DEFAULT_ACCENT);
    const [gameDesc, setGameDesc] = useState<string | null>(selectedGame?.description ?? null);
    const [gameHltb, setGameHltb] = useState<HltbResult | null>(null);
    const [heroUrl, setHeroUrl] = useState<string>(selectedGame?.heroUrl ?? '');

    useEffect(() => {
        if (!selectedGame) return;

        // Reset details for new game
        setGameAccent(selectedGame.accent ?? DEFAULT_ACCENT);
        setGameDesc(selectedGame.description ?? null);
        setGameHltb(null);

        // Resolve hero url for ambient background
        if (selectedGame.heroUrl) {
            setHeroUrl(selectedGame.heroUrl);
        } else {
            const heroes = getHeroUrls(selectedGame.appId, browserStores);
            if (heroes.length > 0) setHeroUrl(heroes[0]);
        }

        let cancelled = false;

        // Sample accent color
        if (!selectedGame.accent) {
            accentFor(selectedGame.appId, { cache, sample: sampleAccent })
                .then((color) => {
                    if (!cancelled) setGameAccent(color);
                })
                .catch(() => {});
        }

        // Fetch description if not already present
        if (!selectedGame.description) {
            const lang = peekSteamLanguage() ?? 'english';
            getDescription(selectedGame.appId, lang)
                .then((desc) => {
                    if (!cancelled) setGameDesc(desc);
                })
                .catch(() => {});
        }

        // Fetch HLTB stats
        lookupHltb({
            appId: selectedGame.appId,
            name: selectedGame.name,
            isShortcut: selectedGame.isShortcut,
        })
            .then((result) => {
                if (!cancelled) setGameHltb(result);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [selectedGame]);

    // Primary action: Play game
    const handlePlayGame = useCallback((gameToPlay: LibraryGameItem | null = selectedGame) => {
        if (!gameToPlay) return;
        try {
            const steamClient = (globalThis as unknown as { SteamClient?: { Apps?: { RunGame?(id: string, opts: string, param: number, src: number): void } } }).SteamClient;
            if (typeof steamClient?.Apps?.RunGame === 'function') {
                steamClient.Apps.RunGame(runGameId(gameToPlay.appId, gameToPlay.gameId), '', -1, LAUNCH_SOURCE);
                return;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: RunGame failed`, error);
        }
        // Fallback: navigate to app page
        try {
            Navigation.Navigate(`/library/app/${gameToPlay.appId}`);
        } catch {
            // ignore
        }
    }, [selectedGame]);

    // Secondary action: Details
    const handleDetails = useCallback((gameToShow: LibraryGameItem | null = selectedGame) => {
        if (!gameToShow) return;
        try {
            Navigation.Navigate(`/library/app/${gameToShow.appId}`);
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: Navigate failed`, error);
        }
    }, [selectedGame]);

    // Game selection with sound feedback
    const handleSelectGame = useCallback((index: number) => {
        setSelectedGameIdx(index);
        playNavSound();
    }, []);

    // Gamepad & Keyboard Navigation Handlers
    const activeCategoryIdx = categories.findIndex((c) => c.id === activeCategoryId);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Bumper controls: [ and ] or PageUp / PageDown
            if (e.key === 'PageUp' || e.key === '[' || e.key === 'q') {
                cycleCategory(-1);
                e.preventDefault();
                return;
            }
            if (e.key === 'PageDown' || e.key === ']' || e.key === 'e') {
                cycleCategory(1);
                e.preventDefault();
                return;
            }

            if (focusZone === 'tabs') {
                if (e.key === 'ArrowLeft') {
                    cycleCategory(-1);
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    cycleCategory(1);
                    e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    setFocusZone('grid');
                    playNavSound();
                    e.preventDefault();
                }
                return;
            }

            // In Grid
            if (games.length === 0) return;

            if (e.key === 'ArrowLeft') {
                if (selectedGameIdx > 0) {
                    handleSelectGame(selectedGameIdx - 1);
                }
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                if (selectedGameIdx < games.length - 1) {
                    handleSelectGame(selectedGameIdx + 1);
                }
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                if (selectedGameIdx >= COLUMNS) {
                    handleSelectGame(selectedGameIdx - COLUMNS);
                } else {
                    // Moving up from top row moves to Category Tabs
                    setFocusZone('tabs');
                    playNavSound();
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                if (selectedGameIdx + COLUMNS < games.length) {
                    handleSelectGame(selectedGameIdx + COLUMNS);
                }
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                handlePlayGame();
                e.preventDefault();
            } else if (e.key === 'y' || e.key === 'Y') {
                handleDetails();
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusZone, selectedGameIdx, games.length, cycleCategory, handleSelectGame, handlePlayGame, handleDetails]);

    // Gamepad controller polling (Standard Gamepad API loop)
    useEffect(() => {
        let rafId: number;
        let lastButtonState = new Map<number, boolean>();
        let lastDpadTime = 0;
        const DPAD_DELAY = 180; // ms throttle for held D-pad

        const pollGamepad = () => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gamepads[0];
            if (gp) {
                const now = Date.now();
                const isPressed = (btnIdx: number) => Boolean(gp.buttons[btnIdx]?.pressed);

                // L1 / R1 Bumpers (LB: 4, RB: 5 in Standard Gamepad)
                if (isPressed(4) && !lastButtonState.get(4)) {
                    cycleCategory(-1);
                }
                if (isPressed(5) && !lastButtonState.get(5)) {
                    cycleCategory(1);
                }

                // D-Pad and Left Stick
                const leftStickX = gp.axes[0] ?? 0;
                const leftStickY = gp.axes[1] ?? 0;
                const dpadUp = isPressed(12) || leftStickY < -0.55;
                const dpadDown = isPressed(13) || leftStickY > 0.55;
                const dpadLeft = isPressed(14) || leftStickX < -0.55;
                const dpadRight = isPressed(15) || leftStickX > 0.55;

                if (now - lastDpadTime > DPAD_DELAY) {
                    if (focusZone === 'tabs') {
                        if (dpadLeft) {
                            cycleCategory(-1);
                            lastDpadTime = now;
                        } else if (dpadRight) {
                            cycleCategory(1);
                            lastDpadTime = now;
                        } else if (dpadDown) {
                            setFocusZone('grid');
                            playNavSound();
                            lastDpadTime = now;
                        }
                    } else if (games.length > 0) {
                        if (dpadLeft && selectedGameIdx > 0) {
                            handleSelectGame(selectedGameIdx - 1);
                            lastDpadTime = now;
                        } else if (dpadRight && selectedGameIdx < games.length - 1) {
                            handleSelectGame(selectedGameIdx + 1);
                            lastDpadTime = now;
                        } else if (dpadUp) {
                            if (selectedGameIdx >= COLUMNS) {
                                handleSelectGame(selectedGameIdx - COLUMNS);
                            } else {
                                setFocusZone('tabs');
                                playNavSound();
                            }
                            lastDpadTime = now;
                        } else if (dpadDown && selectedGameIdx + COLUMNS < games.length) {
                            handleSelectGame(selectedGameIdx + COLUMNS);
                            lastDpadTime = now;
                        }
                    }
                }

                // A Button (0): Play
                if (isPressed(0) && !lastButtonState.get(0)) {
                    handlePlayGame();
                }

                // Y Button (3): Details
                if (isPressed(3) && !lastButtonState.get(3)) {
                    handleDetails();
                }

                // B Button (1): Move to tabs or back
                if (isPressed(1) && !lastButtonState.get(1)) {
                    if (focusZone === 'grid') {
                        setFocusZone('tabs');
                        playNavSound();
                    }
                }

                // Update button states
                for (let i = 0; i < gp.buttons.length; i++) {
                    lastButtonState.set(i, isPressed(i));
                }
            }
            rafId = requestAnimationFrame(pollGamepad);
        };

        rafId = requestAnimationFrame(pollGamepad);
        return () => cancelAnimationFrame(rafId);
    }, [focusZone, selectedGameIdx, games.length, cycleCategory, handleSelectGame, handlePlayGame, handleDetails]);

    const hltbHours = gameHltb?.status === 'found' ? gameHltb.times.main : null;

    return (
        <div className="sgl-root">
            <style>{LIBRARY_CSS}</style>

            {/* Ambient Blurred Background */}
            <LibraryBackground heroUrl={heroUrl} />

            {/* Top Categories Ribbon */}
            <LibraryCategoryBar
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={selectCategory}
                focusedIndex={activeCategoryIdx >= 0 ? activeCategoryIdx : 0}
                isHeaderFocused={focusZone === 'tabs'}
            />

            {/* Main Split Layout: Left Inspector + Right Grid */}
            <div className="sgl-body">
                <LibraryInspector
                    game={selectedGame}
                    accent={gameAccent}
                    description={gameDesc}
                    hltbMainHours={hltbHours}
                    preferLogos={currentSettings.preferLogos}
                    onPlay={() => handlePlayGame()}
                    onDetails={() => handleDetails()}
                />

                <LibraryGrid
                    games={games}
                    selectedIndex={selectedGameIdx}
                    accent={gameAccent}
                    isGridFocused={focusZone === 'grid'}
                    onSelectGame={handleSelectGame}
                    onLaunchGame={handlePlayGame}
                />
            </div>
        </div>
    );
}
