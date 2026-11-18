import { describe, expect, it } from 'vitest';
import { categoryView, parseInfoView, GAME_GLANCE_VIEW, HOME_ROW_VIEW, pluginFocusKey, returnFocusKey, VERSIONS_VIEW } from '../../src/menu/views';
import { defaultMenuState, reduceMenu, type MenuState } from '../../src/menu/model';

function openOn(section: 'plugins' | 'navigate'): MenuState {
    let state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
    state = reduceMenu(state, { type: 'open', entry: 'home' });
    return reduceMenu(state, { type: 'select', section });
}

describe('menu views for the Plugins section', () => {
    it('names the views', () => {
        expect(GAME_GLANCE_VIEW).toBe('game-glance');
        expect(HOME_ROW_VIEW).toBe('gg:home:row');
        expect(VERSIONS_VIEW).toBe('gg:general:versions');
        expect(categoryView('status-bar')).toBe('gg:status-bar');
        expect(pluginFocusKey('Game Glance')).toBe('plugins:Game Glance');
    });
    it('returns focus to the row, card or plugin that opened a view', () => {
        expect(returnFocusKey('game-glance')).toBe('navigate:game-glance');
        expect(returnFocusKey('in-game:achievements-page')).toBe('in-game:achievements');
        expect(returnFocusKey('gg:home')).toBe('gg:card:home');
        expect(returnFocusKey('gg:game-page')).toBe('gg:card:game-page');
        expect(returnFocusKey('gg:home:row')).toBe('gg:home:games');
        expect(returnFocusKey('gg:game-page:info:2')).toBe('gg:game-page:slot:2');
        expect(returnFocusKey('gg:game-page:info:featured')).toBe('gg:game-page:slot:featured');
        expect(returnFocusKey('gg:general:versions')).toBe('gg:general:versions');
    });
    it('leaves other views alone', () => {
        expect(returnFocusKey('configure-menu')).toBeNull();
        expect(returnFocusKey('notifications')).toBeNull();
        expect(returnFocusKey(undefined)).toBeNull();
    });
});

describe('parseInfoView', () => {
    it('reads the slot of a game info picker view', () => {
        expect(['0', '1', '2', 'featured'].map(s => parseInfoView(`gg:game-page:info:${s}`))).toEqual([0, 1, 2, 'featured']);
    });
    it('rejects anything else', () => {
        for (const id of ['gg:game-page:info:', 'gg:game-page:info:3', 'gg:game-page:info:x', 'gg:game-page:info', 'gg:game-page:info:0:none', 'gg:home:row']) expect(parseInfoView(id)).toBeNull();
        expect(returnFocusKey('gg:game-page:info:x')).toBeNull();
    });
});

describe('back inside Game Glance\'s settings (Navigate)', () => {
    it('pops the view and focuses the card it came from, then the Game Glance tile', () => {
        let state = openOn('navigate');
        state = reduceMenu(state, { type: 'push', viewId: 'game-glance' });
        state = reduceMenu(state, { type: 'push', viewId: 'gg:screensaver' });
        state = reduceMenu(state, { type: 'focus', section: 'navigate', key: 'gg:screensaver:enabled' });
        state = reduceMenu(state, { type: 'back' });
        expect(state.stack).toEqual(['game-glance']);
        expect(state.focus.navigate).toBe('gg:card:screensaver');
        state = reduceMenu(state, { type: 'back' });
        expect(state.stack).toEqual([]);
        expect(state.focus.navigate).toBe('navigate:game-glance');
        expect(state.section).toBe('navigate');
        expect(state.phase).toBe('custom-open');
    });
    it('keeps the remembered focus when the popped view has no return key', () => {
        let state = openOn('plugins');
        state = reduceMenu(state, { type: 'push', viewId: 'other-view' });
        state = reduceMenu(state, { type: 'focus', section: 'plugins', key: 'plugins:Unifideck' });
        state = reduceMenu(state, { type: 'back' });
        expect(state.focus.plugins).toBe('plugins:Unifideck');
    });
});

describe('the Wi-Fi page view', () => {
    it('returns focus to Quick settings\' Wi-Fi row', async () => {
        const { WIFI_ROW, WIFI_VIEW } = await import('../../src/menu/views');
        expect(WIFI_VIEW).toBe('quick:wifi-page');
        expect(WIFI_ROW).toBe('quick:wifi');
        expect(returnFocusKey(WIFI_VIEW)).toBe(WIFI_ROW);
    });
});

describe('a Wi-Fi network\'s page', () => {
    it('names the view by the access point and returns focus to its row', async () => {
        const { wifiNetworkView, parseWifiNetworkView } = await import('../../src/menu/views');
        expect(wifiNetworkView('k/1')).toBe('quick:wifi-network:k/1');
        expect(parseWifiNetworkView('quick:wifi-network:k/1')).toBe('k/1');
        expect(parseWifiNetworkView('quick:wifi-page')).toBeNull();
        expect(returnFocusKey(wifiNetworkView('k/1'))).toBe('wifi:k/1');
    });
});

it('names a game\'s Achievements page by its app id, and reads it back', async () => {
    const { achievementsView, parseAchievementsView } = await import('../../src/menu/views');
    expect(achievementsView(292030)).toBe('achievements:292030');
    expect(parseAchievementsView('achievements:292030')).toBe(292030);
    for (const bad of ['achievements:', 'achievements:0', 'achievements:-3', 'achievements:1.5', 'gg:home', undefined]) expect(parseAchievementsView(bad)).toBeNull();
});
