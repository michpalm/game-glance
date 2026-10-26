import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { prepareCleanOpen, cleanChildFrom } from '../../src/home/cleanOpen';

describe('shared Clean card motion', () => {
    it('compensates for the moving glass so content starts on its chip at the correct size', () => {
        const panel = { x: 1000, y: 680, w: 440, h: 100 };
        const from = { x: 24, y: 350, w: 390, h: 72 };
        const text = { x: 1030, y: 720, w: 80, h: 30 };
        const chip = { x: 40, y: 372, w: 64, h: 24 };
        const t = cleanChildFrom(panel, from, text, chip, .9, .9);
        const sx = from.w / panel.w, sy = from.h / panel.h;
        expect(from.x + sx * (text.x - panel.x + t.x)).toBeCloseTo(chip.x, 8);
        expect(from.y + sy * (text.y - panel.y + t.y)).toBeCloseTo(chip.y, 8);
        expect(sx * t.sx).toBeCloseTo(.9, 8);
        expect(sy * t.sy).toBeCloseTo(.9, 8);
    });
});


describe('Clean opening lifecycle', () => {
    it('uses the measured native flex box and removes all motion state when cancelled', () => {
        const { document, window } = parseHTML('<div id="root"><div class="gh-chip" data-chip="played"><div class="gh-chip-label">Played</div><div class="gh-chip-value">1 h</div></div><div class="gh-clean-info" style="color:red"><div data-stat="played"><div class="gh-clean-label">Played</div><div class="gh-clean-value">1 h</div></div><div data-stat="hltb"><div class="gh-clean-label">HLTB main</div><div class="gh-clean-value">…</div></div></div></div>');
        const root = document.querySelector('#root') as unknown as HTMLElement;
        const panel = root.querySelector('.gh-clean-info') as HTMLElement;
        const rect = (x: number, y: number, width: number, height: number) => ({ x, y, left:x, top:y, right:x+width, bottom:y+height, width, height }) as DOMRect;
        root.getBoundingClientRect = () => rect(0,0,1500,844);
        panel.getBoundingClientRect = () => rect(1037,680,436,97);
        for (const el of panel.querySelectorAll<HTMLElement>('.gh-clean-label,.gh-clean-value')) el.getBoundingClientRect = () => rect(1065,700,85,30);
        Object.defineProperty(window, 'getComputedStyle', { value:(el: Element) => ({ fontSize: el.className.startsWith('gh-chip') ? '20px' : '22px' }) });
        const home = { chips:[{ key:'played', shell:{x:24,y:350,w:104,h:72}, label:{x:40,y:362,w:75,h:12}, value:{x:40,y:380,w:75,h:24}, bar:null }] } as never;
        const page = { d:1, cards:[{x:1037,y:680,w:436,h:97}], play:{y:701,h:54} } as never;
        const before = panel.getAttribute('style');
        const undo = prepareCleanOpen(root, home, page, 1);
        expect(root.hasAttribute('data-gh-clean')).toBe(true);
        expect(panel.querySelectorAll('[data-clean-move]')).toHaveLength(4);
        undo!();
        expect(root.hasAttribute('data-gh-clean')).toBe(false);
        expect(panel.querySelectorAll('[data-clean-move]')).toHaveLength(0);
        expect(panel.getAttribute('style')).toBe(before);
    });
    it('leaves the legacy path available when no shared panel exists', () => {
        const { document } = parseHTML('<div id="root"></div>');
        expect(prepareCleanOpen(document.querySelector('#root') as never, {} as never, {} as never,1)).toBeNull();
    });
});
