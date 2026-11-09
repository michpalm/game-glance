import { describe, expect, it } from 'vitest';
import { categoryView, GAME_GLANCE_VIEW, HOME_ROW_VIEW, pluginFocusKey, returnFocusKey, VERSIONS_VIEW } from '../../src/menu/views';
import { defaultMenuState, reduceMenu, type MenuState } from '../../src/menu/model';

function openOnPlugins(): MenuState {
    let state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
    state = reduceMenu(state, { type: 'open', entry: 'home' });
    return reduceMenu(state, { type: 'select', section: 'plugins' });
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
        expect(returnFocusKey('game-glance')).toBe('plugins:Game Glance');
        expect(returnFocusKey('gg:home')).toBe('gg:card:home');
        expect(returnFocusKey('gg:game-page')).toBe('gg:card:game-page');
        expect(returnFocusKey('gg:home:row')).toBe('gg:home:games');
        expect(returnFocusKey('gg:general:versions')).toBe('gg:general:versions');
    });
    it('leaves other views alone', () => {
        expect(returnFocusKey('configure-menu')).toBeNull();
        expect(returnFocusKey('notifications')).toBeNull();
        expect(returnFocusKey(undefined)).toBeNull();
    });
});

describe('back inside the Plugins section', () => {
    it('pops the view and focuses the card it came from', () => {
        let state = openOnPlugins();
        state = reduceMenu(state, { type: 'push', viewId: 'game-glance' });
        state = reduceMenu(state, { type: 'push', viewId: 'gg:screensaver' });
        state = reduceMenu(state, { type: 'focus', section: 'plugins', key: 'gg:screensaver:enabled' });
        state = reduceMenu(state, { type: 'back' });
        expect(state.stack).toEqual(['game-glance']);
        expect(state.focus.plugins).toBe('gg:card:screensaver');
        state = reduceMenu(state, { type: 'back' });
        expect(state.stack).toEqual([]);
        expect(state.focus.plugins).toBe('plugins:Game Glance');
        expect(state.phase).toBe('custom-open');
    });
    it('keeps the remembered focus when the popped view has no return key', () => {
        let state = openOnPlugins();
        state = reduceMenu(state, { type: 'push', viewId: 'other-view' });
        state = reduceMenu(state, { type: 'focus', section: 'plugins', key: 'plugins:Unifideck' });
        state = reduceMenu(state, { type: 'back' });
        expect(state.focus.plugins).toBe('plugins:Unifideck');
    });
});
