import { describe, expect, it } from 'vitest';
import { barSelection, defaultMenuState, reduceMenu, selectedBarSection, visibleSections, type GameContext, type MenuEvent, type MenuState } from '../../src/menu/model';

const game: GameContext = { appId: 1057090, gameId: '1057090', name: 'Ori', kind: 'local', actionIds: ['resume','achievements'] };
const events = (...actions: MenuEvent[]) => actions.reduce(reduceMenu, reduceMenu(defaultMenuState(), {type:'enable',value:true}));

describe('floating menu transitions', () => {
    it('reserves the game slot without spending a pin', () => {
        const before = defaultMenuState();
        expect(visibleSections(before)).toEqual(['navigate','quick-settings','performance','social','more']);
        expect(visibleSections(reduceMenu(before,{type:'game',value:game}))).toEqual(['in-game','navigate','quick-settings','performance','social','more']);
        expect(before.game).toBeNull();
    });
    it('does not open when disabled or failed', () => {
        expect(reduceMenu(defaultMenuState(),{type:'open',entry:'home'}).phase).toBe('disabled');
        const failed = events({type:'failure'});
        expect(reduceMenu(failed,{type:'open',entry:'home'}).phase).toBe('failed');
    });
    it('opens the game from Home, closes on the same entry, and changes sections from the other entry', () => {
        const opened = events({type:'game',value:game},{type:'open',entry:'home'});
        expect(opened).toMatchObject({phase:'custom-open',section:'in-game',entry:'home'});
        expect(reduceMenu(opened,{type:'open',entry:'home'}).phase).toBe('closed');
        expect(reduceMenu(opened,{type:'open',entry:'quick-access'})).toMatchObject({phase:'custom-open',section:'quick-settings',entry:'quick-access'});
    });
    it('opens a hidden Quick settings entry through More and unwinds nested views', () => {
        let state = events({type:'pins',value:['navigate']},{type:'open',entry:'quick-access'},{type:'push',viewId:'devices'});
        expect(selectedBarSection(state)).toBe('more');
        state=reduceMenu(state,{type:'back'});
        expect(state).toMatchObject({stack:[],section:'quick-settings',phase:'custom-open'});
        state=reduceMenu(state,{type:'back'});
        expect(state.section).toBe('more');
        expect(reduceMenu(state,{type:'back'}).phase).toBe('closed');
    });
    it('traverses visible sections only and preserves focus by section', () => {
        let state=events({type:'pins',value:['navigate','performance']},{type:'game',value:game},{type:'open',entry:'home'},{type:'focus',section:'in-game',key:'resume'});
        state=reduceMenu(state,{type:'step',direction:-1});
        expect(state.section).toBe('more');
        state=reduceMenu(state,{type:'step',direction:-1});
        expect(state.section).toBe('performance');
        expect(state.focus['in-game']).toBe('resume');
        expect(reduceMenu(state,{type:'select',section:'social'}).section).toBe('social');
    });
    it('does not save global tab/notification focus as a panel restoration target', () => {
        const before=events({type:'open',entry:'quick-access'},{type:'focus',section:'quick-settings',key:'quick:brightness'});
        for(const key of ['section:in-game','section:quick-settings','notifications']) {
            expect(reduceMenu(before,{type:'focus',section:'quick-settings',key})).toBe(before);
        }
        expect(before.focus['quick-settings']).toBe('quick:brightness');
    });
    it.each([null,{...game,appId:42,gameId:'42',name:'Other'}])('drops old game details and focus on game replacement %j', next => {
        const before=events({type:'game',value:game},{type:'open',entry:'home'},{type:'push',viewId:'achievements'},{type:'focus',section:'in-game',key:'achievement:8'});
        const after=reduceMenu(before,{type:'game',value:next});
        expect(after.stack).toEqual([]);
        expect(after.focus['in-game']).toBeUndefined();
        expect(after.section).toBe(next?'in-game':'navigate');
        expect(before.stack).toEqual(['achievements']);
    });
    it('rejects interactive pin overflow or empty selection without changing history', () => {
        const before=events({type:'open',entry:'home'});
        expect(reduceMenu(before,{type:'pins',value:[]})).toBe(before);
        expect(reduceMenu(before,{type:'pins',value:['navigate','quick-settings','performance','social','plugins']})).toBe(before);
    });
    it('does not navigate a suspended tree and clears local history on disable', () => {
        const state=events({type:'open',entry:'home'},{type:'push',viewId:'power'},{type:'handoff'});
        expect(state.phase).toBe('native-handoff');
        expect(reduceMenu(state,{type:'step',direction:1})).toBe(state);
        expect(reduceMenu(state,{type:'enable',value:false})).toMatchObject({phase:'disabled',stack:[]});
    });
    it('cannot select a missing running game section', () => {
        const state:MenuState=events({type:'open',entry:'home'});
        expect(reduceMenu(state,{type:'select',section:'in-game'})).toBe(state);
    });
});

it('selects no tab while Notifications is open', () => {
    const state = { ...defaultMenuState(), phase: 'custom-open' as const, stack: ['notifications'] };
    expect(barSelection(state)).toBeNull();
    expect(barSelection(defaultMenuState())).toBe(selectedBarSection(defaultMenuState()));
});
