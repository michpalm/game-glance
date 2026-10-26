import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { preparePillOpen } from '../../src/home/pillOpen';
import { SourcePill } from '../../src/components/SourcePill';
import { sourcePillLook } from '../../src/styles/sourcePill';

describe('one shared pill pair during opening', () => {
    it('uses the native borderless wrapper around a selectable store so the family anchor does not shift', () => {
        const pill = SourcePill({ label: 'Steam', plus: true }) as { props: { className: string; children: { props: { className: string } }[] } };
        expect(pill.props.className).toContain('gg-store-selectable');
        expect(pill.props.children[0].props.className).toBe('gg-store-choice');
        expect(sourcePillLook(n => `${n}px`)).toContain('line-height: 1;');
    });
    it('measures store and family separately, moves without stretching, and restores cancelled state', () => {
        const { document } = parseHTML('<div id="root"><span class="gh-source"><span class="gh-family"></span></span><span class="gh-x-pill" style="color:red"><span class="gh-x-family"></span></span></div>');
        const root = document.querySelector('#root') as unknown as HTMLElement;
        const rect = (x:number,y:number,width:number,height:number) => ({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height}) as DOMRect;
        root.getBoundingClientRect=()=>rect(0,0,828,466);
        const source=root.querySelector('.gh-source') as HTMLElement, family=root.querySelector('.gh-family') as HTMLElement;
        const pill=root.querySelector('.gh-x-pill') as HTMLElement, targetFamily=root.querySelector('.gh-x-family') as HTMLElement;
        source.getBoundingClientRect=()=>rect(718.7,225.8,74.3,20);
        family.getBoundingClientRect=()=>rect(537.1,225.8,175.3,20);
        pill.getBoundingClientRect=()=>rect(718.1,234,75,20);
        targetFamily.getBoundingClientRect=()=>rect(535.9,234,175.9,20);
        const before=pill.getAttribute('style');
        const undo=preparePillOpen(root,{d:.625,store:{x:718.7,y:234,w:74.3,h:20}} as never);
        expect(root.hasAttribute('data-gh-pill')).toBe(true);
        const numbers=(s:string)=>s.match(/[-\d.]+(?=px)/g)!.map(Number);
        const parent=numbers(pill.style.getPropertyValue('--pill-from'));
        const child=numbers(targetFamily.style.getPropertyValue('--pill-from'));
        expect(718.1+parent[0]).toBeCloseTo(718.7,8);
        expect(234+parent[1]).toBeCloseTo(225.8,8);
        expect(535.9+parent[0]+child[0]).toBeCloseTo(537.1,8);
        expect(234+parent[1]+child[1]).toBeCloseTo(225.8,8);
        expect(pill.style.getPropertyValue('--pill-from')).not.toContain('scale');
        undo!();expect(root.hasAttribute('data-gh-pill')).toBe(false);
        expect(pill.getAttribute('style')).toBe(before);
        expect(targetFamily.getAttribute('style')).toBeNull();
    });
});
