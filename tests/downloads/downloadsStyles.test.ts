import { describe, expect, it } from 'vitest';
import { downloadsStyles } from '../../src/downloads/downloadsStyles';
import { tokenCss, unit } from '../../src/styles/tokens';

const rule = (selectorPart: string) => downloadsStyles.split('\n').find(line => line.includes(selectorPart) && line.includes('{')) ?? '';

describe('downloadsStyles', () => {
    it('keeps the menu\'s ring room in the scrolling list, as Storage', () => {
        const list = rule('.gg-dl-list{');
        expect(list).toContain('padding:6px');
        expect(list).toContain('margin:-6px');
        expect(list).toContain('scroll-padding-block:6px');
        expect(list).toContain('overflow-y:auto');
    });
    it('draws mock-up A2\'s sizes: a 520 column, 96 rows, 72 completed rows', () => {
        expect(rule('.gg-dl-side{')).toContain(`width:${unit(520)}`);
        expect(rule('button.gg-dl-row.DialogButton{')).toContain(`min-height:${unit(96)}`);
        expect(rule('button.gg-dl-done.DialogButton{min-height')).toContain(`min-height:${unit(72)}`);
    });
    it('the focused row and card wear the menu\'s ring and strong glass', () => {
        const focused = rule('button.gg-dl-row.DialogButton:is(.gpfocus');
        expect(focused).toContain('outline:2px solid #fff');
        expect(focused).toContain('background:var(--gg-glass-strong)');
    });
    it('writes lengths in units, except the ring room and hairlines', () => {
        const own = downloadsStyles.slice(tokenCss('.gg-dl').length);
        const stripped = own.replace(/calc\(var\(--gg-d,1px\) \* -?[\d.]+\)/g, '').replace(/\b[126]px\b/g, '').replace(/-6px/g, '');
        expect(stripped).not.toMatch(/\d+px/);
    });
});
