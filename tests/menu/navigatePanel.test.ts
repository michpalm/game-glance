import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { NavigatePanel } from '../../src/menu/components/NavigatePanel';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}

it('has no Steam menu button: the heading is the title alone', () => {
    const nodes = tree(NavigatePanel({ handoff: vi.fn() }));
    const heading = nodes.find(n => n.props.className === 'gg-menu-heading')!;
    expect(tree(heading).some(n => typeof n.props.id === 'string')).toBe(false);
    expect(nodes.some(n => n.props.id === 'navigate:native')).toBe(false);
});

it('lists Media after Store, in Steam’s menu order, on a four-column grid', () => {
    const handoff = vi.fn();
    const nodes = tree(NavigatePanel({ handoff }));
    expect(nodes.find(n => String(n.props.className).includes('gg-menu-grid'))?.props.className).toBe('gg-menu-grid gg-menu-grid-navigate');
    const ids = nodes.map(n => n.props.id).filter((id): id is string => typeof id === 'string');
    expect(ids).toEqual(['navigate:home', 'navigate:library', 'navigate:store', 'navigate:media', 'navigate:downloads', 'navigate:settings', 'navigate:power']);
    nodes.find(n => n.props.id === 'navigate:media')!.props.onAction();
    expect(handoff).toHaveBeenCalledWith({ kind: 'navigate', destination: 'media' });
});
