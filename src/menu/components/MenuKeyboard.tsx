import { Focusable, findModule, type GamepadEvent } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { LuMove } from 'react-icons/lu';
import { backendKv } from '../../data/kv';
import { takeSteamFocus } from '../../home/steamFocus';
import { findSteamLayoutSource, readLayouts, type KeyboardLayout, type KeyDef } from '../keyboard/layouts';
import { loadPosition, savePosition, settle, spotPosition, SPOTS, type Rect, type Spot } from '../keyboard/placement';
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
    return readLayouts(findSteamLayoutSource(modules));
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

export function installPhysicalKeys(view: Window, handle: (event: KeyboardEvent) => boolean): () => void {
    const onKey = (event: KeyboardEvent) => { if (handle(event)) { event.preventDefault(); event.stopPropagation(); } };
    view.addEventListener('keydown', onKey);
    return () => view.removeEventListener('keydown', onKey);
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

type StripHandlers = { onPointerDown?(e: ReactPointerEvent<HTMLDivElement>): void; onPointerMove?(e: ReactPointerEvent<HTMLDivElement>): void; onPointerUp?(e: ReactPointerEvent<HTMLDivElement>): void; onPointerCancel?(e: ReactPointerEvent<HTMLDivElement>): void };
export interface KeyboardPanelProps {
    layout: KeyboardLayout; page: Page; typing: TypingState; canSend: boolean;
    position: Point | null; dragging: boolean; panelRef?: Ref<HTMLDivElement>;
    onKey(row: number, col: number): void; onMove(): void;
    hold: { start(row: number, col: number): void; stop(): void };
    strip: StripHandlers;
}

/** Stateless drawing of the panel: keys as menu buttons in a Focusable grid, the move strip below. */
export function KeyboardPanel({ layout, page, typing, canSend, position, dragging, panelRef, onKey, onMove, hold, strip }: KeyboardPanelProps) {
    const rows = page === 'letters' ? layout.letters : layout.symbols;
    const startHold = (target: EventTarget | null) => { const at = keyAt(target); if (at) hold.start(at[0], at[1]); };
    return <div ref={panelRef} className={`gg-keyboard${dragging ? ' gg-keyboard-dragging' : ''}`} data-gg-frost-region="keyboard" role="group" aria-label="Keyboard"
        style={{ left: position?.x ?? 0, top: position?.y ?? 0, visibility: position ? undefined : 'hidden' }}>
        <Focusable className="gg-keyboard-keys" flow-children="column"
            onPointerDown={(e: ReactPointerEvent) => startHold(e.target)} onPointerUp={hold.stop} onPointerCancel={hold.stop} onPointerLeave={hold.stop}
            onButtonDown={(e: GamepadEvent) => { if (e.detail.button === 1) startHold(e.target); }} onButtonUp={hold.stop}>
            {rows.map((row, r) => <Focusable key={`${page}:${r}`} className="gg-keyboard-row" flow-children="row">
                {row.map((k, c) => <MenuAction key={c} id={keyId(r, c)} className={`gg-keyboard-key${KIND_CLASS[k.kind] ?? ''}`} ariaLabel={ariaOf(k)}
                    selected={k.kind === 'shift' ? typing.shift !== 'off' : k.dead ? typing.held?.char === k.char : undefined}
                    disabled={k.kind === 'send' && !canSend} onAction={() => onKey(r, c)}>
                    {labelOf(k, typing)}{k.hint && k.kind !== 'space' && <span className="gg-keyboard-hint" aria-hidden="true">{k.hint}</span>}
                </MenuAction>)}
            </Focusable>)}
        </Focusable>
        <div className="gg-keyboard-strip" data-gg-keyboard-strip="" {...strip}>
            <MenuAction id="keyboard:move" className="gg-keyboard-move" ariaLabel="Move keyboard" onAction={onMove}><span className="gg-keyboard-grab" aria-hidden="true" /><LuMove aria-hidden="true" /></MenuAction>
        </div>
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
    const [host, setHost] = useState<HTMLElement | null>(null);
    const panel = useRef<HTMLDivElement>(null);
    const live = useRef({ typing, draft, canSend, send, setDraft, layouts, index, position });
    live.current = { typing, draft, canSend, send, setDraft, layouts, index, position };
    const spot = useRef<Spot | null>(null);
    const holding = useRef<{ timer: ReturnType<typeof setTimeout>; id: string; at: number } | null>(null);
    const lastTyped = useRef<{ id: string; before: TypingState; at: number } | null>(null);
    // A hold that typed its hint swallows the click that ends the same press (touch release, or A if Steam acts on release).
    const skipAction = useRef<{ id: string; stopped: number | null } | null>(null);
    const drag = useRef<{ pointer: number; x: number; y: number; from: Point; scale: number; moved: boolean } | null>(null);
    const dragEnded = useRef(0);
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
    const strip: StripHandlers = {
        onPointerDown(e) {
            const g = geometry(), from = live.current.position;
            if (!g || !from) return;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, from, scale: g.scale, moved: false };
        },
        onPointerMove(e) {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
            if (!d.moved) { d.moved = true; setDragging(true); }
            place({ x: d.from.x + dx / d.scale, y: d.from.y + dy / d.scale });
        },
        onPointerUp(e) {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            drag.current = null; setDragging(false);
            if (!d.moved) return;
            dragEnded.current = Date.now();
            const g = geometry(), at = live.current.position;
            if (!g || !at) return;
            const p = settle(at, g.view, g.field, SIZE);
            spot.current = null; place(p);
            void savePosition(backendKv, p);
        },
        onPointerCancel(e) { strip.onPointerUp?.(e); },
    };

    if (!open || !host || !layout) return null;
    return createPortal(<KeyboardPanel layout={layout} page={page} typing={typing} canSend={canSend} position={position} dragging={dragging} panelRef={panel}
        onKey={onKey} onMove={onMove} hold={hold} strip={strip} />, host);
}
