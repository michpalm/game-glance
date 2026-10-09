import { describe, expect, it, vi } from 'vitest';
import { findNavNode, takeSteamFocus } from '../../src/home/steamFocus';

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
