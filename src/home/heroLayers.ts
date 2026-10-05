/** The hero's stacked layers and which games to pre-load. Pure. */

export interface HeroLayer<A> {
    id: number;
    art: A;
    /** When its fade-in started (ms, any clock). */
    start: number;
    /** Shown at once, without the fade: its fade was interrupted by a newer switch. */
    settled: boolean;
}

/**
 * The layers after a new art arrives at `now`: never more than two (the art under the fade and the new one). If the
 * top layer is still fading in (a quick run of L1/R1), it is settled, i.e. shown fully at once, and everything
 * under it is dropped, so fades never stack up. Otherwise the top layer simply stays under the new one.
 */
export function nextHeroLayers<A>(layers: Array<HeroLayer<A>>, incoming: { id: number; art: A }, now: number, fadeMs: number): Array<HeroLayer<A>> {
    const added: HeroLayer<A> = { id: incoming.id, art: incoming.art, start: now, settled: false };
    const top = layers[layers.length - 1];
    if (!top) return [added];
    const fading = !top.settled && now - top.start < fadeMs;
    return [fading ? { ...top, settled: true } : top, added];
}

/**
 * The games around `index` (the selection, 0..ids.length with ids.length the Library card) worth pre-loading: up to
 * `radius` steps each way through the same wrap L1/R1 use, nearest first, without the Library card, the selection
 * itself or duplicates.
 */
export function neighbourIds(ids: number[], index: number, radius: number): number[] {
    const n = ids.length;
    if (n === 0 || !Number.isFinite(index) || !Number.isFinite(radius)) return [];
    const at = Math.min(n, Math.max(0, Math.floor(index)));
    const out: number[] = [];
    for (let d = 1; d <= Math.max(0, Math.floor(radius)); d++) {
        for (const step of [d, -d]) {
            const i = (((at + step) % (n + 1)) + n + 1) % (n + 1);
            if (i === n || i === at) continue;
            const id = ids[i];
            if (!out.includes(id) && (at >= n || id !== ids[at])) out.push(id);
        }
    }
    return out;
}
