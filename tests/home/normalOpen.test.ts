import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { prepareNormalOpen } from '../../src/home/normalOpen';

describe('shared normal cards lifecycle', () => {
    it('measures both cards, handles a card without matching chips, and restores cancelled state', () => {
        const { document, window } = parseHTML('<div id="root"><div class="gh-chip" data-chip="played"><div class="gh-chip-label">Played</div><div class="gh-chip-value">1 h</div></div><div class="gh-normal-cards" style="color:red"><div class="gh-normal-card"><div data-stat="played"><div class="gh-normal-label">Played</div><div class="gh-normal-value">1 h</div></div><p class="gh-normal-desc">Description</p></div><div class="gh-normal-card gh-normal-hltb"><div class="gh-normal-label">HowLongToBeat</div><div class="gh-normal-muted">No match</div></div></div></div>');
        const root=document.querySelector('#root') as unknown as HTMLElement;
        const grid=root.querySelector('.gh-normal-cards') as HTMLElement;
        const rect=(x:number,y:number,width:number,height:number)=>({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height}) as DOMRect;
        root.getBoundingClientRect=()=>rect(0,0,1500,644);
        const panels=[...grid.querySelectorAll<HTMLElement>('.gh-normal-card')];
        panels.forEach((e,i)=>e.getBoundingClientRect=()=>rect(i?1046:48,393,406,154));
        for(const e of grid.querySelectorAll<HTMLElement>('.gh-normal-label,.gh-normal-value'))e.getBoundingClientRect=()=>rect(70,414,85,30);
        Object.defineProperty(window,'getComputedStyle',{value:(e:Element)=>({fontSize:e.className.startsWith('gh-chip')?'20px':'26px'})});
        const home={chips:[{key:'played',shell:{x:48,y:250,w:104,h:72},label:{x:64,y:262,w:75,h:12},value:{x:64,y:280,w:75,h:24},bar:null}]} as never;
        const page={d:.86,cards:[{x:48,y:393,w:406,h:154}]} as never;
        const before=grid.getAttribute('style');const undo=prepareNormalOpen(root,home,page,.86);
        expect(root.hasAttribute('data-gh-normal')).toBe(true);
        expect(grid.querySelectorAll('[data-normal-move="source"]')).toHaveLength(2);
        expect(panels[1].hasAttribute('data-normal-empty')).toBe(true);
        expect(panels[0].style.getPropertyValue('--normal-from')).not.toContain('NaN');
        const value = panels[0].querySelector<HTMLElement>('.gh-normal-value')!;
        const parts = /translate\(([-.\d]+)px, ([-.\d]+)px\) scale\(([-.\d]+), ([-.\d]+)\)/.exec(value.style.getPropertyValue('--normal-from'))!.slice(1).map(Number);
        // Text moves in page coordinates, independently of the glass's nonuniform scaling.
        expect(parts[0] + 70).toBeCloseTo(64, 8);
        expect(parts[1] + 414).toBeCloseTo(280, 8);
        expect(parts[2]).toBeCloseTo(20 * .86 / 26, 8);
        expect(parts[3]).toBeCloseTo(parts[2], 8);

        undo!();expect(root.hasAttribute('data-gh-normal')).toBe(false);expect(grid.getAttribute('style')).toBe(before);
        expect(grid.querySelectorAll('[data-normal-move],[data-normal-empty]')).toHaveLength(0);
    });
    it('keeps the old path available without a measurable shared grid',()=>{
        const { document }=parseHTML('<div id="root"></div>');
        expect(prepareNormalOpen(document.querySelector('#root') as never,{} as never,{} as never,1)).toBeNull();
    });
});
