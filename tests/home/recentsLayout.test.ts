import { describe, expect, it } from 'vitest';
import {
    CARD_SCALE_DOCKED,
    CARD_SCALE_HANDHELD,
    cardScale,
    cardScaleFor,
    recentsGlowTop,
    ghostCount,
    ghostOpacity,
    heroIndex,
    isLibraryFocus,
    MAX_GHOSTS,
    rowShowsWideCards,
    RECENTS_BOTTOM,
    recentsGeometry,
    recentsLayout,
    rowStyleOf,
    steamRowLayout,
    WIDE_ASPECT,
} from '../../src/home/recentsLayout';

// Handheld (x1.6): capsule 93x140 -> 149x224, wide = round(224 x 460/215) = 479, gap 12 -> 19, step 168,
// growth 330, ghost gap 19 (x1.6).
const HAND = recentsGeometry(CARD_SCALE_HANDHELD);
const STEP = 168;
const GROW = 330;
// Docked (x1.6): capsule 149x224, wide = round(224 x 460/215) = 479, gap 19, step 168, growth 330, ghost gap 29, top 464.
const DOCK = recentsGeometry(CARD_SCALE_DOCKED);

describe('recentsGeometry', () => {
    it('card scale is 1.6 handheld and 1.6 docked', () => {
        expect(CARD_SCALE_HANDHELD).toBe(1.6);
        expect(CARD_SCALE_DOCKED).toBe(1.6);
        expect(cardScale(false)).toBe(1.6);
        expect(cardScale(true)).toBe(1.6);
    });

    it('the handheld scale is a named constant, not larger than the docked one; both sit at the ceiling the unraised layout allows (28 logical px under the actions)', () => {
        expect(CARD_SCALE_HANDHELD).toBeLessThanOrEqual(CARD_SCALE_DOCKED);
        expect(CARD_SCALE_HANDHELD).toBeGreaterThan(1);
    });

    it('the handheld row top clears the tallest action row by 28+ and its glow stays below the actions', () => {
        expect(HAND.top - 433.4).toBeGreaterThanOrEqual(28);
        expect(recentsGlowTop(HAND)).toBeGreaterThan(433.4);
    });

    it('the wide card has the landscape art aspect (460x215, measured on the device for every recent)', () => {
        expect(WIDE_ASPECT).toBe(460 / 215);
        expect(HAND.wideW).toBe(Math.round(HAND.capsuleH * WIDE_ASPECT));
        expect(DOCK.wideW).toBe(Math.round(DOCK.capsuleH * WIDE_ASPECT));
        expect(Math.abs(HAND.wideW / HAND.capsuleH - 460 / 215)).toBeLessThan(0.01);
    });

    it('handheld x1.6: capsule 149x224, wide 479, gap 19, step 168, growth 330, ghost gap 29, top 464', () => {
        expect(HAND).toMatchObject({ scale: 1.6, capsuleW: 149, capsuleH: 224, wideW: 479, gap: 19, step: STEP, grow: GROW, ghostGap: 29, top: 464, bottom: 688 });
        expect(HAND.fine(8)).toBe(12.8);
        expect(HAND.fine(10.5)).toBe(16.8);
    });

    it('docked x1.6: capsule 149x224, wide 479, gap 19, step 168, growth 330, ghost gap 29, top 464', () => {
        expect(DOCK).toMatchObject({ scale: 1.6, capsuleW: 149, capsuleH: 224, wideW: 479, gap: 19, step: 168, grow: 330, ghostGap: 29, top: 464, bottom: 688 });
        expect(DOCK.fine(8)).toBe(12.8);
        expect(DOCK.fine(16)).toBe(25.6);
    });

    it('both scales keep the bottom at 688 (12 above the tabs at 700) and clear the actions (end near 433)', () => {
        expect(RECENTS_BOTTOM).toBe(688);
        for (const g of [HAND, DOCK]) {
            expect(g.top + g.capsuleH).toBe(688);
            expect(g.top).toBeGreaterThan(433);
            expect(g.bottom).toBeLessThan(700);
        }
    });

    it('cardScaleFor: no scale until Home has measured its box (so the row never mounts at the wrong size), then by screen', () => {
        expect(cardScaleFor(null)).toBeNull();
        expect(cardScaleFor({ width: 1500, height: 844 })).toBe(1.6); // 1080p TV, docked (measured on the Ally)
        expect(cardScaleFor({ width: 828, height: 466 })).toBe(1.6); // handheld layout
    });

    it('an unusable scale falls back to the handheld scale', () => {
        for (const s of [NaN, 0, -1, Infinity]) expect(recentsGeometry(s)).toMatchObject({ scale: 1.6, capsuleW: 149, wideW: 479 });
    });
});

