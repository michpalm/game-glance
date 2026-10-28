import { parseHTML } from 'linkedom';
import { expect, it } from 'vitest';
import { actionRadius, applyAccent, CALM_IN_CSS, calmFilterMarkup, calmGain, focusRing, frostSurface, installCalmFilter, installTokenCss, labelText, selectedSlice, TOKENS, tokenCss } from '../../src/styles/tokens';

it('shares each document token stylesheet and releases only the caller-owned style', () => {
    const a = parseHTML('<html><head><style id="foreign"></style></head><body></body></html>');
    const b = parseHTML('<html><head></head><body></body></html>');
    const first = installTokenCss(a.document as unknown as Document, '.gg-menu');
    const second = installTokenCss(a.document as unknown as Document, '.gg-menu');
    const popup = installTokenCss(b.document as unknown as Document, '.gg-menu');
    expect(a.document.querySelectorAll('[data-gg-tokens]').length).toBe(1);
    first(); first(); expect(a.document.querySelector('[data-gg-tokens]')).not.toBeNull();
    second(); expect(a.document.querySelector('[data-gg-tokens]')).toBeNull(); expect(a.document.querySelector('#foreign')).not.toBeNull();
    expect(b.document.querySelector('[data-gg-tokens]')).not.toBeNull(); popup();
});

it('uses the raw artwork color for fills and rejects malformed accent declarations', () => {
    const { document } = parseHTML('<div id="root"></div>');
    const root = document.querySelector('#root')! as unknown as HTMLElement;
    applyAccent(root, '#3d33cd'); expect(root.style.getPropertyValue('--gg-accent')).toBe('#3d33cd');
    expect(root.style.getPropertyValue('--gg-accent-text')).toMatch(/^#[a-f\d]{6}$/i);
    applyAccent(root, 'red;display:none'); expect(root.style.getPropertyValue('--gg-accent')).toBe('#5fd1ae');
    applyAccent(root, null); expect(root.style.getPropertyValue('--gg-accent')).toBe('#5fd1ae');
});

it('declares the selected shade and its faint accent edge', () => {
    expect(TOKENS.selected).toBe('rgba(255,255,255,.14)');
    const css = tokenCss('.x');
    expect(css).toContain('--gg-selected:rgba(255,255,255,.14)');
    expect(css).toContain('--gg-selected-edge:inset 0 -2px 0 color-mix(in srgb,var(--gg-accent) 55%,transparent)');
    expect(selectedSlice()).toBe('background:var(--gg-selected);color:var(--gg-text);box-shadow:var(--gg-selected-edge)');
});
it('gives the menu a ring that follows the shape, with no growth or glow', () => {
    expect(focusRing('menu')).toBe('outline:2px solid #fff;outline-offset:2px;transform:none');
    expect(focusRing('slice')).toBe('outline:2px solid #fff;outline-offset:-2px;transform:none');
    expect(focusRing()).toContain('scale(1.04)');
});

it('action radii are proportions of the button height', () => {
    expect(actionRadius(54, 'action')).toBe(19); expect(actionRadius(54, 'icon')).toBe(16);
    expect(actionRadius(60, 'action')).toBe(22); expect(actionRadius(60, 'icon')).toBe(18);
});

it('lift and level focus: white ring, neutral shadow, no accent, lift only for lift', () => {
    const lift = focusRing('lift'), level = focusRing('level');
    for (const r of [lift, level]) {
        expect(r).toContain('outline:2px solid #fff'); expect(r).toContain('outline-offset:2px');
        expect(r).toContain('0 14px 28px -12px rgba(0,0,0,.75)'); expect(r).not.toMatch(/accent|scale\(/);
    }
    expect(lift).toContain('translateY(-4px)'); expect(level).toContain('transform:none');
    expect(focusRing('lift', (n) => `calc(var(--gg-d) * ${n})`)).toContain('translateY(calc(var(--gg-d) * -4))');
});

it('the calm gain is the shader\'s: 1 up to 0.45 luminance, then (0.45 + (Y - 0.45) * 0.35) / Y', () => {
    const v = calmGain().split(' ').map(Number);
    expect(v).toHaveLength(41);
    expect(v[0]).toBe(1); expect(v[18]).toBe(1);                   // Y = 0.45
    expect(v[20]).toBeCloseTo((0.45 + 0.05 * 0.35) / 0.5, 4);       // Y = 0.5
    expect(v[40]).toBeCloseTo(0.6425, 4);                           // Y = 1
});

it('the calm filter scales the colour by one gain from its luminance, so hue holds (the shader\'s Calm)', () => {
    const m = calmFilterMarkup();
    expect(m).toContain('id="gg-calm"'); expect(m).toContain('color-interpolation-filters="sRGB"');
    // 1. luminance (Rec. 709 weights) into R, G and B, alpha kept
    const row = '0.2126 0.7152 0.0722 0 0';
    expect(m).toContain(`<feColorMatrix in="SourceGraphic" type="matrix" values="${row} ${row} ${row} 0 0 0 1 0" result="luma"/>`);
    // 2. luminance to gain, the same table on each channel
    expect(m.match(new RegExp(`type="table" tableValues="${calmGain()}"`, 'g'))).toHaveLength(3);
    // 3. colour times gain
    expect(m).toMatch(/<feComposite in="SourceGraphic" in2="gain" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"\/>/);
    // never a per-channel curve on the colour itself
    expect(m).not.toMatch(/<feComponentTransfer>(?![^]*result="gain")/);
});

it('frost is .40 glass and one blur, with no filter reference while the calm is off', () => {
    expect(CALM_IN_CSS).toBe(false);
    expect(frostSurface('16px')).toBe('background:rgba(12,16,22,.40);backdrop-filter:blur(16px)');
    expect(frostSurface('16px', 'strong')).toContain('rgba(12,16,22,.55)');
    expect(frostSurface('16px')).not.toContain('url(');
});

it('installCalmFilter adds nothing while the calm is off', () => {
    const { document } = parseHTML('<html><head></head><body></body></html>');
    const release = installCalmFilter(document as unknown as Document);
    expect(document.getElementById('gg-calm')).toBeNull(); release(); release();
});

it('labels are 90% white with the menu shadow', () => {
    expect(labelText()).toBe('color:rgba(255,255,255,.90);text-shadow:0 1px 2px #0009');
});
