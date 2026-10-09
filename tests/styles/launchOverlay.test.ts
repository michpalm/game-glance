import { describe, expect, it } from 'vitest';
import { launchHidden, launchOverlayShown } from '../../src/styles/launchOverlay';

/** A fake element: `boxes` client rects, contains what is listed in `children`. */
function el(boxes: number, children: unknown[] = []) {
    return { getClientRects: () => ({ length: boxes }), contains: (other: unknown) => other === undefined ? false : children.includes(other) };
}

function doc(map: Record<string, Array<ReturnType<typeof el>>>) {
    return {
        querySelector: (s: string) => map[s]?.[0] ?? null,
        querySelectorAll: (s: string) => map[s] ?? [],
    };
}

describe('launchOverlayShown', () => {
    const overlay = el(1);

    it('is true while the overlay is rendered and sits outside everything that hides', () => {
        const page = el(1, []);
        expect(launchOverlayShown(doc({ '.ov': [overlay], '.gg-hero': [page] }), '.ov', ['.gg-hero', '.missing'])).toBe(true);
    });
    it('is false with no overlay, or one that is not rendered (display: none or detached)', () => {
        expect(launchOverlayShown(doc({}), '.ov', [])).toBe(false);
        expect(launchOverlayShown(doc({ '.ov': [el(0)] }), '.ov', [])).toBe(false);
    });
    it('is false when the overlay is inside something that would hide, so the overlay itself never hides', () => {
        const panel = el(1, [overlay]);
        expect(launchOverlayShown(doc({ '.ov': [overlay], '.panel': [el(1), panel] }), '.ov', ['.panel'])).toBe(false);
    });
    it('is false without a document or a known overlay, and when the DOM throws', () => {
        expect(launchOverlayShown(null, '.ov', [])).toBe(false);
        expect(launchOverlayShown(doc({ '.ov': [overlay] }), null, [])).toBe(false);
        const broken = { querySelector: () => { throw new Error('gone'); }, querySelectorAll: () => [] };
        expect(launchOverlayShown(broken, '.ov', [])).toBe(false);
    });
});

describe('launchHidden', () => {
    it('hides while Steam\'s launch screen is shown, launch from Home or not', () => {
        expect(launchHidden({ pending: false, overlayShown: true, overlaySeen: true })).toBe(true);
        expect(launchHidden({ pending: true, overlayShown: true, overlaySeen: true })).toBe(true);
    });
    it('after Play on Home: hidden from the first frame until the launch screen has come and gone', () => {
        expect(launchHidden({ pending: true, overlayShown: false, overlaySeen: false })).toBe(true);
        expect(launchHidden({ pending: true, overlayShown: false, overlaySeen: true })).toBe(false);
    });
    it('shown otherwise: a page opened normally, or a launch screen that never came', () => {
        expect(launchHidden({ pending: false, overlayShown: false, overlaySeen: false })).toBe(false);
        expect(launchHidden({ pending: false, overlayShown: false, overlaySeen: true })).toBe(false);
    });
});
