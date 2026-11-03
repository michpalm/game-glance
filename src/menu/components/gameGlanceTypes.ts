import type { CategoryId } from '../../data/settingsCategories';
import type { createSettingsStore, Settings } from '../../data/settings';
import type { SocialKeyboardMode } from '../preferences';

/** The settings store's setters. */
export type SettingsActions = Omit<ReturnType<typeof createSettingsStore>, 'load' | 'get' | 'subscribe'>;

/** Everything the Game Glance views show, read by PluginsSection from the stores. */
export interface GgValues {
    settings: Settings;
    menuEnabled: boolean;
    menuReady: boolean;
    socialKeyboard: SocialKeyboardMode;
    rowChosen: string;
    rowName: string;
    collectionRow: boolean;
    /** Recent games first, then Steam's collections, as the Games row picker lists them. */
    rowChoices: { id: string; label: string }[];
    summaries: Record<CategoryId, string>;
    screensaverAvailable: boolean;
    game: { name: string; match: string; matched: boolean; override: boolean } | null;
    fetching: { running: boolean; found: number; done: number; total: number };
    update: { line: string; available: string | null; checking: boolean; installing: boolean };
    version: string;
    error: string;
}

/** What the views can ask for. Every setting change goes through run(), which shows the menu's error line on failure. */
export interface GgActions {
    store: SettingsActions;
    setMenuEnabled(value: boolean): Promise<void>;
    setSocialKeyboard(mode: SocialKeyboardMode): Promise<void>;
    run(change: Promise<unknown>): void;
    open(viewId: string): void;
    back(): void;
    changeMatch(): void;
    openHltb(): void;
    removeOverride(): void;
    preview(): void;
    togglePreload(): void;
    clearCache(): void;
    checkUpdate(): void;
    installUpdate(): void;
    chooseVersion(): void;
}

export interface PageProps { v: GgValues; a: GgActions }
