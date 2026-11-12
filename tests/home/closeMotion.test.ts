import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { applyClosing, CLOSING_ATTR, closingVars } from '../../src/home/closeMotion';
import { openMotion, type HomeRects } from '../../src/home/openMotion';
import type { Box, PageTargets } from '../../src/home/openTargets';
import { DEFAULT_SLOTS } from '../../src/logic/infoSlots';

const raw = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/openLayout/home-1500x844.json'), 'utf8')) as { canvasScale: number; rects: Record<string, Box> };
const r = raw.rects;
const s = raw.canvasScale;
const home = (): HomeRects => ({
    canvas: { x: 0, y: 0, w: 1440 * s, h: 810 * s },
    titleSlot: r.titleSlot, eyebrow: r.eyebrow, play: r.pill,
    circles: [r.circle0, r.circle1, r.circle2, r.circle3], infoCircle: 2, store: r.store,
    chips: [{ key: 'played', shell: r['chip:chip0'], label: r['chip:chip0:label'], value: r['chip:chip0:value'], bar: null }],
});
const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const page = (): PageTargets => ({
    titleBottomLeft: { x: 25, y: 426 }, eyebrowBottomLeft: { x: 25, y: 455.6 }, play: box(25, 493.1, 354.2, 62.5),
    circles: [box(393.7, 493.1, 62.5, 62.5), box(470.8, 493.1, 62.5, 62.5), box(547.9, 493.1, 62.5, 62.5)],
    store: box(1372.1, 507.7, 102.9, 33.3), shells: [box(25, 593.1, 749.7, 185.4)],
    stats: { played: { label: box(50.8, 614.7, 77.5, 17.2), value: box(50.8, 636.1, 77.5, 37.5) } },
} as PageTargets);
const names = (list: { name: string }[]) => list.map((v) => v.name);

describe('closingVars', () => {
    it("keeps only the shared parts' moves from openMotion", () => {
        const kept = names(closingVars(openMotion(home(), page(), 'spotlight', s, true)));
        for (const name of ['--gho-title', '--gho-eyebrow', '--gho-store', '--gho-play-bg', '--gho-play-fg', '--gho-play-icon', '--gho-play-label', '--gho-play-arrow', '--gho-play-inset-x', '--gho-play-home-w', '--gho-circle-0', '--gho-circle-icon-0']) expect(kept).toContain(name);
        for (const name of ['--gho-pring-x', '--gho-shell-0-x', '--gho-play-settle-from', '--gho-play-page-w', '--gho-x-d', '--gho-chip-0-value', '--gho-cring-0-x', '--gho-circle-extra-x']) expect(kept).not.toContain(name);
    });
});

describe('applyClosing', () => {
    const doc = () => parseHTML('<html><body><div class="gh-root"></div></body></html>').document;

    it('sets nothing when Home cannot be measured', () => {
        const root = doc().querySelector('.gh-root') as unknown as HTMLElement;
        expect(applyClosing(root, 'spotlight', DEFAULT_SLOTS)).toBeNull();
        expect(root.hasAttribute(CLOSING_ATTR)).toBe(false);
        expect(root.getAttribute('style')).toBeNull();
    });

    it("puts Home at the page's places, and its undo takes it all back", () => {
        const root = doc().querySelector('.gh-root') as unknown as HTMLElement;
        const undo = applyClosing(root, 'spotlight', DEFAULT_SLOTS, () => ({ home: home(), page: page(), scale: s, focused: true }));
        expect(undo).not.toBeNull();
        expect(root.getAttribute(CLOSING_ATTR)).toBe('from');
        const expected = Object.fromEntries(openMotion(home(), page(), 'spotlight', s, true).map((v) => [v.name, v.value]));
        expect(root.style.getPropertyValue('--gho-title')).toBe(expected['--gho-title']);
        expect(root.style.getPropertyValue('--gho-play-bg')).toBe(expected['--gho-play-bg']);
        undo!();
        // 'done', not removed: Home's way-back fade (homeCss gh-return-in) must not replay over the parts that glided.
        expect(root.getAttribute(CLOSING_ATTR)).toBe('done');
        expect(root.style.getPropertyValue('--gho-title')).toBe('');
    });

    it('ending cuts every glide transition (styled) before marking it done, so an early end is at rest at once', () => {
        const root = doc().querySelector('.gh-root') as unknown as HTMLElement;
        const undo = applyClosing(root, 'spotlight', DEFAULT_SLOTS, () => ({ home: home(), page: page(), scale: s, focused: true }))!;
        root.setAttribute(CLOSING_ATTR, 'to');
        const seen: string[] = [];
        root.getBoundingClientRect = () => { seen.push(`styled at ${root.getAttribute(CLOSING_ATTR)}`); return {} as DOMRect; };
        const set = root.setAttribute.bind(root);
        root.setAttribute = (name: string, value: string) => { if (name === CLOSING_ATTR) seen.push(value); set(name, value); };
        undo();
        expect(seen).toEqual(['cut', 'styled at cut', 'done']);
    });

    it("mouse mode: Play's page size is the unfocused one", () => {
        const root = doc().querySelector('.gh-root') as unknown as HTMLElement;
        applyClosing(root, 'spotlight', DEFAULT_SLOTS, () => ({ home: home(), page: page(), scale: s, focused: false }));
        const unfocused = Object.fromEntries(openMotion(home(), page(), 'spotlight', s, false).map((v) => [v.name, v.value]));
        expect(root.style.getPropertyValue('--gho-play-bg')).toBe(unfocused['--gho-play-bg']);
    });

    it('a measure that throws sets nothing', () => {
        const root = doc().querySelector('.gh-root') as unknown as HTMLElement;
        expect(applyClosing(root, 'spotlight', DEFAULT_SLOTS, () => { throw new Error('gone'); })).toBeNull();
        expect(root.hasAttribute(CLOSING_ATTR)).toBe(false);
    });
});
