import { describe, expect, it } from 'vitest';
import { settingsStyles } from '../../src/settings/settingsStyles';

describe('settingsStyles', () => {
    it('scopes every rule under .gg-settings', () => {
        for (const rule of settingsStyles.split('}').map(r => r.trim()).filter(Boolean)) {
            const sel = rule.split('{')[0].trim();
            if (sel.startsWith('@') || sel === '' || /^(from|to|\d+%)$/.test(sel)) continue;
            for (const part of sel.split(/,(?![^(]*\))/)) expect(part.trim().startsWith('.gg-settings')).toBe(true);
        }
    });
    it('a focused entry and More are light with dark text', () => {
        for (const part of ['gg-settings-entry', 'gg-settings-more']) {
            expect(settingsStyles).toMatch(new RegExp(`${part}\\.DialogButton:is\\(\\.gpfocus,:focus-visible,:focus\\)\\{[^}]*background:rgba\\(255,255,255,\\.92\\)[^}]*color:#10141a`));
        }
    });
});
