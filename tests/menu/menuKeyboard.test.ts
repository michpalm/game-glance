import { type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_QWERTY, compactLayout, type KeyboardLayout } from '../../src/menu/keyboard/layouts';
import type { TypingState } from '../../src/menu/keyboard/typing';
import { SPANISH_ROWS } from './keyboard/spanish.fixture';

const webpack = vi.hoisted(() => ({ modules: [] as unknown[] }));
vi.mock('@decky/ui', () => ({
    Focusable: 'div', DialogButton: 'button', TextField: 'input',
    // Decky's findModule: tries each module (default export first) until the filter says true.
    findModule: (filter: (m: unknown) => boolean) => {
        for (const m of webpack.modules) {
            const d = (m as { default?: unknown }).default;
            if (d && filter(d)) return d;
            if (filter(m)) return m;
        }
    },
}));
const { KeyboardPanel, installPhysicalKeys, nextLayout, physicalKey, readSteamLayouts, slidOff, toMenuRect } = await import('../../src/menu/components/MenuKeyboard');

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const spanish = compactLayout({ name: 'spanish', layout: 19, rgLayout: () => SPANISH_ROWS })!;
const idle: TypingState = { text: '', shift: 'off', held: null };
function panel(layout: KeyboardLayout = spanish, change: Record<string, unknown> = {}) {
    const onKey = vi.fn(), onMove = vi.fn();
    const nodes = tree(KeyboardPanel({ layout, page: 'letters', typing: idle, canSend: true, position: { x: 10, y: 20 }, dragging: false, onKey, onMove,
        hold: { start: vi.fn(), stop: vi.fn(), over: vi.fn() }, strip: {}, ...change }));
    const keys = nodes.filter(n => typeof n.props.id === 'string' && /^keyboard:\d+:\d+$/.test(n.props.id));
    const rows = nodes.filter(n => n.props.className === 'gg-keyboard-row').map(row => tree(row.props.children).filter(n => keys.includes(n)));
    return { nodes, keys, rows, onKey, onMove };
}

describe('reading the layouts', () => {
    const fake = <T extends (...a: never[]) => unknown>(fn: T, text: string): T => Object.assign(fn, { toString: () => text });
    beforeEach(() => { webpack.modules = []; });
    it('walks every webpack module once and reads Steam’s layouts from them', () => {
        const entries = [{ name: 'spanish', layout: 19, rgLayout: () => SPANISH_ROWS }];
        const all = fake(() => entries, '() => GetKeyboardLayoutSettings().selectedLayouts.filter(x => x)');
        const seen = vi.fn(() => ({}));
        webpack.modules = [{ unrelated: 1 }, { default: { a: all } }, { get other() { return seen(); } }];
        const read = readSteamLayouts();
        expect(read.layouts.map(l => l.short)).toEqual(['ES']);
        expect(seen).toHaveBeenCalledTimes(1);
    });
    it('falls back to the built-in QWERTY when nothing matches', () => {
        webpack.modules = [{ a: 1 }];
        expect(readSteamLayouts().layouts).toEqual([BUILTIN_QWERTY]);
    });
});

