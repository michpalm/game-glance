import { Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import type { HltbResult } from '../data/hltb';
import type { FeaturedId } from '../logic/infoSlots';
import { focusElement } from '../home/homeNav';

/**
 * What the game page's cards do when used (#24): a tap today; the controller (the cards made selectable, A) later
 * calls the same functions.
 */

/** Steam's Game Info tab on the game page: its id ends in GameInfo whatever the language (probed on the Deck). */
export const GAME_INFO_TAB = '[role="tab"][id$="GameInfo"]';

/** The game's HowLongToBeat page when it is matched; null otherwise. */
export function hltbUrl(result: HltbResult | undefined): string | null {
    return result?.status === 'found' ? `https://howlongtobeat.com/game/${result.gameId}` : null;
}

/** The info card: Steam's Game Info tab, selected and brought into view, with the controller's focus on it. */
export function openGameInfoTab(doc: Pick<Document, 'querySelector'>): boolean {
    try {
        const tab = doc.querySelector<HTMLElement>(GAME_INFO_TAB);
        if (!tab) return false;
        tab.click();
        focusElement(tab, 'the Game Info tab');
        tab.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} game page: could not open the Game Info tab`, error);
        return false;
    }
}

/** The HowLongToBeat card: the game's page on howlongtobeat.com, in Steam's browser. */
export function openHltbPage(result: HltbResult | undefined): boolean {
    const url = hltbUrl(result);
    if (!url) return false;
    try {
        Navigation.NavigateToExternalWeb(url);
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} game page: could not open HowLongToBeat`, error);
        return false;
    }
}

/** Your achievements for a game, where Steam's own game page and carousel go (Library.App.Achievements.My.Individual; the bare /achievements route draws an empty frame). */
export const achievementsRoute = (appId: number) => `/library/app/${appId}/achievements/my/individual`;
/** The game's ProtonDB page. */
export const protonDbUrl = (appId: number) => `https://www.protondb.com/app/${appId}`;

function go(what: string, run: () => void): boolean {
    try { run(); return true; } catch (error) { console.warn(`${LOG_PREFIX} game page: could not open ${what}`, error); return false; }
}

/**
 * What the featured card opens (Game info setting): HowLongToBeat's page when matched, Steam's achievements page,
 * the game on ProtonDB. Nothing for play time (no page shows more), none chosen, or a Steam page for a non-Steam game.
 */
export function featuredPress(featured: FeaturedId | null, game: { appId: number; isShortcut: boolean; hltb: HltbResult | undefined }): (() => boolean) | undefined {
    if (featured === 'hltb') return hltbUrl(game.hltb) ? () => openHltbPage(game.hltb) : undefined;
    if (game.isShortcut || !Number.isInteger(game.appId) || game.appId <= 0) return undefined;
    if (featured === 'achievements') return () => go('the achievements page', () => Navigation.Navigate(achievementsRoute(game.appId)));
    if (featured === 'protondb') return () => go('ProtonDB', () => Navigation.NavigateToExternalWeb(protonDbUrl(game.appId)));
    return undefined;
}
