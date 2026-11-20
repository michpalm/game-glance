import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {} }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { Bar, Fact, Tabs, shoulderTab } from '../../src/pageKit/PageKit';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (typeof element.type === 'function') return tree((element.type as (p: unknown) => ReactNode)(element.props));
    return [element, ...tree(element.props.children)];
}
const strings = (node: ReactNode) => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string')).join('|');

describe('page kit', () => {
    it('L1 and R1 move one tab', () => {
        expect(shoulderTab(['a', 'b', 'c'], 'b', 6)).toBe('c');
        expect(shoulderTab(['a', 'b', 'c'], 'b', 5)).toBe('a');
        expect(shoulderTab(['a', 'b', 'c'], 'b', 0)).toBeNull();
    });
    it('Bar clamps its ratio', () => {
        const width = (ratio: number) => tree(Bar({ ratio })).find(e => e.props.className === 'gg-pk-bar-fill')?.props.style.width;
        expect(width(1.4)).toBe('100%');
        expect(width(-1)).toBe('0%');
        expect(width(.5)).toBe('50%');
    });
    it('Tabs shows counts only when known, and marks the active one', () => {
        const out = Tabs({ tabs: [{ key: 'i', label: 'Installed', count: 15 }, { key: 'c', label: 'Collections', count: null }], active: 'c', onChange: () => {} });
        expect(strings(out)).toContain('Installed · 15');
        expect(strings(out)).toContain('Collections');
        expect(strings(out)).not.toContain('Collections ·');
        const selected = tree(out).filter(e => e.props['aria-selected'] === true);
        expect(selected).toHaveLength(1);
        expect(strings(selected[0])).toBe('Collections');
    });
    it('Fact shows its label over its value', () => expect(strings(Fact({ label: 'Played', value: '42 h 43 min' }))).toBe('Played|42 h 43 min'));
});
