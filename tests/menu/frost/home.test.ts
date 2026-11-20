import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { createHomeFrost } from '../../../src/menu/frost/home';
import { homeCanvas } from '../../../src/home/scale';
import type { FrostFrame } from '../../../src/menu/frost/types';
import { menuDimColor } from '../../../src/styles/tokens';
const AREAS='[data-gg-menu-frost]:not([data-gg-menu-frost="dim"])';
function fixture(innerWidth=1920,innerHeight=1080){
    const {document,window}=parseHTML('<html><body><section><div id="viewport"></div></section></body></html>');
    Object.assign(window,{innerWidth,innerHeight,getComputedStyle:()=>({transform:'none',filter:'none',opacity:'1',perspective:'none',isolation:'auto'})});
    const placeholder=document.getElementById('viewport')! as unknown as HTMLElement;
    return {document,placeholder,home:createHomeFrost(document as unknown as Document,placeholder)};
}
const frame:FrostFrame={generation:1,context:{viewportId:'v1',background:'steam',outputWidth:1920,outputHeight:1080,dpr:1,fit:'fit',colorMode:'sdr'},regions:{bar:{x:.3,y:.1,width:.6,height:.1,radiusX:.01,radiusY:.02},panel:{x:.3,y:.23,width:.6,height:.65,radiusX:.01,radiusY:.02},notifications:{x:.8,y:.04,width:.1,height:.05,radiusX:.01,radiusY:.02},status:{x:.75,y:.01,width:.2,height:.03,radiusX:.005,radiusY:.01},keyboard:{x:0,y:0,width:0,height:0,radiusX:0,radiusY:0},'keyboard-left':{x:0,y:0,width:0,height:0,radiusX:0,radiusY:0},'keyboard-right':{x:0,y:0,width:0,height:0,radiusX:0,radiusY:0}}};
describe('bounded Home frost',()=>{
    // The status bar has no surface here: on Home the page's own bar, on Home's frost, stays up under the menu.
    it('inserts exactly three non-interactive tint-free bounded surfaces behind the viewport, none for the status bar',()=>{
        const f=fixture();expect(f.home.apply(frame)).toBe(true);
        const surfaces=[...f.document.querySelectorAll<HTMLElement>(AREAS)];expect(surfaces.length).toBe(3);
        expect(surfaces[0].style.width).toBe('1152px');expect(surfaces[0].style.borderRadius).toBe('19.2px / 21.6px');
        for(const surface of surfaces){expect(surface.style.pointerEvents).toBe('none');expect(surface.style.background).toBe('transparent');}
        expect(f.placeholder.previousElementSibling).toBe(surfaces[2]);f.home.dispose();expect(f.document.querySelector('[data-gg-menu-frost]')).toBeNull();
    });
    // The Social chat's keyboard is a frost area of its own; closed, it is an all-zero area and draws nothing.
    it('draws a surface for the open keyboard and none for a closed one, keeping the others',()=>{
        const f=fixture(),open:FrostFrame={...frame,regions:{...frame.regions,keyboard:{x:.55,y:.55,width:.3,height:.25,radiusX:.01,radiusY:.02}}};
        const ids=()=>[...f.document.querySelectorAll<HTMLElement>(AREAS)].map(e=>e.dataset.ggMenuFrost);
        expect(f.home.apply(frame)).toBe(true);expect(ids()).toEqual(['bar','panel','notifications']);
        expect(f.home.apply(open)).toBe(true);expect(ids()).toEqual(['bar','panel','notifications','keyboard']);
        const keyboard=f.document.querySelector<HTMLElement>('[data-gg-menu-frost="keyboard"]')!;
        expect(keyboard.style.left).toBe('1056px');expect(keyboard.style.width).toBe('576px');
        expect(f.home.apply(frame)).toBe(true);expect(ids()).toEqual(['bar','panel','notifications']);
        f.home.clear();expect(ids()).toEqual([]);f.home.dispose();
    });
    // The chips' and pills' glass is blur(16px) on Home's canvas: the menu's frost follows its scale, so it is as
    // strong as theirs on a TV too (a fixed 8 CSS px was half as strong docked, at Steam's smaller display scale).
    it.each([[1500,844],[828,466],[1920,1080]])('blurs as strongly as Home\'s glass at %ix%i',(w,h)=>{
        const f=fixture(w,h);expect(f.home.apply(frame)).toBe(true);
        const blur=`blur(${16*homeCanvas(w,h).scale}px)`;
        for(const surface of f.document.querySelectorAll<HTMLElement>(AREAS))expect(surface.style.backdropFilter).toBe(blur);
        f.home.dispose();
    });
    it('removes surfaces when the viewport is replaced and refuses ambiguous backdrop roots',()=>{
        const f=fixture();f.home.apply(frame);f.placeholder.remove();expect(f.home.apply(frame)).toBe(false);
        expect(f.document.querySelector('[data-gg-menu-frost]')).toBeNull();f.home.dispose();
    });
    // The menu's dim (spec 2026-11-12-menu-dim): the context menus' 38% + 6 px blur over the whole window, placed before
    // the area surfaces so each of them frosts a dimmed screen. It sits in the menu's own layer, under Steam's footer
    // and the page's status bar (probed on the Deck, 2026-11-12), so those stay sharp without anything else.
    it.each([[1500,844],[828,466],[1920,1080]])('dims the whole window under the area surfaces at %ix%i',(w,h)=>{
        const f=fixture(w,h);expect(f.home.apply(frame)).toBe(true);
        const all=[...f.document.querySelectorAll<HTMLElement>('[data-gg-menu-frost]')];
        const dim=f.document.querySelector<HTMLElement>('[data-gg-menu-frost="dim"]')!;
        expect(all[0]).toBe(dim);expect(all.length).toBe(4);
        expect(f.placeholder.previousElementSibling).toBe(all[3]);
        expect(dim.style.position).toBe('fixed');expect(dim.style.left).toBe('0px');expect(dim.style.top).toBe('0px');
        expect(dim.style.width).toBe(`${w}px`);expect(dim.style.height).toBe(`${h}px`);
        expect(dim.style.pointerEvents).toBe('none');expect(dim.getAttribute('aria-hidden')).toBe('true');
        expect(dim.style.background).toBe(menuDimColor());
        expect(dim.style.backdropFilter).toBe(`blur(${6*homeCanvas(w,h).scale}px)`);
        f.home.dispose();
    });
    it('keeps the same dim surface first while the keyboard opens and closes',()=>{
        const f=fixture(),open:FrostFrame={...frame,regions:{...frame.regions,keyboard:{x:.55,y:.55,width:.3,height:.25,radiusX:.01,radiusY:.02}}};
        const first=()=>f.document.querySelector<HTMLElement>('[data-gg-menu-frost]');
        f.home.apply(frame);const dim=first();expect(dim?.dataset.ggMenuFrost).toBe('dim');
        f.home.apply(open);expect(first()).toBe(dim);f.home.apply(frame);expect(first()).toBe(dim);
        expect(f.document.querySelectorAll('[data-gg-menu-frost="dim"]').length).toBe(1);f.home.dispose();
    });
    it('removes the dim with clear and dispose, and adds none when it cannot frost',()=>{
        const dim=(d:Document)=>d.querySelector('[data-gg-menu-frost="dim"]');
        const a=fixture();a.home.apply(frame);a.home.clear();expect(dim(a.document as unknown as Document)).toBeNull();
        a.home.apply(frame);a.home.dispose();expect(dim(a.document as unknown as Document)).toBeNull();
        const b=fixture();expect(b.home.apply({...frame,context:{...frame.context,background:'game'}})).toBe(false);expect(dim(b.document as unknown as Document)).toBeNull();
        const c=fixture();c.home.apply(frame);c.placeholder.remove();expect(c.home.apply(frame)).toBe(false);expect(dim(c.document as unknown as Document)).toBeNull();
        b.home.dispose();c.home.dispose();
    });
});
