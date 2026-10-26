import type { PageTargets } from './openTargets';

/** One page-layout pill pair, translated from Home without duplicated fading glass. */
export function preparePillOpen(root: HTMLElement, page: PageTargets): (() => void) | null {
    const source = root.querySelector<HTMLElement>('.gh-source');
    const pill = root.querySelector<HTMLElement>('.gh-x-pill');
    if (!source || !pill || !page.d) return null;
    const family = pill.querySelector<HTMLElement>('.gh-x-family');
    const sourceFamily = root.querySelector<HTMLElement>('.gh-family');
    const saved = [pill, ...(family ? [family] : [])].map(el => [el, el.getAttribute('style')] as const);
    const undo = () => {
        root.removeAttribute('data-gh-pill');
        for (const [el, style] of saved) { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }
    };
    try {
        const home = source.getBoundingClientRect(), origin = root.getBoundingClientRect();
        pill.style.setProperty('--gho-x-d', String(page.d));
        for (const [name, value] of Object.entries({ display: 'inline-flex', visibility: 'hidden', left: 'auto', right: `${origin.right-page.store.x-page.store.w}px`, top: `${page.store.y-origin.top}px` })) pill.style.setProperty(name, value, 'important');
        pill.style.transform = 'none';
        const target = pill.getBoundingClientRect();
        if (!(target.width > 0 && target.height > 0)) { undo(); return null; }
        const dx = home.x-target.x, dy = home.y-target.y;
        pill.style.setProperty('--pill-from', `translate(${dx}px, ${dy}px)`);
        if (family && sourceFamily) {
            const from = sourceFamily.getBoundingClientRect(), to = family.getBoundingClientRect();
            family.style.setProperty('--pill-from', `translate(${from.x-to.x-dx}px, ${from.y-to.y-dy}px)`);
        }
        for (const property of ['display', 'visibility', 'transform']) pill.style.removeProperty(property);
        root.setAttribute('data-gh-pill', '');
        return undo;
    } catch (error) { undo(); throw error; }
}
