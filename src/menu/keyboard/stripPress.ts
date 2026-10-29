/** A on the keyboard's move strip: a quick press cycles the spots, a 400 ms hold lifts the panel for the stick. */
export const STRIP_HOLD_MS = 400;
export const NUDGE = 8;
// Steam's A acts on press, so its click on the strip arrives close to A down (before or after it) or on A up.
const CLICK_AFTER_PAD_MS = 300;

export interface StripPress {
    /** Gamepad A down on the strip (repeats ignored). */
    buttonDown(): void;
    /** Gamepad A up: cycles after a quick press, drops after a hold. */
    buttonUp(): void;
    /** The strip button's click: a touch tap or mouse click cycles; the click of a gamepad press is ignored. */
    action(): void;
    /** B during the drag drops the panel; true when it did, so B goes no further. */
    cancel(): boolean;
    dragging(): boolean;
    /** The keyboard closed: timers cleared, nothing fires afterwards (no drop, so nothing is saved). */
    dispose(): void;
}

/** Exactly one path acts per press: a gamepad press decides on A up (or the hold timer); any click it causes is
 * swallowed, and a click with no gamepad press waits a tick so an A down arriving just after it can claim it. */
export function createStripPress(deps: { cycle(): void; lift(): void; drop(): void }, holdMs = STRIP_HOLD_MS): StripPress {
    let hold: ReturnType<typeof setTimeout> | null = null, click: ReturnType<typeof setTimeout> | null = null;
    let down = false, lifted = false, padEnded = -Infinity;
    const clear = () => {
        if (hold) clearTimeout(hold);
        if (click) clearTimeout(click);
        hold = click = null;
    };
    const end = () => { down = false; padEnded = Date.now(); };
    return {
        buttonDown() {
            if (down) return;
            clear(); down = true; lifted = false;
            hold = setTimeout(() => { hold = null; lifted = true; deps.lift(); }, holdMs);
        },
        buttonUp() {
            if (!down) return;
            end();
            if (hold) { clear(); deps.cycle(); }
            else if (lifted) { lifted = false; deps.drop(); }
        },
        action() {
            if (down || Date.now() - padEnded < CLICK_AFTER_PAD_MS) return;
            if (click) clearTimeout(click);
            click = setTimeout(() => { click = null; deps.cycle(); }, 0);
        },
        cancel() {
            if (!lifted) return false;
            lifted = false; end(); deps.drop();
            return true;
        },
        dragging: () => lifted,
        dispose() { clear(); down = lifted = false; },
    };
}

/** The panel's step for a d-pad direction (Steam's buttons 9-12: up, down, left, right). */
export function dpadStep(button: number): { x: number; y: number } | null {
    switch (button) {
        case 9: return { x: 0, y: -NUDGE };
        case 10: return { x: 0, y: NUDGE };
        case 11: return { x: -NUDGE, y: 0 };
        case 12: return { x: NUDGE, y: 0 };
    }
    return null;
}

type DragHandlers = { nudge(step: { x: number; y: number }): void; cancel(): boolean; release(): void; stickBusy(): boolean };
const buttonOf = (event: Event) => Number((event as CustomEvent<{ button?: number }>).detail?.button);
const swallow = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };

/** On the document, capture phase, only while the panel is lifted: directions move the panel instead of focus (the
 * stick's own direction events are left to the axes feed while it is pushed), B (Steam's vgp_oncancel, as openCancel catches it) drops
 * instead of closing the keyboard, and A up drops wherever focus is. */
export function installDragGamepad(doc: EventTarget, on: DragHandlers): () => void {
    const onDirection = (event: Event) => {
        swallow(event);
        const step = dpadStep(buttonOf(event));
        if (step && !on.stickBusy()) on.nudge(step);
    };
    const onCancel = (event: Event) => { swallow(event); on.cancel(); };
    const onUp = (event: Event) => { if (buttonOf(event) === 1) on.release(); };
    const listeners: [string, (event: Event) => void][] = [['vgp_ondirection', onDirection], ['vgp_oncancel', onCancel], ['vgp_onbuttonup', onUp]];
    for (const [type, fn] of listeners) doc.addEventListener(type, fn, { capture: true });
    return () => { for (const [type, fn] of listeners) doc.removeEventListener(type, fn, { capture: true }); };
}
