import { describe, expect, it } from 'vitest';
import { cardBaseCss, normalCardsCss } from '../../src/styles/themeCss';

describe('shared normal card styles', () => {
    it('shares page layout, type, three-line description and rounded progress bars with the moving copy', () => {
        const unit = (n: number) => `${n}px`;
        const native = cardBaseCss('gg', unit) + normalCardsCss('gg', unit);
        const moving = cardBaseCss('gh-normal', unit) + normalCardsCss('gh-normal', unit);
        expect(moving).toBe(native.split('.gg-').join('.gh-normal-'));
        expect(moving).toContain('-webkit-line-clamp: 3');
        expect(moving).toContain('font-size: 11px');
        expect(moving).toContain('font-size: 30px');
        expect(moving).not.toContain('--gg-d');
        expect(moving).toContain('border-radius: 3px');
        expect(moving).toContain('grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr)');
        expect(moving).not.toContain('.gg-');
    });
    it('keeps the border style valid before the destination page supplies its base variables', () => {
        const css = normalCardsCss('gh-normal', (n) => `${n}px`);
        const card = /\.gh-normal-card \{([^}]+)\}/.exec(css)![1];
        // Without a solid style, an invalid inherited base border makes the computed width zero.
        // When the page mounts it becomes nonzero, changing the card's content-box geometry.
        expect(card).toContain('border-style: solid');
        expect(card).not.toContain('--gg-border');
        expect(card).toContain('border-width: 1px');
    });

});