describe('recentsLayout (handheld x1.6)', () => {
    it('recentsLayout expands only the focused capsule to 479 (224 x 460/215)', () => {
        const { items } = recentsLayout(6, 2, HAND);
        expect(items).toHaveLength(7);
        expect(items.map((i) => i.width)).toEqual([149, 149, 479, 149, 149, 149, 149]);
    });

    it('recentsLayout offsets items after the focused one by 330 (479 - 149)', () => {
        const { items } = recentsLayout(6, 2, HAND);
        expect(items.map((i) => i.left)).toEqual([0, 168, 336, 504 + 330, 672 + 330, 840 + 330, 1008 + 330]);
        // Gap between the wide capsule and the next one stays 19.
        expect(items[3].left - (items[2].left + items[2].width)).toBe(19);
        expect(recentsLayout(6, 0, HAND).items[1].left).toBe(168 + 330);
    });

    it('recentsLayout scrolls by focused x 168', () => {
        expect(recentsLayout(6, 0, HAND).scrollX).toBe(0);
        expect(recentsLayout(6, 3, HAND).scrollX).toBe(-504);
        expect(recentsLayout(6, 6, HAND).scrollX).toBe(-1008);
    });

    it('recentsLayout dims items before the focus and none after', () => {
        const { items } = recentsLayout(6, 3, HAND);
        expect(items.map((i) => i.dim)).toEqual([true, true, true, false, false, false, false]);
        expect(recentsLayout(6, 0, HAND).items.some((i) => i.dim)).toBe(false);
    });

    it('recentsLayout treats index = count as the Library card and keeps the hero on the last game', () => {
        const layout = recentsLayout(6, 6, HAND);
        // Library card keeps capsule size; nothing is expanded; every game is dimmed, the card is not.
        expect(layout.items.map((i) => i.width)).toEqual([149, 149, 149, 149, 149, 149, 149]);
        expect(layout.items.map((i) => i.left)).toEqual([0, 168, 336, 504, 672, 840, 1008]);
        expect(layout.items.slice(0, 6).every((i) => i.dim)).toBe(true);
        expect(layout.items[6].dim).toBe(false);
        // Ghosts after the card plus the extra 23 px gap.
        expect(layout.ghostStart).toBe(7 * 168 + 29);
        expect(isLibraryFocus(6, 6)).toBe(true);
        expect(isLibraryFocus(6, 5)).toBe(false);
        expect(heroIndex(6, 6)).toBe(5);
        expect(heroIndex(6, 2)).toBe(2);
        // Not on the card: ghosts move right with the expanded capsule.
        expect(recentsLayout(6, 0, HAND).ghostStart).toBe(7 * 168 + 330 + 29);
    });

    it('recentsLayout repeats up to 8 games as ghosts, one step apart, fading toward the right', () => {
        const rest = recentsLayout(10, 0, HAND);
        expect(rest.ghosts).toHaveLength(8);
        expect(rest.ghosts.map((g) => g.left)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((j) => rest.ghostStart + j * 168));
        expect(rest.ghosts.map((g) => g.opacity)).toEqual([0.4, 0.354, 0.309, 0.263, 0.217, 0.171, 0.126, 0.08]);
        // Brighter while the Library card is focused, still ending at .08.
        const onCard = recentsLayout(10, 10, HAND);
        expect(onCard.ghosts.map((g) => g.opacity)).toEqual([0.55, 0.483, 0.416, 0.349, 0.281, 0.214, 0.147, 0.08]);
        // Each ghost strictly fainter than the one before.
        for (let j = 1; j < 8; j++) expect(rest.ghosts[j].opacity).toBeLessThan(rest.ghosts[j - 1].opacity);
        expect(MAX_GHOSTS).toBe(8);
        expect(ghostOpacity(0, false)).toBe(0.4);
        expect(ghostOpacity(7, true)).toBe(0.08);
        expect(ghostOpacity(99, false)).toBe(0.08);
        expect(ghostOpacity(NaN, false)).toBe(0.4);
    });

    it('recentsLayout with count 0 or 1 does not break and shows fewer ghosts', () => {
        const none = recentsLayout(0, 0, HAND);
        expect(none.items).toEqual([{ left: 0, width: 149, dim: false }]);
        expect(none.ghosts).toEqual([]);
        expect(Number.isFinite(none.scrollX) && Number.isFinite(none.ghostStart)).toBe(true);
        expect(ghostCount(0)).toBe(0);
        expect(heroIndex(0, 0)).toBeNull();
        expect(isLibraryFocus(0, 0)).toBe(false);

        const one = recentsLayout(1, 0, HAND);
        expect(one.items).toEqual([{ left: 0, width: 479, dim: false }, { left: 168 + 330, width: 149, dim: false }]);
        expect(one.ghosts).toEqual([{ left: 2 * 168 + 330 + 29, opacity: 0.4 }]);
        expect(ghostCount(1)).toBe(1);
        expect(ghostCount(2)).toBe(2);
        expect(recentsLayout(2, 2, HAND).ghosts.map((g) => g.opacity)).toEqual([0.55, 0.483]);
        expect(ghostCount(8)).toBe(8);
        expect(ghostCount(9)).toBe(8);
        const oneOnCard = recentsLayout(1, 1, HAND);
        expect(oneOnCard.items).toEqual([{ left: 0, width: 149, dim: true }, { left: 168, width: 149, dim: false }]);
        expect(heroIndex(1, 1)).toBe(0);

        // Out-of-range focus is clamped, never NaN.
        expect(recentsLayout(3, 99, HAND).scrollX).toBe(-504);
        expect(recentsLayout(3, -4, HAND).scrollX).toBe(0);
        expect(recentsLayout(3, NaN, HAND).items[0].width).toBe(479);
    });
});

