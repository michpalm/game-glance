import { describe, expect, it } from 'vitest';
import { libraryStyles } from '../../src/library/libraryStyles';

describe('libraryStyles', () => {
    it('scopes every rule under .gg-library', () => {
        for (const rule of libraryStyles.split('}').map(r => r.trim()).filter(Boolean)) {
            const sel = rule.split('{')[0].trim();
            if (sel.startsWith('@') || sel === '' || /^(from|to|\d+%)$/.test(sel)) continue; // keyframe stops
            for (const part of sel.split(/,(?![^(]*\))/)) expect(part.trim().startsWith('.gg-library')).toBe(true);
        }
    });
    it('draws the mock-up\'s hero and covers', () => {
        expect(libraryStyles).toMatch(/\.gg-library-hero-img\{[^}]*object-position:center 25%/);
        expect(libraryStyles).toMatch(/gg-library-cover\.DialogButton\{[^}]*width:calc\(var\(--gg-d,1px\) \* 120\)[^}]*height:calc\(var\(--gg-d,1px\) \* 180\)/);
    });
});