describe('the keyboard panel', () => {
    it('is a frost area at its position, with the move strip at the bottom', () => {
        const { nodes } = panel();
        const root = nodes[0];
        expect(root.props['data-gg-frost-region']).toBe('keyboard');
        expect(root.props.style).toMatchObject({ left: 10, top: 20 });
        expect(nodes.some(n => n.props['data-gg-keyboard-strip'] !== undefined)).toBe(true);
        expect(nodes.find(n => n.props.id === 'keyboard:move')).toBeDefined();
    });
    it('stays hidden until it has a position', () => {
        expect(panel(spanish, { position: null }).nodes[0].props.style.visibility).toBe('hidden');
    });
    it('draws the compacted rows as menu buttons: eleven keys in Spanish row one, the bottom row as on the canvas', () => {
        const { rows } = panel();
        expect(rows).toHaveLength(4);
        expect(rows[0]).toHaveLength(11);
        expect(rows[0].map(k => k.props.className)).toEqual(Array(11).fill('gg-keyboard-key'));
        expect(rows[3].map(k => k.props.ariaLabel)).toEqual(['Numbers and symbols', undefined, '´ accent', 'Space, ES', undefined, 'Send']);
        const q = tree(rows[0][0].props.children);
        expect(q.find(n => n.props.className === 'gg-keyboard-hint')?.props.children).toBe('1');
    });
    it('shows capitals while shift is on, and marks shift and a held accent', () => {
        const acute = spanish.letters[3][2];
        const { rows } = panel(spanish, { typing: { text: '', shift: 'once', held: acute } });
        expect([rows[0][0].props.children].flat()[0]).toBe('Q');
        expect(rows[2][0].props.selected).toBe(true);
        expect(rows[3][2].props.selected).toBe(true);
    });
    it('disables ✓ exactly when it cannot send', () => {
        const send = (canSend: boolean) => panel(spanish, { canSend }).rows[3][5];
        expect(send(true).props.disabled).toBe(false);
        expect(send(false).props.disabled).toBe(true);
    });
    it('puts the move button and the keys grid in one column Focusable, grid first', () => {
        const { nodes } = panel();
        const move = nodes.find(n => n.props.id === 'keyboard:move')!;
        const grid = nodes.find(n => n.props.className === 'gg-keyboard-keys')!;
        const parent = nodes.find(n => n.props['flow-children'] === 'column' && n !== grid && tree(n.props.children).includes(move) && tree(n.props.children).includes(grid))!;
        expect(parent).toBeDefined();
        const kids = (Array.isArray(parent.props.children) ? parent.props.children : [parent.props.children]).filter(Boolean) as ReactElement<Record<string, any>>[];
        expect(kids[0]).toBe(grid);
        expect(kids[1].props['data-gg-keyboard-strip']).toBeDefined();
        expect(tree(kids[1]).includes(move)).toBe(true);
    });
    it('makes every row keep the horizontal position when focus enters it', () => {
        const { nodes } = panel();
        const rows = nodes.filter(n => n.props.className === 'gg-keyboard-row');
        expect(rows).toHaveLength(4);
        for (const row of rows) expect(row.props.navEntryPreferPosition).toBe(2);
    });
    it('types on the key’s own action and moves on the strip’s', () => {
        const { rows, onKey, nodes, onMove } = panel();
        rows[1][3].props.onAction(); expect(onKey).toHaveBeenCalledWith(1, 3);
        nodes.find(n => n.props.id === 'keyboard:move')!.props.onAction(); expect(onMove).toHaveBeenCalledOnce();
    });
    it('draws the symbols page', () => {
        const { rows } = panel(BUILTIN_QWERTY, { page: 'symbols' });
        expect(rows[0].map(k => [k.props.children].flat()[0])).toEqual([...'1234567890']);
        expect(rows[3][0].props.ariaLabel).toBe('Letters');
    });
});

describe('holding a key', () => {
    const keyEl = (id: string) => ({ closest: (sel: string) => sel.includes('keyboard:') ? { dataset: { ggFocus: id } } : null });
    // Pressing q, sliding to w and holding must type nothing: the hold belongs to the pressed key only.
    it('counts sliding to another key, or off every key, as leaving the held key', () => {
        expect(slidOff('keyboard:0:0', keyEl('keyboard:0:1') as unknown as EventTarget)).toBe(true);
        expect(slidOff('keyboard:0:0', { closest: () => null } as unknown as EventTarget)).toBe(true);
        expect(slidOff('keyboard:0:0', null)).toBe(true);
        expect(slidOff('keyboard:0:0', keyEl('keyboard:0:0') as unknown as EventTarget)).toBe(false);
    });
    it('reports the element under a moving pointer to the hold, not the press target', () => {
        const hold = { start: vi.fn(), stop: vi.fn(), over: vi.fn() };
        const { nodes } = panel(spanish, { hold });
        const grid = nodes.find(n => n.props.className === 'gg-keyboard-keys')!;
        const w = keyEl('keyboard:0:1'), q = keyEl('keyboard:0:0');
        const elementFromPoint = vi.fn(() => w);
        grid.props.onPointerMove({ clientX: 30, clientY: 40, target: q, currentTarget: { ownerDocument: { elementFromPoint } } });
        expect(elementFromPoint).toHaveBeenCalledWith(30, 40);
        expect(hold.over).toHaveBeenCalledWith(w);
    });
});

describe('switching layouts', () => {
    const qwerty = BUILTIN_QWERTY, ime: KeyboardLayout = { ...BUILTIN_QWERTY, id: 30, name: 'japanese', ime: true };
    it('goes to the next layout, skipping input-method ones, and stays when there is only one', () => {
        expect(nextLayout([spanish, qwerty], 0)).toBe(1);
        expect(nextLayout([spanish, qwerty], 1)).toBe(0);
        expect(nextLayout([spanish, ime, qwerty], 0)).toBe(2);
        expect(nextLayout([spanish], 0)).toBe(0);
    });
});

