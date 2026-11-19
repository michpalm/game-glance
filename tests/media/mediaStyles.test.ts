import { describe, expect, it } from 'vitest';
import { mediaStyles } from '../../src/media/mediaStyles';

describe('mediaStyles', () => {
    it('scopes every rule under .gg-media', () => {
        for (const rule of mediaStyles.split('}').map(r => r.trim()).filter(Boolean)) {
            const sel = rule.split('{')[0].trim();
            if (sel.startsWith('@') || sel === '' || /^(from|to|\d+%)$/.test(sel)) continue;
            for (const part of sel.split(/,(?![^(]*\))/)) expect(part.trim().startsWith('.gg-media')).toBe(true);
        }
    });
    it('tiles are 330 × 186 units', () => {
        expect(mediaStyles).toMatch(/gg-media-tile\.DialogButton\{[^}]*width:calc\(var\(--gg-d,1px\) \* 330\)[^}]*height:calc\(var\(--gg-d,1px\) \* 186\)/);
    });
    it('a focused action reads light with dark text (PS5 check: dark on dark)', () => {
        for (const part of ['gg-media-action', 'gg-media-plain']) {
            const focused = new RegExp(`${part}\\.DialogButton:is\\(\\.gpfocus,:focus-visible,:focus\\)\\{[^}]*background:rgba\\(255,255,255,\\.92\\)[^}]*color:#10141a`);
            expect(mediaStyles).toMatch(focused);
        }
    });
});
