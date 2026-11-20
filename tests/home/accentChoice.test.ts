import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCENT } from '../../src/home/accent';
import { ACCENT_SWATCHES, accentColorOf, accentModeOf, effectiveAccent, onAccentFor } from '../../src/home/accentChoice';

describe('accent choice (settings accentMode, accentColor)', () => {
    it('reads custom, anything else as adaptive', () => {
        expect(accentModeOf('custom')).toBe('custom');
        for (const v of ['adaptive', 'Custom', undefined, null, 3]) expect(accentModeOf(v)).toBe('adaptive');
    });
    it('keeps a #rrggbb colour in lower case, anything else is the default teal', () => {
        expect(accentColorOf('#4FB3FF')).toBe('#4fb3ff');
        for (const v of ['#fff', 'red', '#4fb3ffaa', '', undefined, 7]) expect(accentColorOf(v)).toBe(DEFAULT_ACCENT);
    });
    it('offers ten swatches, teal first, two rows of five', () => {
        expect(ACCENT_SWATCHES).toHaveLength(10);
        expect(ACCENT_SWATCHES[0]).toMatchObject({ name: 'Teal', color: DEFAULT_ACCENT });
        expect(new Set(ACCENT_SWATCHES.map(s => s.color)).size).toBe(10);
        expect(ACCENT_SWATCHES.filter(s => s.light).map(s => s.name)).toEqual(['Amber', 'Lime', 'Silver']);
    });
});

describe('effectiveAccent', () => {
    const adaptive = { accentMode: 'adaptive' as const, accentColor: '#f472b6' };
    const custom = { accentMode: 'custom' as const, accentColor: '#f472b6' };
    it('adaptive: the colour from the art', () => {
        expect(effectiveAccent('#123456', adaptive)).toBe('#123456');
    });
    it('adaptive: the chosen colour when the art gave none (no art, grey art, not loaded yet)', () => {
        for (const v of [DEFAULT_ACCENT, null, undefined, 'junk']) expect(effectiveAccent(v, adaptive)).toBe('#f472b6');
    });
    it('custom: always the chosen colour, whatever the art', () => {
        for (const v of ['#123456', DEFAULT_ACCENT, null]) expect(effectiveAccent(v, custom)).toBe('#f472b6');
    });
    it('a bad stored colour falls back to the default teal', () => {
        expect(effectiveAccent('#123456', { accentMode: 'custom', accentColor: 'nope' })).toBe(DEFAULT_ACCENT);
    });
});

describe('onAccentFor (text on an accent fill)', () => {
    it('is dark on the light swatches in custom mode, white otherwise', () => {
        expect(onAccentFor({ accentMode: 'custom', accentColor: '#fbbf24' })).toBe('#0b0d10');
        expect(onAccentFor({ accentMode: 'custom', accentColor: '#6b8cff' })).toBe('#fff');
        expect(onAccentFor({ accentMode: 'adaptive', accentColor: '#fbbf24' })).toBe('#fff');
    });
});