describe('a physical keyboard', () => {
    const key = (k: string, more: Partial<KeyboardEvent> = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...more }) as KeyboardEvent;
    it('types printable keys and removes with Backspace', () => {
        expect(physicalKey({ ...idle, text: 'hol' }, key('a'), false)).toEqual({ state: { ...idle, text: 'hola' } });
        expect(physicalKey({ ...idle, text: 'está' }, key('Backspace'), false)).toEqual({ state: { ...idle, text: 'est' } });
        expect(physicalKey(idle, key('ñ'), false)?.state?.text).toBe('ñ');
    });
    it('sends on Enter only when it can', () => {
        expect(physicalKey({ ...idle, text: 'hola' }, key('Enter'), true)).toEqual({ send: true });
        expect(physicalKey({ ...idle, text: 'hola' }, key('Enter'), false)).toEqual({});
    });
    it('leaves shortcuts and other keys alone', () => {
        expect(physicalKey(idle, key('c', { ctrlKey: true }), true)).toBeNull();
        expect(physicalKey(idle, key('ArrowLeft'), true)).toBeNull();
        expect(physicalKey(idle, key('Tab'), true)).toBeNull();
    });
    it('listens on the window until removed, and stops handled keys there', () => {
        const view = new EventTarget() as unknown as Window, seen = vi.fn(() => true);
        const remove = installPhysicalKeys(view, seen);
        const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'a' });
        view.dispatchEvent(event);
        expect(seen).toHaveBeenCalledOnce(); expect(event.defaultPrevented).toBe(true);
        remove(); view.dispatchEvent(Object.assign(new Event('keydown'), { key: 'b' }));
        expect(seen).toHaveBeenCalledOnce();
    });
    // Steam's own keydown handlers on the window must not also act on a key the draft took.
    it('listens in the capture phase and stops handled keys before any other listener', () => {
        const view = new EventTarget() as unknown as Window, add = vi.spyOn(view, 'addEventListener'), drop = vi.spyOn(view, 'removeEventListener');
        const remove = installPhysicalKeys(view, () => true);
        expect(add).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: true });
        const later = vi.fn(); view.addEventListener('keydown', later);
        view.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'a' }));
        expect(later).not.toHaveBeenCalled();
        remove();
        expect(drop).toHaveBeenCalledWith('keydown', add.mock.calls[0][1], { capture: true });
        const unhandled = new EventTarget() as unknown as Window, after = vi.fn();
        installPhysicalKeys(unhandled, () => false); unhandled.addEventListener('keydown', after);
        unhandled.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'x' }));
        expect(after).toHaveBeenCalledOnce();
    });
    it('leaves composing keys and keys typed into an editable element alone', () => {
        let listener: ((e: KeyboardEvent) => void) | undefined;
        const view = { addEventListener: (_: string, fn: (e: KeyboardEvent) => void) => { listener = fn; }, removeEventListener: vi.fn() } as unknown as Window;
        const seen = vi.fn(() => true);
        installPhysicalKeys(view, seen);
        const fire = (more: Record<string, unknown>) => {
            const e = { key: 'a', isComposing: false, target: null, preventDefault: vi.fn(), stopPropagation: vi.fn(), stopImmediatePropagation: vi.fn(), ...more };
            listener!(e as unknown as KeyboardEvent); return e;
        };
        const editable = (sel: string) => ({ closest: (s: string) => s.includes(sel) ? {} : null });
        for (const target of [editable('input'), editable('textarea'), editable('[contenteditable')]) {
            const e = fire({ target });
            expect(e.preventDefault).not.toHaveBeenCalled(); expect(e.stopImmediatePropagation).not.toHaveBeenCalled();
        }
        fire({ isComposing: true });
        expect(seen).not.toHaveBeenCalled();
        const plain = fire({ target: { closest: () => null } });
        expect(seen).toHaveBeenCalledOnce(); expect(plain.preventDefault).toHaveBeenCalled(); expect(plain.stopImmediatePropagation).toHaveBeenCalled();
    });
});

describe('menu coordinates', () => {
    it('turns a scaled viewport rectangle into the menu’s own units', () => {
        // The menu box sits at (100, 50) and is drawn at half size.
        expect(toMenuRect({ left: 150, top: 70, width: 40, height: 20 }, { left: 100, top: 50 }, .5)).toEqual({ x: 100, y: 40, width: 80, height: 40 });
    });
});
