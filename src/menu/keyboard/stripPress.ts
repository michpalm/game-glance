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
    /** Focus left the strip (a direction, or blur) before the lift: the hold is given up, with no lift and no cycle. */
    abort(): void;
    /** B during the drag drops the panel; true when it did, so B goes no further. */
    cancel(): boolean;
    dragging(): boolean;
    /** The keyboard closed: timers cleared, nothing fires afterwards (no drop, so nothing is saved). */
    dispose(): void;
}

/** Exactly one path acts per press: a gamepad press decides on A up (or the hold timer); any click it causes is
 * swallowed, and a click with no gamepad press waits a tick so an A down arriving just after it can claim it. */
export function createStripPress(deps: { cycle(): void; lift(): void; drop(): void; held?(pending: boolean): void }, holdMs = STRIP_HOLD_MS): StripPress {
    let hold: ReturnType<typeof setTimeout> | null = null, click: ReturnType<typeof setTimeout> | null = null;
    // `stale`: a hold given up while A is still down; its A up (if the strip sees it) only marks the press as ended.
    let down = false, lifted = false, stale = false, padEnded = -Infinity;
    const clear = () => {
        if (hold) { clearTimeout(hold); deps.held?.(false); }
        if (click) clearTimeout(click);
        hold = click = null;
    };
    const end = () => { down = false; padEnded = Date.now(); };
    return {
        buttonDown() {
            if (down) return;
            clear(); down = true; lifted = false; stale = false;
            hold = setTimeout(() => { hold = null; deps.held?.(false); lifted = true; deps.lift(); }, holdMs);
            deps.held?.(true);
        },
        buttonUp() {
            if (stale) { stale = false; padEnded = Date.now(); return; }
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
        abort() {
            if (!down || !hold) return;
            clear(); down = false; stale = true; padEnded = Date.now();
        },
        cancel() {
            if (!lifted) return false;
            lifted = false; end(); deps.drop();
            return true;
        },
        dragging: () => lifted,
        dispose() { clear(); down = lifted = stale = false; },
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

/** On the document while a hold is pending: a direction (stick or d-pad) is about to move focus off the strip, so the
 * hold is given up. The event goes on to move focus as usual. */
export function installHoldWatch(doc: EventTarget, abort: () => void): () => void {
    const onDirection = () => abort();
    doc.addEventListener('vgp_ondirection', onDirection, { capture: true });
    return () => doc.removeEventListener('vgp_ondirection', onDirection, { capture: true });
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

/** Commit the live drag position before state-clearing callbacks can synchronously render old position props. */
export function finishPadDrop(on:{lifted:boolean;finish():void;release():void;idle():void}):void {
    try { if(on.lifted)on.finish();else on.idle(); }
    finally { on.release(); }
}
