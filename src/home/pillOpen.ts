import type { PageTargets } from './openTargets';
import { limitFromShells, playersPlacement } from '../styles/playersFit';

/** One page-layout pill pair, translated from Home without duplicated fading glass. */
export function preparePillOpen(root: HTMLElement, page: PageTargets, look: 'spotlight' | 'clean' = 'spotlight'): (() => void) | null {
    const source = root.querySelector<HTMLElement>('.gh-source');
    const pill = root.querySelector<HTMLElement>('.gh-x-pill');
    if (!source || !pill || !page.d) return null;
    const family = pill.querySelector<HTMLElement>('.gh-x-family');
    const sourceFamily = root.querySelector<HTMLElement>('.gh-family');
    // The player pill moves with them, in Home's placement (styles/playersFit: in the row, or above).
    const players = pill.querySelector<HTMLElement>('.gh-x-players');
    const sourcePlayers = root.querySelector<HTMLElement>('.gh-players');
    const saved = [pill, ...(family ? [family] : []), ...(players ? [players] : [])].map(el => [el, el.getAttribute('style')] as const);
    const undo = () => {
        root.removeAttribute('data-gh-pill');
        delete pill.dataset.players;
        for (const [el, style] of saved) { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }
    };
    try {
        const home = source.getBoundingClientRect(), origin = root.getBoundingClientRect();
        pill.style.setProperty('--gho-x-d', String(page.d));
        for (const [name, value] of Object.entries({ display: 'inline-flex', visibility: 'hidden', left: 'auto', right: `${origin.right-page.store.x-page.store.w}px`, top: `${page.store.y-origin.top}px` })) pill.style.setProperty(name, value, 'important');
        pill.style.transform = 'none';
        if (players) {
            // Placed by the same rule as the page's pill, against the page's own right-hand card (Home's are hidden).
            pill.style.setProperty('--gg-family-w', `${family ? family.offsetWidth : 0}px`);
            const limit = limitFromShells(look, page.shells ?? [], page.d ?? 1);
            pill.dataset.players = playersPlacement({ pillLeft: players.getBoundingClientRect().left, limit });
        }
        const target = pill.getBoundingClientRect();
        // A bare pill (the store pill off) has no width of its own: its family pill (or player pill) is what moves.
        if (!(target.height > 0 && (target.width > 0 || family || players))) { undo(); return null; }
        const dx = home.x-target.x, dy = home.y-target.y;
        pill.style.setProperty('--pill-from', `translate(${dx}px, ${dy}px)`);
        if (family && sourceFamily) {
            const from = sourceFamily.getBoundingClientRect(), to = family.getBoundingClientRect();
            family.style.setProperty('--pill-from', `translate(${from.x-to.x-dx}px, ${from.y-to.y-dy}px)`);
        }
        if (players && sourcePlayers) {
            const from = sourcePlayers.getBoundingClientRect(), to = players.getBoundingClientRect();
            players.style.setProperty('--pill-from', `translate(${from.x-to.x-dx}px, ${from.y-to.y-dy}px)`);
        }
        for (const property of ['display', 'visibility', 'transform']) pill.style.removeProperty(property);
        root.setAttribute('data-gh-pill', '');
        return undo;
    } catch (error) { undo(); throw error; }
}
