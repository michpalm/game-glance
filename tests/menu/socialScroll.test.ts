import { parseHTML } from 'linkedom';
import { expect, it } from 'vitest';
import { captureChatAnchor, restoreChatAnchor } from '../../src/menu/socialScroll';

it('preserves the visible message when a bounded history window changes without changing total height', () => {
    const { document } = parseHTML('<div id="history"><div data-gg-message="a"></div><div data-gg-message="b"></div></div>');
    const container = document.querySelector('#history')! as unknown as HTMLElement;
    const first = container.querySelector<HTMLElement>('[data-gg-message="a"]')!;
    let top = 100;
    container.getBoundingClientRect = () => ({ top: 100, bottom: 500 } as DOMRect);
    first.getBoundingClientRect = () => ({ top, bottom: top + 40 } as DOMRect);
    Object.defineProperty(container, 'scrollHeight', { value: 5000 }); container.scrollTop = 400;
    const anchor = captureChatAnchor(container); top = 300;
    restoreChatAnchor(container, anchor);
    expect(container.scrollTop).toBe(600);
});
