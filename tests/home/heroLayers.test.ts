import { describe, expect, it } from 'vitest';
import { HeroLayer, neighbourIds, nextHeroLayers } from '../../src/home/heroLayers';

const layer = (id: number, start: number, settled = false): HeroLayer<string> => ({ id, art: `a${id}`, start, settled });

describe('nextHeroLayers', () => {
    it('the first art is a single fading layer', () => {
        expect(nextHeroLayers([], { id: 1, art: 'a1' }, 0, 260)).toEqual([layer(1, 0)]);
    });
    it('after a finished fade, the old art stays under the new one', () => {
        expect(nextHeroLayers([layer(1, 0)], { id: 2, art: 'a2' }, 300, 260)).toEqual([layer(1, 0), layer(2, 300)]);
    });
    it('a switch during a fade settles the fading layer and drops what is under it: never more than two layers', () => {
        const got = nextHeroLayers([layer(1, 0), layer(2, 100)], { id: 3, art: 'a3' }, 200, 260);
        expect(got).toEqual([layer(2, 100, true), layer(3, 200)]);
    });
    it('a fast run of switches keeps two layers', () => {
        let layers: Array<HeroLayer<string>> = [];
        for (let i = 1; i <= 8; i++) layers = nextHeroLayers(layers, { id: i, art: `a${i}` }, i * 40, 260);
        expect(layers.map((l) => l.id)).toEqual([7, 8]);
        expect(layers[0].settled).toBe(true);
    });
});

describe('neighbourIds', () => {
    const ids = [10, 20, 30, 40, 50];
    it('nearest first, both ways, radius 2', () => {
        expect(neighbourIds(ids, 2, 2)).toEqual([40, 20, 50, 10]);
    });
    it('wraps through the Library card as L1/R1 do, skipping it', () => {
        // From game 1: R1 -> 20, L1 -> Library (skipped); two steps: 30, and L1 twice -> 50.
        expect(neighbourIds(ids, 0, 2)).toEqual([20, 30, 50]);
        // On the Library card: the last and the first games.
        expect(neighbourIds(ids, 5, 2)).toEqual([10, 50, 20, 40]);
    });
    it('small rows: no duplicates and never the selection itself', () => {
        expect(neighbourIds([7], 0, 2)).toEqual([]);
        expect(neighbourIds([7, 8], 0, 2)).toEqual([8]);
    });
    it('nothing for no games or broken input', () => {
        expect(neighbourIds([], 0, 2)).toEqual([]);
        expect(neighbourIds(ids, NaN, 2)).toEqual([]);
        expect(neighbourIds(ids, 0, 0)).toEqual([]);
    });
});
