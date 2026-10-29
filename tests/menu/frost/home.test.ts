import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { createHomeFrost } from '../../../src/menu/frost/home';
import type { FrostFrame } from '../../../src/menu/frost/types';
function fixture(){
    const {document,window}=parseHTML('<html><body><section><div id="viewport"></div></section></body></html>');
    Object.assign(window,{innerWidth:1920,innerHeight:1080,getComputedStyle:()=>({transform:'none',filter:'none',opacity:'1',perspective:'none',isolation:'auto'})});
    const placeholder=document.getElementById('viewport')! as unknown as HTMLElement;
    return {document,placeholder,home:createHomeFrost(document as unknown as Document,placeholder)};
}
const frame:FrostFrame={generation:1,context:{viewportId:'v1',background:'steam',outputWidth:1920,outputHeight:1080,dpr:1,fit:'fit',colorMode:'sdr'},regions:{bar:{x:.3,y:.1,width:.6,height:.1,radiusX:.01,radiusY:.02},panel:{x:.3,y:.23,width:.6,height:.65,radiusX:.01,radiusY:.02},notifications:{x:.8,y:.04,width:.1,height:.05,radiusX:.01,radiusY:.02},status:{x:.75,y:.01,width:.2,height:.03,radiusX:.005,radiusY:.01},keyboard:{x:0,y:0,width:0,height:0,radiusX:0,radiusY:0}}};
describe('bounded Home frost',()=>{
    // The status bar has no surface here: on Home the page's own bar, on Home's frost, stays up under the menu.
    it('inserts exactly three non-interactive tint-free bounded surfaces behind the viewport, none for the status bar',()=>{
        const f=fixture();expect(f.home.apply(frame)).toBe(true);
        const surfaces=[...f.document.querySelectorAll<HTMLElement>('[data-gg-menu-frost]')];expect(surfaces.length).toBe(3);
        expect(surfaces[0].style.width).toBe('1152px');expect(surfaces[0].style.borderRadius).toBe('19.2px / 21.6px');
        for(const surface of surfaces){expect(surface.style.pointerEvents).toBe('none');expect(surface.style.background).toBe('transparent');}
        expect(f.placeholder.previousElementSibling).toBe(surfaces[2]);f.home.dispose();expect(f.document.querySelector('[data-gg-menu-frost]')).toBeNull();
    });
    // The Social chat's keyboard is a frost area of its own; closed, it is an all-zero area and draws nothing.
    it('draws a surface for the open keyboard and none for a closed one, keeping the others',()=>{
        const f=fixture(),open:FrostFrame={...frame,regions:{...frame.regions,keyboard:{x:.55,y:.55,width:.3,height:.25,radiusX:.01,radiusY:.02}}};
        const ids=()=>[...f.document.querySelectorAll<HTMLElement>('[data-gg-menu-frost]')].map(e=>e.dataset.ggMenuFrost);
        expect(f.home.apply(frame)).toBe(true);expect(ids()).toEqual(['bar','panel','notifications']);
        expect(f.home.apply(open)).toBe(true);expect(ids()).toEqual(['bar','panel','notifications','keyboard']);
        const keyboard=f.document.querySelector<HTMLElement>('[data-gg-menu-frost="keyboard"]')!;
        expect(keyboard.style.left).toBe('1056px');expect(keyboard.style.width).toBe('576px');
        expect(f.home.apply(frame)).toBe(true);expect(ids()).toEqual(['bar','panel','notifications']);
        f.home.clear();expect(ids()).toEqual([]);f.home.dispose();
    });
    it('removes surfaces when the viewport is replaced and refuses ambiguous backdrop roots',()=>{
        const f=fixture();f.home.apply(frame);f.placeholder.remove();expect(f.home.apply(frame)).toBe(false);
        expect(f.document.querySelector('[data-gg-menu-frost]')).toBeNull();f.home.dispose();
    });
});