describe('recentsLayout (docked x1.6)', () => {
    it('expands the focus to 479, shifts later items by 330 and scrolls by 168', () => {
        const { items, scrollX } = recentsLayout(6, 2, DOCK);
        expect(items.map((i) => i.width)).toEqual([149, 149, 479, 149, 149, 149, 149]);
        expect(items.map((i) => i.left)).toEqual([0, 168, 336, 504 + 330, 672 + 330, 840 + 330, 1008 + 330]);
        expect(items[3].left - (items[2].left + items[2].width)).toBe(19);
        expect(scrollX).toBe(-336);
    });

    it('ghosts start after the Library card plus 29, and follow the expanded card', () => {
        expect(recentsLayout(6, 6, DOCK).ghostStart).toBe(7 * 168 + 29);
        const rest = recentsLayout(10, 0, DOCK);
        expect(rest.ghostStart).toBe(11 * 168 + 330 + 29);
        expect(rest.ghosts.map((g) => g.left)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((j) => rest.ghostStart + j * 168));
    });
});

describe('recentsLayout without the wide card (a fast L1/R1 run)', () => {
    const g = recentsGeometry(1);
    it('every card stays narrow and none is pushed aside; the row still scrolls to the selection', () => {
        const l = recentsLayout(5, 2, g, false);
        expect(l.items.map((i) => i.width)).toEqual(Array(6).fill(g.capsuleW));
        expect(l.items.map((i) => i.left)).toEqual([0, 1, 2, 3, 4, 5].map((i) => i * g.step));
        expect(l.scrollX).toBe(recentsLayout(5, 2, g).scrollX);
        expect(l.ghostStart).toBe(6 * g.step + g.ghostGap);
        expect(l.ghosts.map((x) => x.opacity)).toEqual(recentsLayout(5, 2, g).ghosts.map((x) => x.opacity));
    });
    it('expanded by default, as before', () => {
        expect(recentsLayout(5, 2, g).items[2].width).toBe(g.wideW);
    });
});

