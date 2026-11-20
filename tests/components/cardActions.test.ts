import { Navigation } from '@decky/ui';
import { describe, expect, it, vi } from 'vitest';
import { GAME_INFO_TAB, hltbUrl, openGameInfoTab, openHltbPage } from '../../src/components/cardActions';
import type { HltbResult } from '../../src/data/hltb';

const found = { status: 'found', gameId: 68151, times: {} } as unknown as HltbResult;

describe('cardActions', () => {
    it('hltbUrl is the game\'s HowLongToBeat page when matched, and nothing otherwise', () => {
        expect(hltbUrl(found)).toBe('https://howlongtobeat.com/game/68151');
        expect(hltbUrl({ status: 'notFound' } as HltbResult)).toBeNull();
        expect(hltbUrl({ status: 'unavailable' } as HltbResult)).toBeNull();
        expect(hltbUrl(undefined)).toBeNull();
    });
    it('openHltbPage opens the page in Steam\'s browser only for a match', () => {
        const open = vi.mocked(Navigation.NavigateToExternalWeb);
        open.mockClear();
        expect(openHltbPage(found)).toBe(true);
        expect(open).toHaveBeenCalledWith('https://howlongtobeat.com/game/68151');
        expect(openHltbPage(undefined)).toBe(false);
        expect(open).toHaveBeenCalledTimes(1);
    });
    it('openGameInfoTab selects Steam\'s Game Info tab (by its language-independent id) and brings it into view', () => {
        const tab = { click: vi.fn(), scrollIntoView: vi.fn(), focus: vi.fn(), classList: { contains: () => true }, ownerDocument: {} as { activeElement?: unknown } };
        tab.ownerDocument.activeElement = tab;
        const doc = { querySelector: vi.fn((sel: string) => (sel === GAME_INFO_TAB ? tab : null)) };
        expect(openGameInfoTab(doc as unknown as Pick<Document, 'querySelector'>)).toBe(true);
        expect(tab.click).toHaveBeenCalledTimes(1);
        expect(tab.scrollIntoView).toHaveBeenCalledTimes(1);
        expect(tab.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
        expect(GAME_INFO_TAB).toBe('[role="tab"][id$="GameInfo"]');
    });
    it('openGameInfoTab does nothing without the tab', () => {
        expect(openGameInfoTab({ querySelector: () => null } as unknown as Pick<Document, 'querySelector'>)).toBe(false);
    });
});

describe('featuredPress: the featured card opens what it shows', async () => {
    const { featuredPress } = await import('../../src/components/cardActions');
    const nav = vi.mocked(Navigation.Navigate), web = vi.mocked(Navigation.NavigateToExternalWeb);
    const reset = () => { nav.mockClear(); web.mockClear(); };
    it('Achievements opens Game Glance\'s own Achievements page in the menu, for that game', () => {
        reset();
        const open = vi.fn(() => true);
        featuredPress('achievements', { appId: 1145360, isShortcut: false, hltb: undefined }, open)!();
        expect(open).toHaveBeenCalledWith('achievements:1145360');
        expect(nav).not.toHaveBeenCalled();
    });
    it('Achievements falls back to Steam\'s list when the menu is off or not running', () => {
        reset();
        featuredPress('achievements', { appId: 1145360, isShortcut: false, hltb: undefined }, () => false)!();
        expect(nav).toHaveBeenCalledWith('/library/app/1145360/achievements/my/individual');
    });
    it('ProtonDB opens the game on protondb.com in Steam\'s browser', () => {
        reset();
        featuredPress('protondb', { appId: 1145360, isShortcut: false, hltb: undefined })!();
        expect(web).toHaveBeenCalledWith('https://www.protondb.com/app/1145360');
    });
    it('HowLongToBeat opens its page only for a match', () => {
        reset();
        featuredPress('hltb', { appId: 1, isShortcut: false, hltb: found })!();
        expect(web).toHaveBeenCalledWith('https://howlongtobeat.com/game/68151');
        expect(featuredPress('hltb', { appId: 1, isShortcut: false, hltb: undefined })).toBeUndefined();
    });
    it('nothing for play time, none chosen, or a non-Steam game\'s Steam pages', () => {
        expect(featuredPress('played', { appId: 1, isShortcut: false, hltb: found })).toBeUndefined();
        expect(featuredPress(null, { appId: 1, isShortcut: false, hltb: found })).toBeUndefined();
        expect(featuredPress('achievements', { appId: 2000000001, isShortcut: true, hltb: undefined })).toBeUndefined();
        expect(featuredPress('protondb', { appId: 2000000001, isShortcut: true, hltb: undefined })).toBeUndefined();
        expect(featuredPress('achievements', { appId: 0, isShortcut: false, hltb: undefined })).toBeUndefined();
    });
});
