import { type ReactElement, type ReactNode } from 'react';
import { LuArrowUpRight } from 'react-icons/lu';
import { expect, it, vi } from 'vitest';
import { NavigatePanel } from '../../src/menu/components/NavigatePanel';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const text = (nodes: ReturnType<typeof tree>) => nodes.flatMap(n => [n.props.children].flat().filter((c: unknown) => typeof c === 'string')).join(' | ');

it('puts Steam menu in the title row as a card button with the arrow', () => {
    const nodes = tree(NavigatePanel({ handoff: vi.fn() }));
    const heading = nodes.find(n => n.props.className === 'gg-menu-heading')!;
    const button = tree(heading).find(n => n.props.id === 'navigate:native')!;
    expect(text(tree(button))).toBe('Steam menu');
    expect(tree(button).some(n => n.type === LuArrowUpRight)).toBe(true);
    expect(nodes.some(n => n.props.className === 'gg-menu-secondary')).toBe(false);
});
