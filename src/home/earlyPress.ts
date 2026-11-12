/**
 * A pressed during the open from Home (spec: answer 2026-11-12). Steam focuses the page's Play button only as its own
 * page animation ends (~1.4 s after the opening press, probed on the Ally); until then Steam's focus stays on Home's
 * card, so an A went to a card that no longer matters. This catches that A and presses whatever Steam focuses in the
 * page's Play row once it does (Play, or Install/Update): A does what it would on the page, without the wait.
 */

/** An A this soon after the opening press is part of a double press, not a second press: ignored (no launch). */
export const EARLY_PRESS_GUARD_MS = 200;
/** The longest it waits for Play: past this a caught A is dropped (a late launch would surprise). */
export const EARLY_PRESS_CAP_MS = 3000;
const POLL_MS = 16;
const A = 1, B = 2;

export function catchEarlyPress({ doc, now = () => Date.now(), focused, press }: {
    doc: Document; now?: () => number; focused(): HTMLElement | null; press(el: HTMLElement): void;
}): () => void {
    const started = now();
    let pending = false, done = false;
    const button = (event: Event) => Number((event as CustomEvent<{ button?: number }>).detail?.button);
    const onButton = (event: Event) => {
        if (done) return;
        const pressed = button(event);
        if (pressed === B) { pending = false; finish(); return; } // going back: the open is cancelled
        if (pressed !== A || now() - started < EARLY_PRESS_GUARD_MS) return;
        // Steam sends vgp_onbuttondown then vgp_onok for one press: both stay away from Home's stale card.
        pending = true;
        event.stopPropagation();
        event.preventDefault();
    };
    const timer = setInterval(() => {
        if (done) return;
        if (now() - started >= EARLY_PRESS_CAP_MS) { pending = false; finish(); return; }
        const el = focused();
        if (!el) return;
        const go = pending;
        finish();
        if (go) press(el);
    }, POLL_MS);
    function finish() {
        if (done) return;
        done = true;
        clearInterval(timer);
        doc.removeEventListener('vgp_onbuttondown', onButton, true);
        doc.removeEventListener('vgp_onok', onButton, true);
    }
    doc.addEventListener('vgp_onbuttondown', onButton, true);
    doc.addEventListener('vgp_onok', onButton, true);
    return finish;
}
