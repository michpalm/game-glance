import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';

vi.mock('../../src/styles/theme', () => ({ playRow: vi.fn(() => '.play') }));

import { pageAtTop } from '../../src/logic/feedbackScroll';

afterEach(() => vi.unstubAllGlobals());

function fixture(scrollTop: number, scrolls = true) {
    const { document } = parseHTML('<html><body><div id="port"><div class="row"><div class="play">Play</div></div></div></body></html>');
    const port = document.querySelector('#port')! as unknown as HTMLElement;
    Object.defineProperties(port, { clientHeight: { value: 466 }, scrollHeight: { value: scrolls ? 1600 : 466 } });
    port.scrollTop = scrollTop;
    vi.stubGlobal('getComputedStyle', (el: Element) => ({ overflowY: el === port ? 'scroll' : 'visible' }));
    return { doc: document as unknown as Document, port };
}

describe('pageAtTop', () => {
    it.each([[0, true], [1, true], [2, false], [300, false]])('scrollTop %d → %s', (top, expected) => {
        expect(pageAtTop(fixture(top).doc, '.play')).toBe(expected);
    });

    it('is false without a selector or a Play row', () => {
        const { doc } = fixture(0);
        expect(pageAtTop(doc, null)).toBe(false);
        expect(pageAtTop(doc, '.missing')).toBe(false);
    });

    it('is true for a page that cannot scroll (Play is on screen)', () => {
        expect(pageAtTop(fixture(0, false).doc, '.play')).toBe(true);
    });

    it('is false when reading the page throws', () => {
        const { doc } = fixture(0);
        vi.stubGlobal('getComputedStyle', () => { throw new Error('gone'); });
        expect(pageAtTop(doc, '.play')).toBe(false);
    });
});
