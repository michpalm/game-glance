import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { retireMenuBackdrop } from '../../src/menu/host';

function fixture() {
    const { document, window } = parseHTML('<html><head><style id="foreign">.other{}</style></head><body><div class="native visible"></div><div id="other"></div></body></html>');
    const frames = new Map<number, FrameRequestCallback>(); let id = 0;
    window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    window.cancelAnimationFrame = handle => { frames.delete(handle); };
    const frame = () => { const next = [...frames.values()]; frames.clear(); next.forEach(fn => fn(0)); };
    const backdrop = document.querySelector('.native')! as unknown as HTMLElement;
    return { document: document as unknown as Document, backdrop, frame, frames };
}

describe('custom menu closing backdrop', () => {
    it('keeps native dark glass hidden until its visible class is gone and the hidden state has painted', async () => {
        const f = fixture();
        const finish = retireMenuBackdrop(f.document, f.backdrop, 'visible');
        expect(f.backdrop.hasAttribute('data-gg-menu-retiring')).toBe(true);
        expect(f.document.querySelector('[data-gg-menu-close-guard]')).not.toBeNull();
        f.frame(); f.frame(); // Still visible: restoring here would flash native glass.
        expect(f.backdrop.hasAttribute('data-gg-menu-retiring')).toBe(true);
        f.backdrop.classList.remove('visible'); await new Promise<void>(r => queueMicrotask(r));
        f.frame(); expect(f.document.querySelector('[data-gg-menu-close-guard]')).not.toBeNull();
        f.frame(); expect(f.document.querySelector('[data-gg-menu-close-guard]')).toBeNull();
        expect(f.backdrop.hasAttribute('data-gg-menu-retiring')).toBe(false);
        expect(f.document.querySelector('#foreign')).not.toBeNull();
        expect(f.document.querySelector('#other')?.getAttribute('style')).toBeNull();
        finish();
    });
    it('can restore immediately on reopen, native handoff or unload and cancels pending work', async () => {
        const f = fixture(), finish = retireMenuBackdrop(f.document, f.backdrop, 'visible');
        f.backdrop.classList.remove('visible'); await new Promise<void>(r => queueMicrotask(r));
        expect(f.frames.size).toBeGreaterThan(0);
        finish(); finish(); f.frame();
        expect(f.frames.size).toBe(0);
        expect(f.document.querySelector('[data-gg-menu-close-guard]')).toBeNull();
        expect(f.backdrop.hasAttribute('data-gg-menu-retiring')).toBe(false);
    });
});
