import { Focusable, findModule, findModuleExport, type GamepadEvent, type NavEntryPositionPreferences } from '@decky/ui';
import { Component, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { LuMove } from 'react-icons/lu';
import { backendKv } from '../../data/kv';
import { takeSteamFocus } from '../../home/steamFocus';
import { findSteamLayoutSource, readLayouts, type KeyboardLayout, type KeyDef } from '../keyboard/layouts';
import { dragPosition, followUnderKeyboard, loadPosition, movePanel, normaliseAxis, savePosition, stickStep, stickVelocity, settle, spotPosition, SPOTS, type Rect, type Spot } from '../keyboard/placement';
import { createStripPress, installDragGamepad, installHoldWatch, type StripPress } from '../keyboard/stripPress';
import type { KeyboardSession } from '../keyboard/session';
import { clearHeld, press, typeText, type TypingState } from '../keyboard/typing';
import { installKeyboardOutsideTap } from '../navigation';
import { MenuAction } from './MenuAction';

export type Layouts = { layouts: KeyboardLayout[]; current: number };
type Page = 'letters' | 'symbols';
type Point = { x: number; y: number };
/** The panel in the menu's own (unscaled) units, as on the canvas. */
const SIZE = { width: 409, height: 210 };
const HOLD_MS = 400;
const DRAG_SLOP = 4;

/** Steam's layouts, read once per call: every webpack module is offered to the finder; only `readLayouts` calls Steam. */
export function readSteamLayouts(): Layouts {
    const modules: Record<string, unknown>[] = [];
    try {
        findModule((m: unknown) => { if (m && (typeof m === 'object' || typeof m === 'function')) modules.push(m as Record<string, unknown>); return false; });
    } catch { /* the cache could not be walked: QWERTY */ }
    // Once per plugin load, with the first layouts read, so no lift walks webpack.
    if (axesFeed === undefined) axesFeed = findAxesFeed();
    return readLayouts(findSteamLayoutSource(modules));
}

type Axes = { LeftJoystick?: { x?: number; y?: number } };
type AxesFeed = (controller: number) => Axes | undefined;
/** Steam's controller axes hook (module 35137 today; its chat radial menu uses it), found by its source text only.
 * Calling it starts Steam's controller state flow; unmounting the caller ends it. */
export function findAxesFeed(lookup: (filter: (value: unknown) => boolean) => unknown = findModuleExport): AxesFeed | null {
    try {
        const hook = lookup(value => {
            try { return typeof value === 'function' && value.toString().includes('useControllerAxesFeed'); } catch { return false; }
        });
        return typeof hook === 'function' ? hook as AxesFeed : null;
    } catch { return null; }
}
let axesFeed: AxesFeed | null | undefined;
/** The feed found by the first layouts read: undefined before it, null when Steam has none. */
export const currentAxesFeed = () => axesFeed;

/** Mounted only while the panel is lifted by A: reads the left stick each frame and moves the panel by its speed. */
function StickFeed({ feed, view, move, busy }: { feed: AxesFeed; view: Window; move(delta: Point): void; busy(on: boolean): void }) {
    // Read each frame, in case Steam updates the returned object in place rather than re-rendering.
    const axes = useRef<Axes | undefined>(undefined);
    axes.current = feed(0);
    const live = useRef({ move, busy });
    live.current = { move, busy };
    useEffect(() => {
        // The menu's own window: frames of the hidden plugin context may not run.
        let frame = 0, last = view.performance.now();
        const tick = (now: number) => {
            const left = axes.current?.LeftJoystick, raw = { x: Number(left?.x ?? 0), y: Number(left?.y ?? 0) };
            const seconds = Math.min(.1, Math.max(0, (now - last) / 1000));
            last = now;
            const pushed = stickVelocity(normaliseAxis(raw.x), normaliseAxis(raw.y));
            live.current.busy(pushed.x !== 0 || pushed.y !== 0);
            const step = stickStep(raw, seconds);
            if (step.x || step.y) live.current.move(step);
            frame = view.requestAnimationFrame(tick);
        };
        frame = view.requestAnimationFrame(tick);
        return () => { view.cancelAnimationFrame(frame); live.current.busy(false); };
    }, []);
    return null;
}
/** A feed that throws leaves the stick to its direction events (d-pad steps) for the rest of the session. */
class FeedGuard extends Component<{ children: ReactNode; failed(): void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { axesFeed = null; this.props.failed(); }
    render() { return this.state.failed ? null : this.props.children; }
}

/** The next layout the keyboard can type (input-method layouts keep Steam's keyboard), or the same one. */
export function nextLayout(layouts: KeyboardLayout[], index: number): number {
    for (let step = 1; step < layouts.length; step++) {
        const next = (index + step) % layouts.length;
        if (!layouts[next].ime) return next;
    }
    return index;
}

/** What a physical key does to the draft: null leaves the key to Steam. */
export function physicalKey(state: TypingState, event: KeyboardEvent, canSend: boolean): { state?: TypingState; send?: true } | null {
    if (event.ctrlKey || event.metaKey || event.altKey) return null;
    if (event.key === 'Enter') return canSend ? { send: true } : {};
    if (event.key === 'Backspace') return { state: press(state, { char: '⌫', kind: 'backspace' }) };
    // Named keys (ArrowLeft, Tab, Shift) are longer than one character.
    if (Array.from(event.key).length === 1) return { state: typeText(clearHeld(state), event.key) };
    return null;
}

const EDITABLE = 'input, textarea, [contenteditable]:not([contenteditable="false"])';
/** Listens before Steam's own window handlers (capture), and a handled key goes no further. A key being composed by an
 * input method, or typed into an editable element, is left alone. */
export function installPhysicalKeys(view: Window, handle: (event: KeyboardEvent) => boolean): () => void {
    const onKey = (event: KeyboardEvent) => {
        if (event.isComposing || (event.target as Element | null)?.closest?.(EDITABLE)) return;
        if (handle(event)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    view.addEventListener('keydown', onKey, { capture: true });
    return () => view.removeEventListener('keydown', onKey, { capture: true });
}

/** A viewport rectangle in the menu's own units: the menu is drawn scaled from its box at `origin`. */
export const toMenuRect = (box: { left: number; top: number; width: number; height: number }, origin: { left: number; top: number }, scale: number): Rect =>
    ({ x: (box.left - origin.left) / scale, y: (box.top - origin.top) / scale, width: box.width / scale, height: box.height / scale });

const KIND_CLASS: Partial<Record<KeyDef['kind'], string>> = {
    shift: ' gg-keyboard-mod gg-keyboard-wide', backspace: ' gg-keyboard-mod gg-keyboard-wide',
    page: ' gg-keyboard-mod gg-keyboard-side gg-keyboard-small', send: ' gg-keyboard-send gg-keyboard-side', space: ' gg-keyboard-space gg-keyboard-small',
};
function ariaOf(k: KeyDef): string | undefined {
    switch (k.kind) {
        case 'shift': return 'Shift';
        case 'backspace': return 'Backspace';
        case 'page': return k.char === 'ABC' ? 'Letters' : 'Numbers and symbols';
        case 'send': return 'Send';
        case 'space': return k.hint ? `Space, ${k.hint}` : 'Space';
    }
    return k.dead ? `${k.char} accent` : undefined;
}
function labelOf(k: KeyDef, typing: TypingState): string {
    if (k.kind === 'space') return k.hint ?? '';
    if (k.kind === 'char' && typing.shift !== 'off' && /\p{L}/u.test(k.char)) return k.shifted ?? k.char.toUpperCase();
    return k.char;
}
const keyId = (row: number, col: number) => `keyboard:${row}:${col}`;
function keyAt(target: EventTarget | null): [number, number] | null {
    const id = (target as HTMLElement | null)?.closest?.<HTMLElement>('[data-gg-focus^="keyboard:"]')?.dataset.ggFocus;
    const match = id && /^keyboard:(\d+):(\d+)$/.exec(id);
    return match ? [Number(match[1]), Number(match[2])] : null;
}
/** Whether the pointer, now over `target`, has left the held key `id` (for another key or no key). */
export function slidOff(id: string, target: EventTarget | null): boolean {
    const at = keyAt(target);
    return !at || keyId(at[0], at[1]) !== id;
}

type Pad = { down(): void; up(): void; abort(): void };
type StripHandlers = { onPointerDown?(e: ReactPointerEvent<HTMLDivElement>): void; onPointerMove?(e: ReactPointerEvent<HTMLDivElement>): void; onPointerUp?(e: ReactPointerEvent<HTMLDivElement>): void; onPointerCancel?(e: ReactPointerEvent<HTMLDivElement>): void };
/** Rows differ in key count, so focus entering one keeps its horizontal position (Steam's MAINTAIN_X). */
const MAINTAIN_X = 2 as NavEntryPositionPreferences;

export interface KeyboardPanelProps {
    layout: KeyboardLayout; page: Page; typing: TypingState; canSend: boolean;
    position: Point | null; dragging: boolean; panelRef?: Ref<HTMLDivElement>;
    onKey(row: number, col: number): void; onMove(): void;
    hold: { start(row: number, col: number): void; stop(): void; over(target: EventTarget | null): void };
    strip: StripHandlers;
    /** A down and up on the strip: Steam's A acts on press, so the controller press decides on A up. */
    pad: Pad;
}

/** Stateless drawing of the panel: keys as menu buttons in a Focusable grid, the move strip below. */
export function KeyboardPanel({ layout, page, typing, canSend, position, dragging, panelRef, onKey, onMove, hold, strip, pad }: KeyboardPanelProps) {
    const rows = page === 'letters' ? layout.letters : layout.symbols;
    const startHold = (target: EventTarget | null) => { const at = keyAt(target); if (at) hold.start(at[0], at[1]); };
    return <div ref={panelRef} className={`gg-keyboard${dragging ? ' gg-keyboard-dragging' : ''}`} data-gg-frost-region="keyboard" role="group" aria-label="Keyboard"
        style={{ left: position?.x ?? 0, top: position?.y ?? 0, visibility: position ? undefined : 'hidden' }}>
        <Focusable flow-children="column">
        <Focusable className="gg-keyboard-keys" flow-children="column"
            onPointerDown={(e: ReactPointerEvent) => startHold(e.target)} onPointerUp={hold.stop} onPointerCancel={hold.stop} onPointerLeave={hold.stop}
            // A touch stays captured by the pressed key, so the element under the pointer tells when it slides off.
            onPointerMove={(e: ReactPointerEvent) => hold.over((e.currentTarget as HTMLElement).ownerDocument?.elementFromPoint?.(e.clientX, e.clientY) ?? e.target)}
            onButtonDown={(e: GamepadEvent) => { if (e.detail.button === 1) startHold(e.target); }} onButtonUp={hold.stop}>
            {rows.map((row, r) => <Focusable key={`${page}:${r}`} className="gg-keyboard-row" flow-children="row" navEntryPreferPosition={MAINTAIN_X}>
                {row.map((k, c) => <MenuAction key={c} id={keyId(r, c)} className={`gg-keyboard-key${KIND_CLASS[k.kind] ?? ''}`} ariaLabel={ariaOf(k)}
                    selected={k.kind === 'shift' ? typing.shift !== 'off' : k.dead ? typing.held?.char === k.char : undefined}
                    disabled={k.kind === 'send' && !canSend} onAction={() => onKey(r, c)}>
                    {labelOf(k, typing)}{k.hint && k.kind !== 'space' && <span className="gg-keyboard-hint" aria-hidden="true">{k.hint}</span>}
                </MenuAction>)}
            </Focusable>)}
        </Focusable>
        <Focusable className="gg-keyboard-strip" data-gg-keyboard-strip="" {...strip}
            onButtonDown={(e: GamepadEvent) => { if (e.detail.button === 1) pad.down(); }} onButtonUp={(e: GamepadEvent) => { if (e.detail.button === 1) pad.up(); }}
            onGamepadBlur={pad.abort} onBlur={pad.abort}>
            <MenuAction id="keyboard:move" className="gg-keyboard-move" ariaLabel="Move keyboard" onAction={onMove}><span className="gg-keyboard-grab" aria-hidden="true" /><LuMove aria-hidden="true" />
                <span className="gg-keyboard-strip-label" aria-hidden="true"><span className="gg-keyboard-badge">A</span>Hold to move</span></MenuAction>
        </Focusable>
        </Focusable>
    </div>;
}

/** The Social chat's own keyboard, floating in the menu while the session is open. */
export function MenuKeyboard({ session, layouts, draft, setDraft, canSend, send, field }: { session: KeyboardSession; layouts: Layouts; draft: string; setDraft(text: string): void; canSend: boolean; send(): void; field: () => HTMLElement | null }) {
    const open = useSyncExternalStore(session.subscribe, session.get).open;
    const [typing, setTyping] = useState<TypingState>({ text: draft, shift: 'off', held: null });
    const [page, setPage] = useState<Page>('letters');
    const [index, setIndex] = useState(layouts.current);
    const [position, setPosition] = useState<Point | null>(null);
    const [dragging, setDragging] = useState(false);
    // Lifted by holding A: the stick feed and the drag's gamepad listeners live exactly as long as this.
    const [padDrag, setPadDrag] = useState(false);
    const [feedFailed, setFeedFailed] = useState(false);
    const [host, setHost] = useState<HTMLElement | null>(null);
    const panel = useRef<HTMLDivElement>(null);
    // While a drag moves the panel outside React, a render (the lift, a new message) must not put back the old position.
    const moving = useRef(false);
    const live = useRef({ typing, draft, canSend, send, setDraft, layouts, index, position });
    live.current = { typing, draft, canSend, send, setDraft, layouts, index, position: moving.current ? live.current.position : position };
    const spot = useRef<Spot | null>(null);
    const holding = useRef<{ timer: ReturnType<typeof setTimeout>; id: string; at: number } | null>(null);
    const lastTyped = useRef<{ id: string; before: TypingState; at: number } | null>(null);
    // A hold that typed its hint swallows the click that ends the same press (touch release, or A if Steam acts on release).
    const skipAction = useRef<{ id: string; stopped: number | null } | null>(null);
    const drag = useRef<{ pointer: number; x: number; y: number; from: Point; scale: number; view: Rect; moved: boolean } | null>(null);
    const dragEnded = useRef(0);
    const padFrame = useRef<{ scale: number; view: Rect } | null>(null);
    const stickBusy = useRef(false);
    const padActions = useRef({ cycle: () => {}, lift: () => {}, drop: () => {}, held: (_pending: boolean) => {} });
    // Document listeners of the controller press: while a hold is pending, and from the lift until the drop.
    const padListen = useRef<{ hold: (() => void) | null; drag: (() => void) | null }>({ hold: null, drag: null });
    const stopListening = (which: 'hold' | 'drag') => { padListen.current[which]?.(); padListen.current[which] = null; };
    const stripPress = useRef<StripPress | null>(null);
    stripPress.current ??= createStripPress({ cycle: () => padActions.current.cycle(), lift: () => padActions.current.lift(), drop: () => padActions.current.drop(), held: on => padActions.current.held(on) });
    const layout = layouts.layouts[index] ?? layouts.layouts[0];

    const apply = (next: TypingState) => {
        live.current.typing = next; setTyping(next);
        if (next.text !== live.current.draft) live.current.setDraft(next.text);
    };
    // Sending (or another chat) changes the draft from outside: start again from it, dropping a held accent.
    useEffect(() => { if (draft !== live.current.typing.text) apply({ ...clearHeld(live.current.typing), text: draft }); }, [draft]);

    /** The menu root, its scale and the rectangles the placement needs, in the menu's own units. */
    const geometry = () => {
        const element = field(), root = element?.closest<HTMLElement>('.gg-menu'), view = root?.ownerDocument.defaultView;
        if (!element || !root || !view) return null;
        const box = root.getBoundingClientRect(), scale = box.width / root.offsetWidth || 1;
        const menuRect = (r: { left: number; top: number; width: number; height: number }) => toMenuRect(r, box, scale);
        return { scale, view: menuRect({ left: 0, top: 0, width: view.innerWidth, height: view.innerHeight }),
            menu: menuRect((element.closest<HTMLElement>('.gg-menu-panel') ?? root).getBoundingClientRect()), field: menuRect(element.getBoundingClientRect()) };
    };
    const place = (p: Point) => { live.current.position = p; setPosition(p); };

    // Each opening starts clean on the current layout, at the remembered place.
    useLayoutEffect(() => {
        if (!open) return;
        setTyping(t => ({ ...clearHeld(t), shift: 'off' })); setPage('letters'); setIndex(live.current.layouts.current); setPosition(null); setDragging(false);
        setHost(field()?.closest<HTMLElement>('.gg-menu') ?? null);
        let alive = true;
        void loadPosition(backendKv).then(saved => {
            const g = alive && geometry();
            if (!g) return;
            spot.current = saved && 'spot' in saved ? saved.spot : saved ? null : 'left';
            place(spot.current ? spotPosition(spot.current, g.view, g.menu, g.field, SIZE) : settle(saved as Point, g.view, g.field, SIZE));
        });
        return () => {
            alive = false;
            if (holding.current) clearTimeout(holding.current.timer);
            holding.current = null; drag.current = null;
            // A drag cut short by closing ends without a drop: nothing is saved.
            stripPress.current?.dispose(); stopListening('hold'); stopListening('drag');
            padFrame.current = null; stickBusy.current = false; moving.current = false; setPadDrag(false); setDragging(false);
            // Closed with B or a tap while the chat still shows: the field takes focus back from the vanished keys.
            const element = field(), doc = element?.ownerDocument;
            doc?.defaultView?.requestAnimationFrame(() => {
                const active = doc?.activeElement;
                if (!element?.isConnected || active && active !== doc.body && !panel.current?.contains(active)) return;
                const target = element.matches('button') ? element : element.querySelector<HTMLElement>('button') ?? element;
                target.focus({ preventScroll: true }); takeSteamFocus(target);
            });
        };
    }, [open]);

    // The first key takes focus once the panel is placed.
    const placed = open && !!position && !!host;
    useEffect(() => {
        if (!placed) return;
        const first = panel.current?.querySelector<HTMLElement>('button');
        if (first && !panel.current!.contains(first.ownerDocument.activeElement)) { first.focus({ preventScroll: true }); takeSteamFocus(first); }
    }, [placed]);

    // Frost for what the menu's shader cannot blur: the columns under the panel, after every placement; none while dragged.
    useLayoutEffect(() => {
        const view = host?.ownerDocument.defaultView;
        if (!placed || !host || !panel.current || !view) return;
        return followUnderKeyboard(host, panel.current, view, dragging);
    }, [placed, host, position, dragging]);

    useEffect(() => {
        const view = host?.ownerDocument.defaultView;
        if (!open || !view) return;
        const removeTap = installKeyboardOutsideTap(view, () => [panel.current, field()].filter((e): e is HTMLElement => !!e), session.close);
        const removeKeys = installPhysicalKeys(view, event => {
            const { typing: t, canSend: can, send: go } = live.current;
            const result = physicalKey(t, event, can);
            if (!result) return false;
            if (result.state) apply(result.state);
            if (result.send) go();
            return true;
        });
        return () => { removeTap(); removeKeys(); };
    }, [open, host, session]);

    const rowsOf = () => page === 'letters' ? layout.letters : layout.symbols;
    const onKey = (row: number, col: number) => {
        const id = keyId(row, col), k = rowsOf()[row]?.[col];
        const skip = skipAction.current;
        if (skip?.id === id && (skip.stopped === null || Date.now() - skip.stopped < 150)) { skipAction.current = null; return; }
        if (!k) return;
        if (k.kind === 'page') { apply(clearHeld(live.current.typing)); setPage(page === 'letters' ? 'symbols' : 'letters'); return; }
        if (k.kind === 'send') { if (live.current.canSend) live.current.send(); return; }
        const before = live.current.typing;
        lastTyped.current = { id, before, at: Date.now() };
        apply(press(before, k));
    };
    // Held 400 ms: a digit hint types its digit, the space bar goes to the next layout. Whatever this press already
    // typed (Steam's A acts on press) is taken back first, so a hold never types both.
    const hold = {
        start(row: number, col: number) {
            hold.stop(); skipAction.current = null;
            const id = keyId(row, col), k = rowsOf()[row]?.[col];
            // With one layout the space bar has nothing to switch to, so its hold must not swallow the space.
            if (!k?.hint || k.kind === 'space' && nextLayout(live.current.layouts.layouts, live.current.index) === live.current.index) return;
            const at = Date.now();
            holding.current = { id, at, timer: setTimeout(() => {
                holding.current = null; skipAction.current = { id, stopped: null };
                const last = lastTyped.current, base = last && last.id === id && last.at >= at - 100 ? last.before : live.current.typing;
                lastTyped.current = null;
                if (k.kind === 'space') {
                    apply(clearHeld(base)); setIndex(nextLayout(live.current.layouts.layouts, live.current.index));
                } else apply(press(base, { char: k.hint!, kind: 'char' }));
            }, HOLD_MS) };
        },
        stop() {
            if (holding.current) clearTimeout(holding.current.timer);
            holding.current = null;
            if (skipAction.current && skipAction.current.stopped === null) skipAction.current.stopped = Date.now();
        },
        // Sliding off the pressed key types nothing: its hold stops.
        over(target: EventTarget | null) { if (holding.current && slidOff(holding.current.id, target)) hold.stop(); },
    };
    const onMove = () => {
        if (Date.now() - dragEnded.current < 300) return;
        const g = geometry();
        if (!g) return;
        const next = SPOTS[(SPOTS.indexOf(spot.current ?? SPOTS[SPOTS.length - 1]) + 1) % SPOTS.length];
        spot.current = next;
        place(spotPosition(next, g.view, g.menu, g.field, SIZE));
        void savePosition(backendKv, { spot: next });
    };
    /** Where a drag lets go, by finger or by A: clamped, clear of the field, remembered. */
    // Drag frames move the panel without React (movePanel); the drop commits the position to state once.
    const finishDrag = () => {
        dragEnded.current = Date.now();
        const g = geometry(), at = live.current.position;
        moving.current = false;
        if (!at) return;
        const p = g ? settle(at, g.view, g.field, SIZE) : at;
        movePanel(panel.current, live.current, p); place(p);
        if (!g) return;
        spot.current = null;
        void savePosition(backendKv, p);
    };
    const padMove = (delta: Point) => {
        const f = padFrame.current, at = live.current.position;
        if (f && at) movePanel(panel.current, live.current, dragPosition(at, delta, f.scale, f.view, SIZE));
    };
    padActions.current = {
        cycle: onMove,
        held(pending) {
            stopListening('hold');
            const doc = host?.ownerDocument;
            if (pending && doc) padListen.current.hold = installHoldWatch(doc, () => stripPress.current!.abort());
        },
        lift() {
            const g = geometry();
            padFrame.current = g && { scale: g.scale, view: g.view };
            // Installed now, not after a render, so the A up that ends the drag is never missed.
            const doc = host?.ownerDocument;
            stopListening('drag');
            if (doc) padListen.current.drag = installDragGamepad(doc, { nudge: padMove, cancel: () => stripPress.current!.cancel(), release: () => stripPress.current!.buttonUp(), stickBusy: () => stickBusy.current });
            moving.current = true; setDragging(true); setPadDrag(true);
        },
        drop() {
            const lifted = !!padFrame.current;
            stopListening('drag');
            padFrame.current = null; stickBusy.current = false; moving.current = false;
            setPadDrag(false); setDragging(false);
            if (lifted) finishDrag(); else dragEnded.current = Date.now();
        },
    };
    const strip: StripHandlers = {
        onPointerDown(e) {
            const g = geometry(), from = live.current.position;
            if (!g || !from) return;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, from, scale: g.scale, view: g.view, moved: false };
        },
        onPointerMove(e) {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
            if (!d.moved) { d.moved = true; moving.current = true; setDragging(true); }
            // Kept inside the view while dragging (an area past the edge would cost the menu its frost); the release clears the field.
            movePanel(panel.current, live.current, dragPosition(d.from, { x: dx, y: dy }, d.scale, d.view, SIZE));
        },
        onPointerUp(e) {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            drag.current = null; setDragging(false);
            if (d.moved) finishDrag();
        },
        onPointerCancel(e) { strip.onPointerUp?.(e); },
    };

    if (!open || !host || !layout) return null;
    const feed = padDrag && !feedFailed ? axesFeed : null, view = host.ownerDocument.defaultView;
    return createPortal(<>
        <KeyboardPanel layout={layout} page={page} typing={typing} canSend={canSend} position={position} dragging={dragging} panelRef={panel}
            onKey={onKey} onMove={stripPress.current.action} hold={hold} strip={strip} pad={{ down: stripPress.current.buttonDown, up: stripPress.current.buttonUp, abort: stripPress.current.abort }} />
        {feed && view && <FeedGuard failed={() => setFeedFailed(true)}><StickFeed feed={feed} view={view} move={padMove} busy={on => { stickBusy.current = on; }} /></FeedGuard>}
    </>, host);
}