describe('steamRowLayout', () => {
    const W = HAND.wideW;
    const C = HAND.capsuleW;
    const VIEW = 1300;
    const centreOf = (l: ReturnType<typeof steamRowLayout>, i: number) => l.items[i].left + l.items[i].width / 2 + l.scrollX;

    it('the first game is the wide card wherever the selection is; the others, the selected one too, are capsules', () => {
        for (const f of [0, 1, 4, 9, 10]) {
            const l = steamRowLayout(10, f, HAND, VIEW);
            expect(l.items[0].width).toBe(W);
            expect(l.items.slice(1).every((it) => it.width === C)).toBe(true);
            expect(l.items[1].left).toBe(STEP + GROW);
            expect(l.items[3].left).toBe(3 * STEP + GROW);
        }
    });

    it('the row stays still, nothing faded, while the selection is left of the middle', () => {
        for (const f of [0, 1]) {
            const l = steamRowLayout(10, f, HAND, VIEW);
            expect(l.scrollX).toBe(0);
            expect(l.items.some((it) => it.dim)).toBe(false);
        }
    });

    it('past the middle the row scrolls to keep the selection centred, the games before it faded', () => {
        for (const f of [2, 5, 9]) {
            const l = steamRowLayout(10, f, HAND, VIEW);
            expect(Math.abs(centreOf(l, f) - VIEW / 2)).toBeLessThanOrEqual(0.5);
            expect(l.items.map((it) => it.dim)).toEqual(l.items.map((_, i) => i < f));
        }
        expect(steamRowLayout(10, 3, HAND, VIEW).scrollX - steamRowLayout(10, 4, HAND, VIEW).scrollX).toBe(STEP);
    });

    it('the Library card is centred the same way; the loop preview follows it', () => {
        const l = steamRowLayout(10, 10, HAND, VIEW);
        expect(Math.abs(centreOf(l, 10) - VIEW / 2)).toBeLessThanOrEqual(0.5);
        expect(l.ghostStart).toBe(11 * STEP + GROW + HAND.ghostGap);
        expect(l.ghosts).toHaveLength(MAX_GHOSTS);
    });

    it('a wider screen scrolls later', () => {
        expect(steamRowLayout(10, 2, HAND, VIEW).scrollX).toBeLessThan(0);
        expect(steamRowLayout(10, 2, HAND, 2400).scrollX).toBe(0);
    });

    it('no games: only the Library card; one game: wide, then the Library card', () => {
        const none = steamRowLayout(0, 0, HAND, VIEW);
        expect(none.items).toEqual([{ left: 0, width: C, dim: false }]);
        const one = steamRowLayout(1, 0, HAND, VIEW);
        expect(one.items.map((it) => it.width)).toEqual([W, C]);
        expect(one.items[1].left).toBe(STEP + GROW);
    });

    it('a bad viewport centres on the left edge rather than breaking', () => {
        expect(steamRowLayout(10, 0, HAND, Number.NaN).scrollX).toBe(-Math.round(W / 2));
    });
});

describe('rowStyleOf', () => {
    it('Steam\'s by default and for anything unknown', () => {
        expect(rowStyleOf('spotlight')).toBe('spotlight');
        expect(rowStyleOf('steam')).toBe('steam');
        expect(rowStyleOf(undefined)).toBe('steam');
        expect(rowStyleOf('fancy')).toBe('steam');
    });
});

describe('Minimal row', () => {
    it('keeps every card small and scrolls only once selection passes the viewport midpoint', async () => {
        const { minimalRowLayout, rowStyleOf } = await import('../../src/home/recentsLayout');
        expect(rowStyleOf('minimal')).toBe('minimal');
        const g = recentsGeometry(1);
        const first = minimalRowLayout(4, 0, g, 400);
        expect(first.items.map((i) => [i.left, i.width])).toEqual([[0, 93], [105, 93], [210, 93], [315, 93], [420, 93]]);
        expect(first.scrollX).toBe(0);
        const third = minimalRowLayout(4, 2, g, 400);
        expect(third.scrollX).toBe(-57);
        expect(third.ghostStart).toBe(543);
        expect(third.items.map((i) => i.width)).toEqual([93, 93, 93, 93, 93]);
        expect(minimalRowLayout(4, 4, g, 400).scrollX).toBe(-267);
    });
    it('handles empty, short and invalid lists without leaving a wide-card gap', async () => {
        const { minimalRowLayout } = await import('../../src/home/recentsLayout');
        const g = recentsGeometry(1);
        expect(minimalRowLayout(0, 99, g, 400).items).toEqual([{ left: 0, width: 93, dim: false }]);
        expect(minimalRowLayout(1, 99, g, 400).items.map((i) => i.left)).toEqual([0, 105]);
        const bad = minimalRowLayout(NaN, NaN, g, NaN);
        expect(bad.items).toHaveLength(1);
        expect(Number.isFinite(bad.scrollX)).toBe(true);
    });
});

describe('rowShowsWideCards (whether Home warms the wide card art)', () => {
    it('is false for Minimal, whose cards all stay small', () => {
        expect(rowShowsWideCards('minimal')).toBe(false);
    });
    it('is true for Steam and Spotlight', () => {
        expect(rowShowsWideCards('steam')).toBe(true);
        expect(rowShowsWideCards('spotlight')).toBe(true);
    });
});
