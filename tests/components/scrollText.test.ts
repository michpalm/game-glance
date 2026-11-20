import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachMarquee, attachRoll, marqueeTimes, rollTimes } from '../../src/components/scrollText';

type Listener = (e?: unknown) => void;
function target() {
    const on: Record<string, Listener[]> = {};
    return {
        on,
        addEventListener: (t: string, f: Listener) => { (on[t] ??= []).push(f); },
        removeEventListener: (t: string, f: Listener) => { on[t] = (on[t] ?? []).filter(g => g !== f); },
        fire: (t: string, e?: unknown) => (on[t] ?? []).forEach(f => f(e)),
    };
}
function el(extra: Record<string, unknown> = {}) {
    const attrs: Record<string, string> = {};
    return { attrs, style: {} as Record<string, string>, setAttribute: (k: string, v: string) => { attrs[k] = v; }, removeAttribute: (k: string) => { delete attrs[k]; }, contains: () => false, ...target(), ...extra };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('marqueeTimes', () => {
    it('text that fits (or is a pixel over) never moves', () => {
        expect(marqueeTimes(0)).toBeNull();
        expect(marqueeTimes(1)).toBeNull();
    });
    it('waits 1.5 s, slides at 30 px/s, holds 2 s, fades in 300 ms', () => {
        expect(marqueeTimes(90)).toEqual({ wait: 1500, slide: 3000, hold: 2000, fade: 300 });
    });
});

describe('attachMarquee: a cut-off line scrolls while its card is focused', () => {
    const setup = (overflow: number) => {
        const text = el();
        const line = el({ scrollWidth: 200 + overflow, clientWidth: 200, firstElementChild: text });
        const card = el();
        const stop = attachMarquee(card as unknown as HTMLElement, line as unknown as HTMLElement);
        return { text, line, card, stop };
    };
    it('does nothing for text that fits', () => {
        const { text, line, card } = setup(0);
        card.fire('focusin');
        vi.advanceTimersByTime(10_000);
        expect(text.style.transform ?? '').toBe('');
        expect(line.attrs['data-gg-marquee']).toBeUndefined();
    });
    it('after 1.5 s slides the whole overflow, holds, fades back to the start, and goes again', () => {
        const { text, line, card } = setup(90);
        card.fire('focusin');
        vi.advanceTimersByTime(1499);
        expect(text.style.transform ?? '').toBe('');
        vi.advanceTimersByTime(1);
        expect(text.style.transform).toBe('translateX(-90px)');
        expect(text.style.transition).toBe('transform 3000ms linear');
        expect(line.attrs['data-gg-marquee']).toBe('');
        vi.advanceTimersByTime(3000 + 2000);
        expect(text.style.opacity).toBe('0');
        vi.advanceTimersByTime(300);
        expect(text.style.transform).toBe('');
        vi.advanceTimersByTime(300 + 1500);
        expect(text.style.transform).toBe('translateX(-90px)');
    });
    it('puts the text back at once when focus leaves the card', () => {
        const { text, line, card } = setup(90);
        card.fire('focusin');
        vi.advanceTimersByTime(2000);
        card.fire('focusout', { relatedTarget: null });
        expect(text.style.transform).toBe('');
        expect(text.style.transition).toBe('none');
        expect(line.attrs['data-gg-marquee']).toBeUndefined();
        vi.advanceTimersByTime(10_000);
        expect(text.style.transform).toBe('');
    });
    it('stops and lets go of the card when detached', () => {
        const { text, card, stop } = setup(90);
        card.fire('focusin');
        stop();
        expect(card.on.focusin).toHaveLength(0);
        vi.advanceTimersByTime(10_000);
        expect(text.style.transform ?? '').toBe('');
    });
});

describe('rollTimes', () => {
    it('text that fits (or is a pixel over) never moves', () => {
        expect(rollTimes(0, 22)).toBeNull();
        expect(rollTimes(1, 22)).toBeNull();
    });
    it('glides at one line per 3 s (the old steps’ pace), holds 2 s, fades in 300 ms, goes again after 3 s', () => {
        expect(rollTimes(44, 22)).toEqual({ slide: 6000, hold: 2000, fade: 300, again: 3000 });
    });
});

describe('attachRoll: a long description glides up while the page is still', () => {
    const setup = (scrollHeight: number) => {
        const doc = target();
        const text = el();
        const desc = el({ scrollHeight, clientHeight: 66, firstElementChild: text, ownerDocument: { defaultView: { getComputedStyle: () => ({ lineHeight: '22px' }) } } });
        const stop = attachRoll(desc as unknown as HTMLElement, doc as unknown as Document);
        return { doc, desc, text, stop };
    };
    it('leaves text that fits alone', () => {
        const { desc, text } = setup(66);
        vi.advanceTimersByTime(20_000);
        expect(text.style.transform ?? '').toBe('');
        expect(desc.attrs['data-gg-roll']).toBeUndefined();
    });
    it('after 3 s still, glides the whole overflow in one linear move; holds, fades back to the top, and goes again', () => {
        const { desc, text } = setup(110); // 5 lines, 3 shown: 44 px over
        vi.advanceTimersByTime(2999);
        expect(text.style.transform ?? '').toBe('');
        vi.advanceTimersByTime(1);
        expect(desc.attrs['data-gg-roll']).toBe('');
        expect(text.style.display).toBe('block');
        expect(text.style.transform).toBe('translateY(-44px)');
        expect(text.style.transition).toBe('transform 6000ms linear');
        vi.advanceTimersByTime(6000 + 2000);
        expect(text.style.opacity).toBe('0');
        vi.advanceTimersByTime(300);
        expect(text.style.transform).toBe('');
        expect(text.style.opacity).toBe('1');
        vi.advanceTimersByTime(300 + 3000);
        expect(text.style.transform).toBe('translateY(-44px)');
    });
    it('any input puts it back at the top at once and starts the 3 s wait again', () => {
        const { doc, desc, text } = setup(110);
        vi.advanceTimersByTime(3000);
        expect(text.style.transform).toBe('translateY(-44px)');
        doc.fire('keydown');
        expect(text.style.transform).toBe('');
        expect(text.style.transition).toBe('none');
        expect(text.style.display).toBe('');
        expect(desc.attrs['data-gg-roll']).toBeUndefined();
        vi.advanceTimersByTime(2999);
        expect(text.style.transform).toBe('');
        vi.advanceTimersByTime(1);
        expect(text.style.transform).toBe('translateY(-44px)');
    });
    it('lets go of the page when detached', () => {
        const { doc, text, stop } = setup(110);
        stop();
        expect(doc.on.keydown).toHaveLength(0);
        vi.advanceTimersByTime(10_000);
        expect(text.style.transform ?? '').toBe('');
    });
});
