import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findNavNode, keepSteamFocus, takeSteamFocus } from '../../src/home/steamFocus';

// Steam's gamepad navigation tree (FocusNavController, probed on the Ally): nodes with m_element and m_rgChildren.
const node = (el: unknown, children: unknown[] = []) => ({ m_element: el, m_rgChildren: children, BTakeFocus: vi.fn(() => true) });

describe('findNavNode', () => {
    it('finds the node whose element is the one asked for, depth first, across trees', () => {
        const a = {};
        const b = {};
        const target = node(b);
        const roots = [node({}, [node(a)]), node({}, [node({}, [target])])];
        expect(findNavNode(roots, b)).toBe(target);
        expect(findNavNode(roots, {})).toBeNull();
    });
    it('survives junk and stops at a depth limit', () => {
        expect(findNavNode([null, undefined, 7 as never, { m_rgChildren: 'x' } as never], {})).toBeNull();
        let deep = node('leaf');
        for (let i = 0; i < 200; i++) deep = node({}, [deep]);
        expect(findNavNode([deep], 'leaf')).toBeNull();
    });
});

describe('Home return focus settling', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function setup() {
        const el = { isConnected: true };
        const listeners = new Set<(event: { target: unknown }) => void>();
        const doc = { activeElement: el as unknown, hasFocus: vi.fn(() => true),
            addEventListener: (_name: string, listener: (event: { target: unknown }) => void) => listeners.add(listener),
            removeEventListener: (_name: string, listener: (event: { target: unknown }) => void) => listeners.delete(listener),
        };
        const root = { isConnected: true, ownerDocument: doc, contains: (target: unknown) => target === el, hasAttribute: vi.fn(() => false) };
        const target = node(el);
        let focused: ReturnType<typeof node> | null = target;
        target.BTakeFocus.mockImplementation(() => { focused = target; return true; });
        const context = { BIsGamepadInputSuppressed: vi.fn(() => false) };
        const tree = { m_Root: node({}, [target]), GetLastFocusedNode: () => focused };
        // Steam restores a missing node here, but consumes that initial press instead of returning its target.
        const original = vi.fn((_button: number, _source?: number, down?: boolean) => {
            if (!focused) { if (down) focused = target; return undefined; }
            return focused.m_element;
        });
        const controller = { GetActiveContext: () => context, GetActiveNavTree: () => tree, GetEventTarget: original };
        return { el, doc, root, target, tree, context, controller, listeners, original,
            clearFocus: () => { focused = null; },
            setFocus: (value: ReturnType<typeof node>) => { focused = value; },
            notify: () => listeners.forEach((listener) => listener({ target: doc.activeElement })),
        };
    }

    it('repairs focus lost immediately before dispatch so the SAME D-pad press receives its target', () => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        expect(f.target.BTakeFocus).not.toHaveBeenCalled();
        // REANIMAL Demo on the Ally: DOM focus is already on the row, but Steam has no focused node.
        f.clearFocus();
        expect(f.controller.GetEventTarget(11, 1, true)).toBe(f.el);
        expect(f.target.BTakeFocus).toHaveBeenCalledExactlyOnceWith(1);
        expect(f.original).toHaveBeenCalledExactlyOnceWith(11, 1, true);
        expect(f.tree.GetLastFocusedNode()).toBe(f.target);
        stop();
    });

    it('repairs a detached node and a subsequent silent reset without waiting for a timer', () => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.setFocus(node({ isConnected: false }));
        expect(f.controller.GetEventTarget(12, 1, true)).toBe(f.el);
        expect(f.target.BTakeFocus).toHaveBeenCalledTimes(1);
        f.clearFocus();
        expect(f.controller.GetEventTarget(11, 1, true)).toBe(f.el);
        expect(f.target.BTakeFocus).toHaveBeenCalledTimes(2);
        stop();
    });

    it('restores the remembered control when Steam also moves DOM focus to its neutral window container', () => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.clearFocus();
        f.doc.activeElement = { contains: (target: unknown) => target === f.root };
        expect(f.controller.GetEventTarget(12, 1, true)).toBe(f.el);
        expect(f.target.BTakeFocus).toHaveBeenCalledExactlyOnceWith(1);
        stop();
    });

    it('does not guess a target from the neutral container before Home has restored a control', () => {
        const f = setup();
        f.clearFocus();
        f.doc.activeElement = { contains: (target: unknown) => target === f.root };
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.controller.GetEventTarget(11, 1, true);
        expect(f.target.BTakeFocus).not.toHaveBeenCalled();
        stop();
    });

    it('repairs a connected native node outside Home when DOM focus has already returned to its row', () => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.setFocus(node({ isConnected: true }));
        expect(f.controller.GetEventTarget(11, 1, true)).toBe(f.el);
        expect(f.target.BTakeFocus).toHaveBeenCalledExactlyOnceWith(1);
        stop();
    });

    it('does not displace a connected control from a neutral DOM ancestor alone', () => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        const other = { isConnected: true };
        f.setFocus(node(other));
        f.doc.activeElement = { contains: (target: unknown) => target === f.root };
        expect(f.controller.GetEventTarget(11, 1, true)).toBe(other);
        expect(f.target.BTakeFocus).not.toHaveBeenCalled();
        stop();
    });

    it.each(['valid Home focus', 'other tree', 'other DOM focus', 'unfocused window', 'suppressed input', 'unmounted Home', 'opening page'])('does not steal focus: %s', (scenario) => {
        const f = setup();
        f.clearFocus();
        if (scenario === 'valid Home focus') f.setFocus(f.target);
        if (scenario === 'other tree') f.tree.m_Root = node({});
        if (scenario === 'other DOM focus') f.doc.activeElement = {};
        if (scenario === 'unfocused window') f.doc.hasFocus.mockReturnValue(false);
        if (scenario === 'suppressed input') f.context.BIsGamepadInputSuppressed.mockReturnValue(true);
        if (scenario === 'unmounted Home') f.root.isConnected = false;
        if (scenario === 'opening page') f.root.hasAttribute.mockReturnValue(true);
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.controller.GetEventTarget(11, 1, true);
        expect(f.target.BTakeFocus).not.toHaveBeenCalled();
        stop();
    });

    it('leaves releases and other buttons to Steam', () => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.clearFocus();
        f.controller.GetEventTarget(11, 1, false);
        f.controller.GetEventTarget(1, 1, true);
        expect(f.target.BTakeFocus).not.toHaveBeenCalled();
        expect(f.original).toHaveBeenCalledTimes(2);
        stop();
    });

    it('remembers a control focused after the guard starts', () => {
        const f = setup();
        f.doc.activeElement = {};
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        f.doc.activeElement = f.el;
        f.notify();
        f.clearFocus();
        f.doc.activeElement = { contains: (target: unknown) => target === f.root };
        expect(f.controller.GetEventTarget(11, 1, true)).toBe(f.el);
        expect(f.target.BTakeFocus).toHaveBeenCalledTimes(1);
        stop();
    });

    it.each(['cleanup', 'timeout'])('restores the original dispatcher and removes listeners after %s', (reason) => {
        const f = setup();
        const stop = keepSteamFocus(f.root as unknown as HTMLElement, 1500, f.controller);
        if (reason === 'cleanup') { stop(); stop(); }
        else vi.advanceTimersByTime(1500);
        f.clearFocus();
        expect(f.controller.GetEventTarget).toBe(f.original);
        expect(f.controller.GetEventTarget(11, 1, true)).toBeUndefined();
        expect(f.target.BTakeFocus).not.toHaveBeenCalled();
        expect(f.listeners.size).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('takeSteamFocus', () => {
    it("asks the element's node to take Steam's gamepad focus (as Steam's own D-pad does)", () => {
        const el = {};
        const target = node(el);
        const controller = { GetActiveContext: () => ({ m_rgGamepadNavigationTrees: [{ m_Root: node({}, [target]) }] }) };
        expect(takeSteamFocus(el, controller)).toBe(true);
        expect(target.BTakeFocus).toHaveBeenCalledWith(1);
    });
    it('false, and nothing thrown, without Steam\'s controller or the node', () => {
        expect(takeSteamFocus({}, undefined)).toBe(false);
        expect(takeSteamFocus({}, { GetActiveContext: () => { throw new Error('x'); } })).toBe(false);
        expect(takeSteamFocus({}, { GetActiveContext: () => ({ m_rgGamepadNavigationTrees: [] }) })).toBe(false);
    });
});
