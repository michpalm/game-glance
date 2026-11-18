import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CardMotion, nextShot } from '../../src/home/CardMotion';

const html = (props: Parameters<typeof CardMotion>[0]) => renderToStaticMarkup(createElement(CardMotion, props));

describe('CardMotion: what a focused calendar card plays over its art (as Steam\'s calendar)', () => {
    it('the microtrailer: looping, muted, no controls, inline', () => {
        const out = html({ clip: 'https://v/c.webm', shots: ['https://s/1.jpg'], off: false });
        expect(out).toMatch(/<video class="gh-card-clip"[^>]*>/);
        expect(out).toContain('src="https://v/c.webm"');
        for (const attr of ['autoPlay', 'loop', 'playsInline']) expect(out.toLowerCase()).toContain(attr.toLowerCase());
        expect(out).not.toContain('gh-card-shot');
    });
    it('microtrailers off in Steam: the screenshots instead, the first one shown', () => {
        const out = html({ clip: 'https://v/c.webm', shots: ['https://s/1.jpg', 'https://s/2.jpg'], off: true });
        expect(out).not.toContain('<video');
        expect(out).toContain('class="gh-card-shot gh-card-shot-on" src="https://s/1.jpg"');
        expect(out).toContain('class="gh-card-shot" src="https://s/2.jpg"');
    });
    it('no clip with microtrailers on: nothing, the art stays (as Steam)', () => {
        expect(html({ clip: null, shots: ['https://s/1.jpg'], off: false })).toBe('');
    });
    it('nothing to show: nothing', () => expect(html({ clip: null, shots: [], off: true })).toBe(''));
    it('the cycle wraps', () => {
        expect(nextShot(0, 3)).toBe(1);
        expect(nextShot(2, 3)).toBe(0);
        expect(nextShot(0, 0)).toBe(0);
    });
});
