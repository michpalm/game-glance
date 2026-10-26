import type { Box, PageTargets } from './openTargets';
import type { HomeRects } from './openMotion';
const box = (e: Element): Box => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; };
const transform = (t: {x:number;y:number;sx:number;sy:number}) => `translate(${t.x}px, ${t.y}px) scale(${t.sx}, ${t.sy})`;

/** The normal page's actual card components, moving from Home's chips and ending in their native flex/grid layout. */
export function prepareNormalOpen(root: HTMLElement, home: HomeRects, page: PageTargets, canvasScale: number): (() => void) | null {
    const grid = root.querySelector<HTMLElement>('.gh-normal-cards'), win = root.ownerDocument.defaultView;
    const target = page.cards?.[0];
    if (!grid || !win || !page.d || !target) return null;
    const styles = new Map<HTMLElement, string | null>();
    const save = (el: HTMLElement) => { if (!styles.has(el)) styles.set(el,el.getAttribute('style')); };
    const undo = () => {
        root.removeAttribute('data-gh-normal');
        for (const [el,previous] of styles) { if(previous===null)el.removeAttribute('style');else el.setAttribute('style',previous); el.removeAttribute('data-normal-move');el.removeAttribute('data-normal-empty'); }
    };
    try {
        save(grid);const origin=root.getBoundingClientRect(),side=target.x-origin.left;
        Object.assign(grid.style,{display:'grid',visibility:'hidden',left:`${side}px`,top:`${target.y-origin.top}px`,width:`${origin.width-2*side}px`});
        grid.style.setProperty('--gho-x-d',String(page.d));
        for(const panel of grid.querySelectorAll<HTMLElement>('.gh-normal-card')){
            save(panel);const p=box(panel);
            // Only the glass stretches. Its native border still reserves the same layout space.
            const skin = win.getComputedStyle(panel);
            for (const [name, value] of [['bg', skin.backgroundColor], ['border', skin.borderTopWidth], ['ring', skin.borderTopColor], ['blur', skin.backdropFilter]]) {
                if (value) panel.style.setProperty(`--normal-${name}`, value);
            }
            if(!(p.w>0&&p.h>0)){undo();return null;}
            const sources=home.chips.filter(c=>panel.querySelector(`[data-stat="${c.key}"]`));
            const from=sources.length ? {x:Math.min(...sources.map(c=>c.shell.x)),y:Math.min(...sources.map(c=>c.shell.y)),w:0,h:0}:p;
            if(sources.length){from.w=Math.max(...sources.map(c=>c.shell.x+c.shell.w))-from.x;from.h=Math.max(...sources.map(c=>c.shell.y+c.shell.h))-from.y;}
            if(!(from.w>0&&from.h>0)){undo();return null;}
            panel.style.setProperty('--normal-from',transform({x:from.x-p.x,y:from.y-p.y,sx:from.w/p.w,sy:from.h/p.h}));
            if(!sources.length)panel.setAttribute('data-normal-empty','');
            for(const el of panel.querySelectorAll<HTMLElement>('.gh-normal-label,.gh-normal-value,.gh-normal-desc,.gh-normal-bar,.gh-normal-caption,.gh-normal-muted')){
                save(el);el.style.setProperty('--normal-from','none');el.setAttribute('data-normal-move','extra');
            }
            for(const chip of sources){
                const col=panel.querySelector(`[data-stat="${chip.key}"]`)!;
                for(const [selector,source,originalSelector] of [['.gh-normal-label',chip.label,'.gh-chip-label'],['.gh-normal-value',chip.value,'.gh-chip-value']] as const){
                    const el=col.querySelector<HTMLElement>(selector),original=root.querySelector<HTMLElement>(`.gh-chip[data-chip="${chip.key}"] ${originalSelector}`);
                    if(!el||!original)continue;
                    const ratio=parseFloat(win.getComputedStyle(original).fontSize)*canvasScale/parseFloat(win.getComputedStyle(el).fontSize);
                    const at = box(el);
                    el.style.setProperty('--normal-from',transform({x:source.x-at.x,y:source.y-at.y,sx:ratio,sy:ratio}));el.setAttribute('data-normal-move','source');
                }
            }
        }
        grid.style.removeProperty('display');grid.style.removeProperty('visibility');root.setAttribute('data-gh-normal','');return undo;
    }catch(error){undo();throw error;}
}
