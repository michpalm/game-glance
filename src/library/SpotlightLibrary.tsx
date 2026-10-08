import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Focusable, GamepadButton, GamepadEvent, Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { cache } from '../data/cache';
import { HltbResult, lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { getDescription, peekSteamLanguage } from '../data/steam';
import { openGameActions } from '../home/ActionRow';
import { accentFor, DEFAULT_ACCENT } from '../home/accent';
import { sampleAccent } from '../home/accentSample';
import { browserStores, guessedHeroUrls, heroUrls as getHeroUrls } from '../home/artwork';
import { playNavSound } from '../home/navSound';
import { LibraryBackground } from './LibraryBackground';
import { LibraryCategoryBar } from './LibraryCategoryBar';
import { LibraryGrid } from './LibraryGrid';
import { LibraryInspector } from './LibraryInspector';
import { LIBRARY_CSS } from './libraryCss';
import { buildCategories, LibraryCategory, LibraryCollectionItem, LibraryGameItem } from './libraryData';
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
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(initialRestore?.subCollectionId ?? null);

    const activeCategory = useMemo(() => {
        return categories.find((c) => c.id === activeCategoryId) ?? categories[0];
    }, [categories, activeCategoryId]);

    const isCollectionsTab = activeCategory?.id === 'collections';
    const isInsideSubCollection = isCollectionsTab && Boolean(selectedCollectionId);

    const activeSubCollection: LibraryCollectionItem | null = useMemo(() => {
        if (!isInsideSubCollection) return null;
        return activeCategory?.collections?.find((c) => c.id === selectedCollectionId) ?? null;
    }, [isInsideSubCollection, activeCategory, selectedCollectionId]);

    // Items list for current view: games in standard categories or sub-collection; collections in collections overview
    const currentGames: LibraryGameItem[] = useMemo(() => {
        if (isCollectionsTab) {
            return activeSubCollection?.games ?? [];
        }
        return activeCategory?.games ?? [];
    }, [isCollectionsTab, activeSubCollection, activeCategory]);

    const currentCollections: LibraryCollectionItem[] = useMemo(() => {
        if (isCollectionsTab && !isInsideSubCollection) {
            return activeCategory?.collections ?? [];
        }
        return [];
    }, [isCollectionsTab, isInsideSubCollection, activeCategory]);

    const totalItemsCount = isCollectionsTab && !isInsideSubCollection ? currentCollections.length : currentGames.length;

    const initialGameIdx = useMemo(() => {
        if (initialRestore && initialRestore.appId && currentGames.length > 0) {
            const found = currentGames.findIndex((g) => g.appId === initialRestore.appId);
            if (found >= 0) return found;
        }
        return 0;
    }, [currentGames, initialRestore]);

    const [selectedGameIdx, setSelectedGameIdx] = useState<number>(initialGameIdx);
    const [focusZone, setFocusZone] = useState<'grid' | 'tabs'>(initialRestore?.focusZone ?? 'grid');

    const selectedGame: LibraryGameItem | null = currentGames[selectedGameIdx] ?? null;
    const selectedCollectionItem: LibraryCollectionItem | null = currentCollections[selectedGameIdx] ?? null;

    // Reset game index when category changes
    const selectCategory = useCallback((id: string) => {
        setActiveCategoryId(id);
        setSelectedCollectionId(null);
        setSelectedGameIdx(0);
        playNavSound();
    }, []);

    // Tab / Collection bumper cycling
    const cycleCategory = useCallback((direction: -1 | 1) => {
        // When inside a sub-collection, bumpers cycle between available collections
        if (isInsideSubCollection && activeCategory?.collections && activeCategory.collections.length > 0) {
            const cols = activeCategory.collections;
            const curIdx = cols.findIndex((c) => c.id === selectedCollectionId);
            const nextIdx = (curIdx + direction + cols.length) % cols.length;
            setSelectedCollectionId(cols[nextIdx].id);
            setSelectedGameIdx(0);
            playNavSound();
            return;
        }

        const curIdx = categories.findIndex((c) => c.id === activeCategoryId);
        if (curIdx < 0) return;
        const nextIdx = (curIdx + direction + categories.length) % categories.length;
        selectCategory(categories[nextIdx].id);
    }, [isInsideSubCollection, activeCategory, selectedCollectionId, categories, activeCategoryId, selectCategory]);

    const navigateHome = useCallback(() => {
        markLeavingLibrary();
        try {
            Navigation.Navigate('/library/home');
        } catch {
            try {
                Navigation.Navigate('/');
            } catch {}
        }
    }, []);

    // Open a collection to view its games
    const handleOpenCollection = useCallback((col: LibraryCollectionItem | null = selectedCollectionItem) => {
        if (!col) return;
        setSelectedCollectionId(col.id);
        setSelectedGameIdx(0);
        playNavSound();
    }, [selectedCollectionItem]);

    // Back to collections list
    const handleBackToCollections = useCallback(() => {
        if (!isInsideSubCollection) return;
        const prevIdx = activeCategory?.collections?.findIndex((c) => c.id === selectedCollectionId) ?? 0;
        setSelectedCollectionId(null);
        setSelectedGameIdx(Math.max(0, prevIdx));
        playNavSound();
    }, [isInsideSubCollection, activeCategory, selectedCollectionId]);

    // Keep memory updated with latest position
    useEffect(() => {
        noteLibrary({
            categoryId: activeCategoryId,
            subCollectionId: selectedCollectionId,
            appId: selectedGame?.appId ?? 0,
            focusZone,
        });
    }, [activeCategoryId, selectedCollectionId, selectedGame?.appId, focusZone]);

    // Asynchronous details for selected game (HLTB, Description, Accent)
    const [gameAccent, setGameAccent] = useState<string>(selectedGame?.accent ?? DEFAULT_ACCENT);
    const [gameDesc, setGameDesc] = useState<string | null>(selectedGame?.description ?? null);
    const [gameHltb, setGameHltb] = useState<HltbResult | null>(null);

    // Resolve hero candidate URLs for ambient background (includes custom, local, and Steam CDN fallbacks)
    const heroCandidates = useMemo(() => {
        if (isCollectionsTab && !isInsideSubCollection && selectedCollectionItem) {
            const firstGame = selectedCollectionItem.games[0];
            if (!firstGame) return [];
            if (firstGame.heroUrl) return [firstGame.heroUrl];
            const heroes = getHeroUrls(firstGame.appId, browserStores);
            return [...heroes, ...guessedHeroUrls(firstGame.appId)];
        }
        if (!selectedGame) return [];
        if (selectedGame.heroUrl) return [selectedGame.heroUrl];
        const heroes = getHeroUrls(selectedGame.appId, browserStores);
        return [...heroes, ...guessedHeroUrls(selectedGame.appId)];
    }, [selectedGame, isCollectionsTab, isInsideSubCollection, selectedCollectionItem]);

    // Keep parent containers pinned at scrollLeft 0 (guards against layout shifts)
    useEffect(() => {
        const el = document.querySelector('.sgl-root') as HTMLElement | null;
        let parent: HTMLElement | null = el;
        while (parent) {
            if (parent.scrollLeft !== 0) {
                parent.scrollLeft = 0;
            }
            parent = parent.parentElement;
        }
    }, [activeCategoryId, selectedGameIdx]);

    useEffect(() => {
        if (!selectedGame) return;

        // Reset details for new game
        setGameAccent(selectedGame.accent ?? DEFAULT_ACCENT);
        setGameDesc(selectedGame.description ?? null);
        setGameHltb(null);

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

    // Selection with sound feedback
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

        if (isCollectionsTab && !isInsideSubCollection) {
            handleOpenCollection();
            return;
        }

        handleDetails();
    }, [handleDetails, handleOpenCollection, isCollectionsTab, isInsideSubCollection]);

    const onCancel = useCallback(() => {
        if (isInsideSubCollection) {
            handleBackToCollections();
            return;
        }
        if (focusZone === 'grid') {
            setFocusZone('tabs');
            playNavSound();
            return;
        }
        // At root tabs level: nowhere else to go back inside Library -> take user to Home
        navigateHome();
    }, [focusZone, handleBackToCollections, isInsideSubCollection, navigateHome]);

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

            // START / Options / View Menu: Open Steam Game Options Menu (START = 14, SELECT = 13)
            if (btn === GamepadButton.START || btn === 14 || btn === GamepadButton.SELECT || btn === 13) {
                if (selectedGame) {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    const cardEl = (
                        document.querySelector(`.sgl-card[data-app-id="${selectedGame.appId}"]`) ??
                        document.querySelectorAll('.sgl-card')[selectedGameIdx] ??
                        document.querySelector('.sgl-card.focused') ??
                        document.querySelector('.sgl-inspector') ??
                        document.querySelector('.sgl-root') ??
                        document.body
                    ) as HTMLElement;
                    openGameActions(selectedGame.appId, cardEl);
                    return;
                }
            }

            // Y Button: Play / Launch (OPTIONS = 4)
            if (btn === GamepadButton.OPTIONS || btn === 4) {
                if (isCollectionsTab && !isInsideSubCollection) return;
                evt.preventDefault?.();
                evt.stopPropagation?.();
                handlePlayGame();
                return;
            }

            // A Button: Details / Open Collection (OK = 1)
            if (btn === GamepadButton.OK || btn === 1) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                onActivate();
                return;
            }

            // B Button: Cancel (CANCEL = 2) - returns to collections list, to tabs, or to Home screen
            if (btn === GamepadButton.CANCEL || btn === 2) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                onCancel();
                return;
            }

            // D-Pad and Left Stick Navigation
            if (btn === GamepadButton.DIR_LEFT || btn === 11) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'tabs') {
                    cycleCategory(-1);
                } else if (totalItemsCount > 0 && selectedGameIdx > 0) {
                    handleSelectGame(selectedGameIdx - 1);
                }
                return;
            }

            if (btn === GamepadButton.DIR_RIGHT || btn === 12) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'tabs') {
                    cycleCategory(1);
                } else if (totalItemsCount > 0 && selectedGameIdx < totalItemsCount - 1) {
                    handleSelectGame(selectedGameIdx + 1);
                }
                return;
            }

            if (btn === GamepadButton.DIR_UP || btn === 9) {
                if (focusZone === 'grid') {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    if (selectedGameIdx >= columns) {
                        handleSelectGame(selectedGameIdx - columns);
                    } else {
                        setFocusZone('tabs');
                        playNavSound();
                    }
                    return;
                }
                // When ALREADY in tabs: DO NOT preventDefault or stopPropagation!
                // Allow Steam's native spatial navigator to move focus UP into the top header (Search bar)!
                return;
            }

            if (btn === GamepadButton.DIR_DOWN || btn === 10) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                if (focusZone === 'tabs') {
                    setFocusZone('grid');
                    playNavSound();
                } else if (totalItemsCount > 0) {
                    if (selectedGameIdx + columns < totalItemsCount) {
                        handleSelectGame(selectedGameIdx + columns);
                    } else {
                        const curRow = Math.floor(selectedGameIdx / columns);
                        const lastRow = Math.floor((totalItemsCount - 1) / columns);
                        if (curRow < lastRow) {
                            handleSelectGame(totalItemsCount - 1);
                        }
                    }
                }
                return;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: Gamepad button error`, error);
        }
    }, [columns, cycleCategory, focusZone, totalItemsCount, handleBackToCollections, handlePlayGame, handleSelectGame, isCollectionsTab, isInsideSubCollection, onActivate, selectedGameIdx]);

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
                // Allow ArrowUp from tabs to bubble up to Steam's top bar
                return;
            }

            // In Grid
            if (totalItemsCount === 0) return;

            if (e.key === 'ArrowLeft') {
                if (selectedGameIdx > 0) {
                    handleSelectGame(selectedGameIdx - 1);
                }
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                if (selectedGameIdx < totalItemsCount - 1) {
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
                if (selectedGameIdx + columns < totalItemsCount) {
                    handleSelectGame(selectedGameIdx + columns);
                } else {
                    const currentRow = Math.floor(selectedGameIdx / columns);
                    const lastRow = Math.floor((totalItemsCount - 1) / columns);
                    if (currentRow < lastRow) {
                        handleSelectGame(totalItemsCount - 1);
                    }
                }
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                onActivate();
                e.preventDefault();
            } else if (e.key === 'y' || e.key === 'Y') {
                if (!isCollectionsTab || isInsideSubCollection) {
                    handlePlayGame();
                }
                e.preventDefault();
            } else if (e.key === 'm' || e.key === 'M' || e.key === 'ContextMenu') {
                if (selectedGame) {
                    const cardEl = (
                        document.querySelector(`.sgl-card[data-app-id="${selectedGame.appId}"]`) ??
                        document.querySelectorAll('.sgl-card')[selectedGameIdx] ??
                        document.querySelector('.sgl-inspector') ??
                        document.body
                    ) as HTMLElement;
                    openGameActions(selectedGame.appId, cardEl);
                    e.preventDefault();
                }
            } else if (e.key === 'Escape') {
                onCancel();
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusZone, selectedGameIdx, totalItemsCount, columns, cycleCategory, handleSelectGame, onActivate, handlePlayGame, onCancel, isCollectionsTab, isInsideSubCollection, selectedGame]);

    const activeCategoryIdx = categories.findIndex((c) => c.id === activeCategoryId);
    const hltbHours = gameHltb?.status === 'found' ? gameHltb.times.main : null;

    return (
        <Focusable
            className="sgl-root"
            preferredFocus={true}
            noFocusRing
            onGamepadFocus={() => {
                // Focus returns from top header onto category tabs
                setFocusZone('tabs');
            }}
            onButtonDown={onGamepadButtonDown}
            onActivate={onActivate}
            onCancel={onCancel}
        >
            <style>{LIBRARY_CSS}</style>

            {/* Ambient Blurred Background */}
            <LibraryBackground candidates={heroCandidates} />

            {/* Top Categories Ribbon */}
            <LibraryCategoryBar
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={selectCategory}
                focusedIndex={activeCategoryIdx >= 0 ? activeCategoryIdx : 0}
                isHeaderFocused={focusZone === 'tabs'}
                activeSubCollectionName={activeSubCollection?.name}
                onBackToCollections={handleBackToCollections}
            />

            {/* Main Split Layout: Left Inspector + Right Grid */}
            <div className="sgl-body">
                <LibraryInspector
                    game={selectedGame}
                    collection={selectedCollectionItem}
                    isCollectionView={isCollectionsTab && !isInsideSubCollection}
                    accent={gameAccent}
                    description={gameDesc}
                    hltbMainHours={hltbHours}
                    preferLogos={currentSettings.preferLogos}
                    onPlay={() => handlePlayGame()}
                    onDetails={() => handleDetails()}
                    onOpenCollection={handleOpenCollection}
                />

                <LibraryGrid
                    games={currentGames}
                    collections={currentCollections}
                    isCollectionsView={isCollectionsTab && !isInsideSubCollection}
                    selectedIndex={selectedGameIdx}
                    accent={gameAccent}
                    columns={columns}
                    isGridFocused={focusZone === 'grid'}
                    onSelectGame={handleSelectGame}
                    onLaunchGame={handleDetails}
                    onOpenCollection={handleOpenCollection}
                />
            </div>
        </Focusable>
    );
}
