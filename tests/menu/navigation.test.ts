import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { defaultMenuState, reduceMenu, type MenuEvent } from '../../src/menu/model';
import { handleMenuButton, findMenuFocus, menuInputActive, installOutsideMenuClick } from '../../src/menu/navigation';
describe('menu input boundary',()=>{
    it('moves shoulders over visible tabs and never replays held inputs after modal focus',()=>{
        let state=reduceMenu(defaultMenuState(),{type:'enable',value:true});state=reduceMenu(state,{type:'open',entry:'home'});
        const dispatch=(event:MenuEvent)=>{state=reduceMenu(state,event);};
        expect(handleMenuButton({button:6},state,dispatch,true)).toBe(true);expect(state.section).toBe('quick-settings');
        expect(handleMenuButton({button:6},state,dispatch,false)).toBe(false);
        handleMenuButton({button:6,is_repeat:true},state,dispatch,true);expect(state.section).toBe('quick-settings');
        handleMenuButton({button:6},state,dispatch,true);expect(state.section).toBe('performance');
        expect(handleMenuButton({button:27},state,dispatch,true)).toBe(false);
    });
    it('reads modal and keyboard state from the native owner rather than nonexistent globals', () => {
        const owner = { GetShowingGlobalModal: () => false, ModalManager: { active_modal: null as unknown }, VirtualKeyboardManager: { IsShowingVirtualKeyboard: { Value: false } } };
        expect(menuInputActive(owner)).toBe(true);
        owner.ModalManager.active_modal = {}; expect(menuInputActive(owner)).toBe(false);
        owner.ModalManager.active_modal = null; owner.VirtualKeyboardManager.IsShowingVirtualKeyboard.Value = true;
        expect(menuInputActive(owner)).toBe(false);
        owner.VirtualKeyboardManager.IsShowingVirtualKeyboard.Value = false;
        owner.GetShowingGlobalModal = () => true; expect(menuInputActive(owner)).toBe(false);
        expect(menuInputActive(undefined)).toBe(false);
    });
    it('unwinds Configure menu through the same model used by pointer selection',()=>{
        let state=reduceMenu(defaultMenuState(),{type:'enable',value:true});state=reduceMenu(state,{type:'open',entry:'home'});state=reduceMenu(state,{type:'select',section:'more'});state=reduceMenu(state,{type:'push',viewId:'configure-menu'});
        handleMenuButton({button:2},state,e=>state=reduceMenu(state,e),true);expect(state).toMatchObject({section:'more',stack:[],phase:'custom-open'});
    });
    it('restores the actual native control inside a keyed wrapper and skips disabled children',()=>{
        const {document}=parseHTML('<main><button data-gg-focus="fallback">Fallback</button><div data-gg-focus="toggle"><button role="switch">Wi-Fi</button></div><div data-gg-focus="disabled"><button disabled>No</button></div></main>');
        const root=document.querySelector('main')!;expect(findMenuFocus(root,'toggle')?.tagName).toBe('BUTTON');expect(findMenuFocus(root,'disabled')?.textContent).toBe('Fallback');
    });
    it('keeps shoulder focus on the selected tab and repairs a stale global-tab key', () => {
        const {document}=parseHTML('<main><div class="gg-menu-bar"><button class="gg-menu-tab" data-gg-focus="section:in-game" aria-pressed="false">In game</button><button class="gg-menu-tab" data-gg-focus="section:quick-settings" aria-pressed="true">Quick settings</button></div><div class="gg-menu-panel"><button data-gg-focus="quick:brightness">Brightness</button></div></main>');
        const root=document.querySelector('main')!;
        expect(findMenuFocus(root,'section:in-game')?.textContent).toBe('Quick settings');
        expect(findMenuFocus(root,'quick:brightness',true)?.textContent).toBe('Quick settings');
        expect(findMenuFocus(root,'quick:brightness')?.textContent).toBe('Brightness');
    });
    it('restores a valid stable focus key and skips unavailable or hidden controls',()=>{
        const {document}=parseHTML('<main><button data-gg-focus="first">First</button><button data-gg-focus="saved" disabled>Disabled</button><div hidden><button data-gg-focus="hidden">Hidden</button></div><button data-gg-focus="last">Last</button></main>');
        const root=document.querySelector('main')!;
        expect(findMenuFocus(root,'last')?.textContent).toBe('Last');expect(findMenuFocus(root,'saved')?.textContent).toBe('First');expect(findMenuFocus(root,'hidden')?.textContent).toBe('First');
    });
});


describe('outside menu dismissal', () => {
    function setup() {
        const { document, window } = parseHTML('<html><body><div id="host"><div id="menu"><button id="inside">Control</button></div><div id="outside"></div></div></body></html>');
        const close = vi.fn(), active = vi.fn(() => true);
        const stop = installOutsideMenuClick(document.querySelector('#menu')! as unknown as HTMLElement, close, active);
        const click = (id: string) => { const event = new window.Event('click', { bubbles: true, cancelable: true }); document.querySelector(id)!.dispatchEvent(event); return event; };
        return { close, active, stop, click };
    }
    it('consumes an outside activation, leaves menu controls alone, and removes the listener on release', () => {
        const { close, stop, click } = setup();
        expect(click('#inside').defaultPrevented).toBe(false); expect(close).not.toHaveBeenCalled();
        expect(click('#outside').defaultPrevented).toBe(true); expect(close).toHaveBeenCalledTimes(1);
        stop(); stop(); click('#outside'); expect(close).toHaveBeenCalledTimes(1);
    });
    it('respects native modal/keyboard ownership', () => {
        const { close, active, stop, click } = setup();
        active.mockReturnValue(false);
        expect(click('#outside').defaultPrevented).toBe(false); expect(close).not.toHaveBeenCalled(); stop();
    });
});
