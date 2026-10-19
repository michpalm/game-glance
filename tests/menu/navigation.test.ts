import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { defaultMenuState, reduceMenu, type MenuEvent } from '../../src/menu/model';
import { handleMenuButton, findMenuFocus } from '../../src/menu/navigation';
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
    it('unwinds Configure menu through the same model used by pointer selection',()=>{
        let state=reduceMenu(defaultMenuState(),{type:'enable',value:true});state=reduceMenu(state,{type:'open',entry:'home'});state=reduceMenu(state,{type:'select',section:'more'});state=reduceMenu(state,{type:'push',viewId:'configure-menu'});
        handleMenuButton({button:2},state,e=>state=reduceMenu(state,e),true);expect(state).toMatchObject({section:'more',stack:[],phase:'custom-open'});
    });
    it('restores the actual native control inside a keyed wrapper and skips disabled children',()=>{
        const {document}=parseHTML('<main><button data-gg-focus="fallback">Fallback</button><div data-gg-focus="toggle"><button role="switch">Wi-Fi</button></div><div data-gg-focus="disabled"><button disabled>No</button></div></main>');
        const root=document.querySelector('main')!;expect(findMenuFocus(root,'toggle')?.tagName).toBe('BUTTON');expect(findMenuFocus(root,'disabled')?.textContent).toBe('Fallback');
    });
    it('restores a valid stable focus key and skips unavailable or hidden controls',()=>{
        const {document}=parseHTML('<main><button data-gg-focus="first">First</button><button data-gg-focus="saved" disabled>Disabled</button><div hidden><button data-gg-focus="hidden">Hidden</button></div><button data-gg-focus="last">Last</button></main>');
        const root=document.querySelector('main')!;
        expect(findMenuFocus(root,'last')?.textContent).toBe('Last');expect(findMenuFocus(root,'saved')?.textContent).toBe('First');expect(findMenuFocus(root,'hidden')?.textContent).toBe('First');
    });
});
