import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { readUnavailableMessage } from '../../src/styles/unavailableMessage';

const selector = '.status.unavailable .reason';
const doc = (html: string) => parseHTML(`<html><body>${html}</body></html>`).document as unknown as Document;

describe('Steam’s unavailable message in the game metadata row', () => {
    it('reads the localized native reason and platform icons even while the original is hidden', () => {
        const page = doc('<div class="status unavailable" style="display:none"><div class="reason">仅适用于 <img src="data:image/png;base64,windows" alt="Windows"></div></div>');
        expect(readUnavailableMessage(page, selector)).toEqual({ text: '仅适用于', icons: [{ src: 'data:image/png;base64,windows', alt: 'Windows' }] });
    });
    it('does not show normal game statistics or its own mirrored label', () => {
        const page = doc('<div class="status"><div class="reason">Last played today</div></div><span class="gg-availability">Available for Windows</span>');
        expect(readUnavailableMessage(page, selector)).toBeNull();
    });
    it('keeps a text-only blocking explanation', () => {
        expect(readUnavailableMessage(doc('<div class="status unavailable"><div class="reason">Subscription expired</div></div>'), selector)).toEqual({ text: 'Subscription expired', icons: [] });
    });
    it('clears the explanation when Steam removes the restriction', () => {
        const page = doc('<div class="status unavailable"><div class="reason">Available for</div></div>');
        expect(readUnavailableMessage(page, selector)?.text).toBe('Available for');
        page.querySelector('.status')!.classList.remove('unavailable');
        expect(readUnavailableMessage(page, selector)).toBeNull();
    });
    it('does not invent text or image URLs when the reason or its selectors are unavailable', () => {
        const page = doc('<div class="status unavailable"><div class="reason"><img></div></div>');
        expect(readUnavailableMessage(page, selector)).toBeNull();
        expect(readUnavailableMessage(page, null)).toBeNull();
    });
});
