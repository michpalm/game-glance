import { parseHTML } from 'linkedom';
import { expect, it } from 'vitest';
import { applyAccent, installTokenCss } from '../../src/styles/tokens';

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
