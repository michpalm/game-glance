import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Focusable, GamepadButton, GamepadEvent, Navigation } from '@decky/ui';
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
import { markLeavingLibrary, noteLibrary, takeLibraryRestore } from './libraryMemory';

interface SpotlightLibraryProps {
    mockGames?: LibraryGameItem[];
}

/** Launch source 100 is Steam's Big Picture library launch source */
const LAUNCH_SOURCE = 100;

function runGameId(appId: number, shortcutGameId: string | undefined): string {
    return typeof shortcutGameId === 'string' && shortcutGameId.length > 0 ? shortcutGameId : String(appId);
}

export function SpotlightLibrary({ mockGames }: SpotlightLibraryProps) {
    const currentSettings = useSettings();
    const columns = Math.min(7, Math.max(3, currentSettings.libraryGridColumns ?? 3));
    const categories: LibraryCategory[] = useMemo(() => buildCategories(mockGames), [mockGames]);

    // Memory restore on mount
    const restoreRef = useRef(takeLibraryRestore());
    const initialRestore = restoreRef.current;

    const initialCatId = useMemo(() => {
        if (initialRestore && categories.some((c) => c.id === initialRestore.categoryId)) {
            return initialRestore.categoryId;
        }
        return categories[0]?.id ?? 'installed';
    }, [categories, initialRestore]);

    const [activeCategoryId, setActiveCategoryId] = useState<string>(initialCatId);

    const activeCategory = useMemo(() => {
        return categories.find((c) => c.id === activeCategoryId) ?? categories[0];
    }, [categories, activeCategoryId]);

    const games = activeCategory?.games ?? [];

    const initialGameIdx = useMemo(() => {
        if (initialRestore && initialRestore.appId) {
            const found = games.findIndex((g) => g.appId === initialRestore.appId);
            if (found >= 0) return found;
        }
        return 0;
    }, [games, initialRestore]);

    const [selectedGameIdx, setSelectedGameIdx] = useState<number>(initialGameIdx);
    const [focusZone, setFocusZone] = useState<'grid' | 'tabs'>(initialRestore?.focusZone ?? 'grid');

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

    // Keep memory updated with latest position
    useEffect(() => {
        noteLibrary({
            categoryId: activeCategoryId,
            appId: selectedGame?.appId ?? 0,
            focusZone,
        });
    }, [activeCategoryId, selectedGame?.appId, focusZone]);

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

    // Primary action: Open game details (A button)
    const handleDetails = useCallback((gameToShow: LibraryGameItem | null = selectedGame) => {
        if (!gameToShow) return;
        markLeavingLibrary();
        try {
            Navigation.Navigate(`/library/app/${gameToShow.appId}`);
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: Navigate failed`, error);
        }
    }, [selectedGame]);

    // Secondary action: Play game (Y button)
    const handlePlayGame = useCallback((gameToPlay: LibraryGameItem | null = selectedGame) => {
        if (!gameToPlay) return;
        markLeavingLibrary();
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

    // Game selection with sound feedback
    const handleSelectGame = useCallback((index: number) => {
        setSelectedGameIdx(index);
        playNavSound();
    }, []);

    // Activation debounce and mount guard
    const mountTimeRef = useRef(Date.now());
    const lastActivateRef = useRef(0);

    const onActivate = useCallback(() => {
        const now = Date.now();
        // Swallow activations within 400ms of mount (prevents double-tap on enter from launching immediately)
        if (now - mountTimeRef.current < 400) return;
        if (now - lastActivateRef.current < 800) return;
        lastActivateRef.current = now;
        handleDetails();
    }, [handleDetails]);

    const onCancel = useCallback(() => {
        if (focusZone === 'grid') {
            setFocusZone('tabs');
            playNavSound();
        }
    }, [focusZone]);

    // Gamepad controller event handler for Decky's Focusable tree
    const onGamepadButtonDown = useCallback((evt: GamepadEvent) => {
        try {
            const btn = Number(evt?.detail?.button);
            const now = Date.now();

            // Ignore inputs within 400ms of mount
            if (now - mountTimeRef.current < 400) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                return;
            }

            // Bumpers: L1 (5) and R1 (6)
            if (btn === GamepadButton.BUMPER_LEFT || btn === 5) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                cycleCategory(-1);
                return;
            }
            if (btn === GamepadButton.BUMPER_RIGHT || btn === 6) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                cycleCategory(1);
                return;
            }

            // Y Button: Play / Launch (OPTIONS = 4)
            if (btn === GamepadButton.OPTIONS || btn === 4) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                handlePlayGame();
                return;
            }

            // A Button: Details (OK = 1)
            if (btn === GamepadButton.OK || btn === 1) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                onActivate();
                return;
            }

            // B Button: Cancel (CANCEL = 2)
            if (btn === GamepadButton.CANCEL || btn === 2) {
                if (focusZone === 'grid') {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    setFocusZone('tabs');
                    playNavSound();
                    return;
                }
                // When on tabs, let Steam handle B so user exits the library cleanly
                return;
            }

            // D-Pad and Left Stick Navigation
            if (btn === GamepadButton.DIR_LEFT || btn === 11) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'tabs') {
                    cycleCategory(-1);
                } else if (games.length > 0 && selectedGameIdx > 0) {
                    handleSelectGame(selectedGameIdx - 1);
                }
                return;
            }

            if (btn === GamepadButton.DIR_RIGHT || btn === 12) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'tabs') {
                    cycleCategory(1);
                } else if (games.length > 0 && selectedGameIdx < games.length - 1) {
                    handleSelectGame(selectedGameIdx + 1);
                }
                return;
            }

            if (btn === GamepadButton.DIR_UP || btn === 9) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'grid') {
                    if (selectedGameIdx >= columns) {
                        handleSelectGame(selectedGameIdx - columns);
                    } else {
                        setFocusZone('tabs');
                        playNavSound();
                    }
                }
                return;
            }

            if (btn === GamepadButton.DIR_DOWN || btn === 10) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'tabs') {
                    setFocusZone('grid');
                    playNavSound();
                } else if (games.length > 0) {
                    if (selectedGameIdx + columns < games.length) {
                        handleSelectGame(selectedGameIdx + columns);
                    } else {
                        const curRow = Math.floor(selectedGameIdx / columns);
                        const lastRow = Math.floor((games.length - 1) / columns);
                        if (curRow < lastRow) {
                            handleSelectGame(games.length - 1);
                        }
                    }
                }
                return;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: Gamepad button error`, error);
        }
    }, [columns, cycleCategory, focusZone, games.length, handlePlayGame, handleSelectGame, onActivate, selectedGameIdx]);

    // Keyboard handlers for browser preview and physical keyboards
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
                if (selectedGameIdx >= columns) {
                    handleSelectGame(selectedGameIdx - columns);
                } else {
                    setFocusZone('tabs');
                    playNavSound();
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                if (selectedGameIdx + columns < games.length) {
                    handleSelectGame(selectedGameIdx + columns);
                } else {
                    const currentRow = Math.floor(selectedGameIdx / columns);
                    const lastRow = Math.floor((games.length - 1) / columns);
                    if (currentRow < lastRow) {
                        handleSelectGame(games.length - 1);
                    }
                }
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                onActivate();
                e.preventDefault();
            } else if (e.key === 'y' || e.key === 'Y') {
                handlePlayGame();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                if (focusZone === 'grid') {
                    setFocusZone('tabs');
                    playNavSound();
                    e.preventDefault();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusZone, selectedGameIdx, games.length, columns, cycleCategory, handleSelectGame, onActivate, handlePlayGame]);

    const activeCategoryIdx = categories.findIndex((c) => c.id === activeCategoryId);
    const hltbHours = gameHltb?.status === 'found' ? gameHltb.times.main : null;

    return (
        <Focusable
            className="sgl-root"
            preferredFocus={true}
            noFocusRing
            onButtonDown={onGamepadButtonDown}
            onActivate={onActivate}
            onCancel={onCancel}
        >
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
                    columns={columns}
                    isGridFocused={focusZone === 'grid'}
                    onSelectGame={handleSelectGame}
                    onLaunchGame={handleDetails}
                />
            </div>
        </Focusable>
    );
}
