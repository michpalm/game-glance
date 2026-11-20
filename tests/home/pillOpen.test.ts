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
    it('never glazes the holder of a plain store pill: its glass is a face beside the family pill, so the family pill blurs the art', () => {
        const family = { type: 'span', props: { className: 'gg-family' } };
        const pill = SourcePill({ label: 'Steam', children: family }) as { props: { className: string; children: [{ props: { className: string } }, unknown] } };
        expect(pill.props.className).toBe('gg-pill gg-store-selectable');
        expect(pill.props.children[0].props.className).toBe('gg-store-face');
        expect(pill.props.children[1]).toBe(family);
        const open = SourcePill({ label: 'Steam', className: 'gh-x-pill', selectableClassName: 'gh-x-selectable', faceClassName: 'gh-x-store-face' }) as { props: { className: string; children: [{ props: { className: string } }] } };
        expect(open.props.className).toBe('gh-x-pill gh-x-selectable');
        expect(open.props.children[0].props.className).toBe('gh-x-store-face');
    });
    it("carries the player pill from Home's with the pills, placed by the page's cards (none here: the row), and restores it when cancelled", () => {
        const { document } = parseHTML('<div id="root"><span class="gh-source" data-players="above"><span class="gh-players"></span></span><span class="gh-x-pill"><span class="gh-x-players"></span></span></div>');
        const root = document.querySelector('#root') as unknown as HTMLElement;
        const rect = (x:number,y:number,width:number,height:number) => ({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height}) as DOMRect;
        root.getBoundingClientRect=()=>rect(0,0,828,466);
        const source=root.querySelector('.gh-source') as HTMLElement, players=root.querySelector('.gh-players') as HTMLElement;
        const pill=root.querySelector('.gh-x-pill') as HTMLElement, target=root.querySelector('.gh-x-players') as HTMLElement;
        source.getBoundingClientRect=()=>rect(718.7,225.8,74.3,20);
        players.getBoundingClientRect=()=>rect(690,195,100,20);
        pill.getBoundingClientRect=()=>rect(718.1,234,75,20);
        target.getBoundingClientRect=()=>rect(689,204,101,20);
        const undo=preparePillOpen(root,{d:.625,store:{x:718.7,y:234,w:74.3,h:20}} as never)!;
        expect(pill.dataset.players).toBe('row');
        const numbers=(s:string)=>s.match(/[-\d.]+(?=px)/g)!.map(Number);
        const parent=numbers(pill.style.getPropertyValue('--pill-from')), child=numbers(target.style.getPropertyValue('--pill-from'));
        expect(689+parent[0]+child[0]).toBeCloseTo(690,8);
        expect(204+parent[1]+child[1]).toBeCloseTo(195,8);
        undo();
        expect(pill.dataset.players).toBeUndefined();
        expect(target.getAttribute('style')).toBeNull();
    });
    it("places the player pill's copy against the page's right-hand card, not Home's placement", () => {
        const { document } = parseHTML('<div id="root"><span class="gh-source" data-players="row"><span class="gh-players"></span></span><span class="gh-x-pill"><span class="gh-x-players"></span></span></div>');
        const root = document.querySelector('#root') as unknown as HTMLElement;
        const rect = (x:number,y:number,width:number,height:number) => ({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height}) as DOMRect;
        root.getBoundingClientRect=()=>rect(0,0,1921,1082);
        const pill=root.querySelector('.gh-x-pill') as HTMLElement, target=root.querySelector('.gh-x-players') as HTMLElement;
        (root.querySelector('.gh-source') as HTMLElement).getBoundingClientRect=()=>rect(1740,570,140,38);
        (root.querySelector('.gh-players') as HTMLElement).getBoundingClientRect=()=>rect(1500,570,230,38);
        pill.getBoundingClientRect=()=>rect(1740,570,140,38);
        target.getBoundingClientRect=()=>rect(1100,570,230,38); // where the row puts it: left of the page's right card (1200)
        const undo=preparePillOpen(root,{d:1,store:{x:1740,y:570,w:140,h:38},shells:[{x:40,y:660,w:780,h:260},{x:1200,y:660,w:680,h:260}]} as never, 'spotlight')!;
        expect(pill.dataset.players).toBe('above');
        undo();
    });
    it('carries a lone player pill (store and family pills off: the holder has no width) instead of giving up', () => {
        const { document } = parseHTML('<div id="root"><span class="gh-source gh-source-bare"><span class="gh-players"></span></span><span class="gh-x-pill gh-x-pill-bare"><span class="gh-x-players"></span></span></div>');
        const root = document.querySelector('#root') as unknown as HTMLElement;
        const rect = (x:number,y:number,width:number,height:number) => ({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height}) as DOMRect;
        root.getBoundingClientRect=()=>rect(0,0,1921,1082);
        (root.querySelector('.gh-source') as HTMLElement).getBoundingClientRect=()=>rect(1880,570,0,38);
        (root.querySelector('.gh-players') as HTMLElement).getBoundingClientRect=()=>rect(1650,570,230,38);
        (root.querySelector('.gh-x-pill') as HTMLElement).getBoundingClientRect=()=>rect(1880,580,0,38);
        (root.querySelector('.gh-x-players') as HTMLElement).getBoundingClientRect=()=>rect(1650,580,230,38);
        const undo=preparePillOpen(root,{d:1,store:{x:1740,y:580,w:140,h:38},shells:[]} as never, 'spotlight');
        expect(undo).not.toBeNull();
        expect((root.querySelector('.gh-x-players') as HTMLElement).style.getPropertyValue('--pill-from')).toContain('translate(');
        undo!();
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
