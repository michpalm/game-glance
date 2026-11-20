/**
 * Text that doesn't fit, brought into view (spec 2026-11-18 "Scrolling text that doesn't fit"). Text that fits never moves.
 * - attachMarquee: a one-line text cut off with "…" slides to its end while its card is focused, then fades back.
 * - attachRoll: a description longer than its lines glides up to its end while the page is left alone.
 * DOM only, timers and events; both return their own cleanup. Nothing moves under prefers-reduced-motion.
 */

const WAIT = 1500, SPEED = 30, HOLD = 2000, FADE = 300;
const IDLE = 3000, STEP = 3000;

/** A cut-off line's timings in ms, or null when it fits (within a pixel). Pure. */
export function marqueeTimes(overflowPx: number): { wait: number; slide: number; hold: number; fade: number } | null {
    if (!(overflowPx > 1)) return null;
    return { wait: WAIT, slide: Math.round((overflowPx / SPEED) * 1000), hold: HOLD, fade: FADE };
}

function stillMotion(node: HTMLElement): boolean {
    try { return node.ownerDocument?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true; } catch { return false; }
}

/**
 * `line` holds the text in its first child element (a span): the span moves, the line clips it. Starts when focus enters
 * `card`, resets at once when focus leaves it.
 */
export function attachMarquee(card: HTMLElement, line: HTMLElement): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const later = (ms: number, then: () => void) => { timer = setTimeout(then, ms); };
    const text = () => line.firstElementChild as HTMLElement | null;
    const reset = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        const t = text();
        if (t) Object.assign(t.style, { transition: 'none', transform: '', opacity: '' });
        line.removeAttribute('data-gg-marquee');
    };
    const run = () => {
        const t = text();
        const times = marqueeTimes(line.scrollWidth - line.clientWidth);
        if (!t || !times) { reset(); return; }
        const over = line.scrollWidth - line.clientWidth;
        line.setAttribute('data-gg-marquee', '');
        Object.assign(t.style, { transition: `transform ${times.slide}ms linear`, transform: `translateX(-${over}px)`, opacity: '' });
        later(times.slide + times.hold, () => {
            Object.assign(t.style, { transition: `opacity ${times.fade}ms`, opacity: '0' });
            later(times.fade, () => {
                // Back at the start while unseen, then shown again.
                Object.assign(t.style, { transition: `opacity ${times.fade}ms`, transform: '', opacity: '1' });
                later(times.fade + times.wait, run);
            });
        });
    };
    const onIn = () => {
        if (timer !== null || stillMotion(line)) return;
        later(WAIT, run);
    };
    const onOut = (event: Event) => {
        const next = (event as FocusEvent | undefined)?.relatedTarget as Node | null | undefined;
        if (next && card.contains(next)) return;
        reset();
    };
    card.addEventListener('focusin', onIn);
    card.addEventListener('focusout', onOut);
    return () => {
        card.removeEventListener('focusin', onIn);
        card.removeEventListener('focusout', onOut);
        if (timer !== null) clearTimeout(timer);
        timer = null;
    };
}

const INPUT = ['keydown', 'pointerdown', 'wheel', 'focusin'] as const;

/**
 * A description's glide in ms: its overflow at one line per STEP ms (the pace of the old line-by-line steps), or null
 * when it fits (within a pixel). Pure.
 */
export function rollTimes(overflowPx: number, lineHeightPx: number): { slide: number; hold: number; fade: number; again: number } | null {
    if (!(overflowPx > 1) || !(lineHeightPx > 0)) return null;
    return { slide: Math.round((overflowPx / lineHeightPx) * STEP), hold: HOLD, fade: FADE, again: STEP };
}

/**
 * After IDLE ms with no input on `doc`, a description with more lines than it shows glides up to its end at a steady
 * pace (as the achievements line slides: a linear transform, no stepping), holds, fades back to the top, and again
 * after STEP ms. Any input puts it back at the top at once. `desc` holds its text in its first child element (a span):
 * the span moves, the description clips it. While it rolls it carries data-gg-roll: its CSS swaps the "…" clamp for a
 * clip of the same height.
 */
export function attachRoll(desc: HTMLElement, doc: Pick<Document, 'addEventListener' | 'removeEventListener'>): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const later = (ms: number, then: () => void) => { timer = setTimeout(then, ms); };
    const text = () => desc.firstElementChild as HTMLElement | null;
    const lineHeight = () => {
        const px = parseFloat(desc.ownerDocument?.defaultView?.getComputedStyle(desc).lineHeight ?? '');
        return Number.isFinite(px) && px > 0 ? px : desc.clientHeight / 3;
    };
    const reset = () => {
        const t = text();
        if (t) Object.assign(t.style, { transition: 'none', transform: '', opacity: '', display: '' });
        desc.removeAttribute('data-gg-roll');
    };
    const run = () => {
        const t = text();
        if (!t) return;
        // Measured with the clip on (the clamp's "…" box can report a different height).
        desc.setAttribute('data-gg-roll', '');
        t.style.display = 'block';
        const over = desc.scrollHeight - desc.clientHeight;
        const times = rollTimes(over, lineHeight());
        if (!times) { reset(); return; }
        Object.assign(t.style, { transition: `transform ${times.slide}ms linear`, transform: `translateY(-${over}px)`, opacity: '' });
        later(times.slide + times.hold, () => {
            Object.assign(t.style, { transition: `opacity ${times.fade}ms`, opacity: '0' });
            later(times.fade, () => {
                // Back at the top while unseen, then shown again.
                Object.assign(t.style, { transition: `opacity ${times.fade}ms`, transform: '', opacity: '1' });
                later(times.fade + times.again, run);
            });
        });
    };
    const start = () => {
        timer = null;
        if (stillMotion(desc)) return;
        run();
    };
    const wait = () => {
        if (timer !== null) clearTimeout(timer);
        reset();
        timer = setTimeout(start, IDLE);
    };
    INPUT.forEach(type => doc.addEventListener(type, wait, { passive: true }));
    wait();
    return () => {
        INPUT.forEach(type => doc.removeEventListener(type, wait));
        if (timer !== null) clearTimeout(timer);
        timer = null;
    };
}
