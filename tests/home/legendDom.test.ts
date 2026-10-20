import { parseHTML } from 'linkedom';
import { afterEach, expect, it, vi } from 'vitest';
import { watchLegendHeight } from '../../src/home/legend';

afterEach(() => vi.useRealTimers());
function fixture() {
    vi.useFakeTimers();
    const { document, window } = parseHTML('<html><body><main><section><div class="gh-root"></div></section><footer style="position:absolute">A Select B Back</footer></main></body></html>');
    const root = document.querySelector('.gh-root') as unknown as HTMLElement;
    const footer = document.querySelector('footer') as unknown as HTMLElement;
    const parent = document.querySelector('main') as unknown as HTMLElement;
    let height = 42;
    Object.defineProperties(root, { offsetWidth: { value: 1440 }, offsetHeight: { value: 810 } });
    Object.defineProperties(footer, { offsetWidth: { value: 1440 }, offsetHeight: { get: () => height } });
    parent.getBoundingClientRect = () => ({ bottom: 810 } as DOMRect);
    footer.getBoundingClientRect = () => ({ bottom: 810 } as DOMRect);
    Object.assign(window, {
        getComputedStyle: (element: HTMLElement) => element.style,
        requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
        cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    });
    return { root, footer, parent, setHeight: (next: number) => { height = next; } };
}
const flush = async () => { await Promise.resolve(); await vi.advanceTimersByTimeAsync(0); };

it('retains the last footer reservation while hidden and remeasures the remounted footer', async () => {
    const f = fixture(), changed = vi.fn();
    const stop = watchLegendHeight(f.root, changed);
    expect(changed.mock.calls).toEqual([[42]]);
    f.footer.remove(); await flush();
    expect(changed.mock.calls).toEqual([[42]]);
    f.setHeight(54); f.parent.append(f.footer); await flush();
    expect(changed.mock.calls).toEqual([[42], [54]]);
    stop(); stop(); f.setHeight(60); f.footer.remove(); f.parent.append(f.footer); await flush();
    expect(changed).toHaveBeenCalledTimes(2);
});
it('recovers when Home initially mounts while the menu has removed the footer', async () => {
    const f = fixture(), changed = vi.fn(); f.footer.remove();
    const stop = watchLegendHeight(f.root, changed); expect(changed).not.toHaveBeenCalled();
    f.parent.append(f.footer); await flush(); expect(changed).toHaveBeenCalledWith(42); stop();
});
