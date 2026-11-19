import { describe, expect, it } from 'vitest';
import { pageKitStyles, pkButton } from '../../src/pageKit/pageKitStyles';

describe('pageKitStyles', () => {
    it('scopes every rule under .gg-pk', () => {
        for (const rule of pageKitStyles.split('}').map(r => r.trim()).filter(Boolean)) {
            const sel = rule.split('{')[0].trim();
            if (sel.startsWith('@') || sel === '') continue;
            for (const part of sel.split(/,(?![^(]*\))/)) expect(part.trim().startsWith('.gg-pk')).toBe(true);
        }
    });
    it('gives kit buttons Steam-beating weight', () => {
        expect(pkButton('tab')).toBe('.gg-pk button.gg-pk-tab.DialogButton');
        expect(pageKitStyles).toContain(pkButton('tab'));
    });
    it('uses the page units', () => expect(pageKitStyles).toContain('--gg-d:calc(100vw / 1920)'));
});
