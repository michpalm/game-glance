import type { Box, PageTargets } from './openTargets';
import type { HomeRects } from './openMotion';

/** Child transform inside the moving panel: cancels its stretch so text starts at Home's own size. */
export function cleanChildFrom(panel: Box, from: Box, child: Box, source: Box, scaleX: number, scaleY: number) {
    const sx = from.w / panel.w, sy = from.h / panel.h;
    return { x: (source.x - from.x) / sx - (child.x - panel.x), y: (source.y - from.y) / sy - (child.y - panel.y), sx: scaleX / sx, sy: scaleY / sy };
}
const transform = (t: { x: number; y: number; sx: number; sy: number }) => `translate(${t.x}px, ${t.y}px) scale(${t.sx}, ${t.sy})`;
const box = (e: Element): Box => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };

/** Lay out the same flex card as the page, then move that card and its children from Home's chips. */
export function prepareCleanOpen(root: HTMLElement, home: HomeRects, page: PageTargets, canvasScale: number): (() => void) | null {
    const panel = root.querySelector<HTMLElement>('.gh-clean-info');
    const win = root.ownerDocument.defaultView;
    if (!panel || !win || !page.d) return null;
    const origin = root.getBoundingClientRect();
    const side = page.cards?.[0];
    if (!side) return null;
    const previous = panel.getAttribute('style');
    const moved: HTMLElement[] = [];
    const undo = () => {
        root.removeAttribute('data-gh-clean');
        if (previous === null) panel.removeAttribute('style'); else panel.setAttribute('style', previous);
        for (const el of moved) { el.style.removeProperty('--clean-from'); el.removeAttribute('data-clean-move'); }
    };
    try {
        Object.assign(panel.style, {
            display: 'flex', visibility: 'hidden', right: `${origin.right - side.x - side.w}px`,
            top: `${page.play.y + page.play.h / 2 - origin.top}px`,
        });
        panel.style.setProperty('--gho-x-d', String(page.d));
        const p = box(panel);
        if (!(p.w > 0 && p.h > 0)) { undo(); return null; }
        const sources = home.chips.filter((c) => panel.querySelector(`[data-stat="${c.key}"]`));
        if (!sources.length) { undo(); return null; }
        const left = Math.min(...sources.map((c) => c.shell.x)), top = Math.min(...sources.map((c) => c.shell.y));
        const from = { x: left, y: top, w: Math.max(...sources.map((c) => c.shell.x + c.shell.w)) - left, h: Math.max(...sources.map((c) => c.shell.y + c.shell.h)) - top };
        // Columns not yet represented by a chip (new games, pending HLTB) also fade in; never inherit the panel transform.
        for (const el of panel.querySelectorAll<HTMLElement>('.gh-clean-label,.gh-clean-value,.gh-clean-bar')) {
            el.style.setProperty('--clean-from', 'none'); el.setAttribute('data-clean-move', ''); moved.push(el);
        }
        for (const chip of sources) {
            const col = panel.querySelector(`[data-stat="${chip.key}"]`)!;
            for (const [selector, source, font] of [ ['.gh-clean-label', chip.label, true], ['.gh-clean-value', chip.value, true], ['.gh-clean-bar', chip.bar, false] ] as const) {
                const el = col.querySelector<HTMLElement>(selector);
                const original = root.querySelector<HTMLElement>(`.gh-chip[data-chip="${chip.key}"] ${selector === '.gh-clean-label' ? '.gh-chip-label' : selector === '.gh-clean-value' ? '.gh-chip-value' : '.gh-chip-bar'}`);
                if (!el || !source || !original) continue;
                const target = box(el);
                const ratio = font ? parseFloat(win.getComputedStyle(original).fontSize) * canvasScale / parseFloat(win.getComputedStyle(el).fontSize) : 0;
                const t = cleanChildFrom(p, from, target, source, font ? ratio : source.w / target.w, font ? ratio : source.h / target.h);
                el.style.setProperty('--clean-from', transform(t));
            }
        }
        panel.style.setProperty('--clean-from', transform({ x: from.x - p.x, y: from.y - p.y, sx: from.w / p.w, sy: from.h / p.h }));
        panel.style.removeProperty('display'); panel.style.removeProperty('visibility');
        root.setAttribute('data-gh-clean', '');
        return undo;
    } catch (error) { undo(); throw error; }
}
