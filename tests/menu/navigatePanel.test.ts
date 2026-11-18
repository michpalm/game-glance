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
    const nodes = tree(NavigatePanel({ handoff: vi.fn(), openGameGlance: vi.fn() }));
    const heading = nodes.find(n => n.props.className === 'gg-menu-heading')!;
    expect(tree(heading).some(n => typeof n.props.id === 'string')).toBe(false);
    expect(nodes.some(n => n.props.id === 'navigate:native')).toBe(false);
});

it('lists Media after Store, in Steam’s menu order, with Game Glance before Power, on a four-column grid', () => {
    const handoff = vi.fn();
    const nodes = tree(NavigatePanel({ handoff, openGameGlance: vi.fn() }));
    expect(nodes.find(n => String(n.props.className).includes('gg-menu-grid'))?.props.className).toBe('gg-menu-grid gg-menu-grid-navigate');
    const ids = nodes.map(n => n.props.id).filter((id): id is string => typeof id === 'string');
    expect(ids).toEqual(['navigate:home', 'navigate:library', 'navigate:store', 'navigate:media', 'navigate:downloads', 'navigate:settings', 'navigate:game-glance', 'navigate:power']);
    nodes.find(n => n.props.id === 'navigate:media')!.props.onAction();
    expect(handoff).toHaveBeenCalledWith({ kind: 'navigate', destination: 'media' });
});

it('opens Game Glance’s settings inside the menu, not in Steam', () => {
    const handoff = vi.fn(), openGameGlance = vi.fn();
    const nodes = tree(NavigatePanel({ handoff, openGameGlance }));
    const tile = nodes.find(n => n.props.id === 'navigate:game-glance')!;
    expect(tree(tile).some(n => n.type === 'span' && n.props.children === 'Game Glance')).toBe(true);
    tile.props.onAction();
    expect(openGameGlance).toHaveBeenCalledTimes(1);
    expect(handoff).not.toHaveBeenCalled();
});

it('adds Storage only when Steam offers it, and Power is always the last tile (Michael, 2026-11-19)', () => {
    const handoff = vi.fn();
    const ids = (storage: boolean) => tree(NavigatePanel({ handoff, openGameGlance: vi.fn(), storage })).map(n => n.props.id).filter((id): id is string => typeof id === 'string');
    expect(ids(true)).toEqual(['navigate:home', 'navigate:library', 'navigate:store', 'navigate:media', 'navigate:downloads', 'navigate:settings', 'navigate:game-glance', 'navigate:storage', 'navigate:power']);
    expect(ids(false)).not.toContain('navigate:storage');
    expect(ids(false).at(-1)).toBe('navigate:power');
    const nodes = tree(NavigatePanel({ handoff, openGameGlance: vi.fn(), storage: true }));
    const tile = nodes.find(n => n.props.id === 'navigate:storage')!;
    expect(tree(tile).some(n => n.type === 'span' && n.props.children === 'Storage')).toBe(true);
    tile.props.onAction();
    expect(handoff).toHaveBeenCalledWith({ kind: 'navigate', destination: 'storage' });
});
