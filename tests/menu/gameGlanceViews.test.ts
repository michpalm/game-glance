import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { GameGlanceGrid } from '../../src/menu/components/GameGlanceViews';
import type { GgActions, GgValues } from '../../src/menu/components/gameGlanceTypes';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const summaries = { home: 'On', 'game-page': 'Full look', 'status-bar': 'Status bar on', menu: 'Game Glance menu on · Compact keyboard', screensaver: 'Off', general: 'Look, data and updates' };

it('shows the six cards in order, each with its summary, and opens the category page', () => {
    const open = vi.fn();
    const v = { summaries, version: '4.0.0' } as unknown as GgValues;
    const a = { open } as unknown as GgActions;
    const nodes = tree(GameGlanceGrid({ v, a }));
    const cards = nodes.filter(n => typeof n.props.id === 'string');
    expect(cards.map(n => n.props.id)).toEqual(['gg:card:home', 'gg:card:game-page', 'gg:card:status-bar', 'gg:card:menu', 'gg:card:screensaver', 'gg:card:general']);
    expect(nodes.filter(n => n.props.className === 'gg-plugin-dim').map(n => n.props.children)).toEqual(Object.values(summaries));
    cards[2].props.onAction();
    expect(open).toHaveBeenCalledWith('gg:status-bar');
});

it('titles the grid Plugins › Game Glance with the version', () => {
    const nodes = tree(GameGlanceGrid({ v: { summaries, version: '4.0.0' } as unknown as GgValues, a: {} as GgActions }));
    const crumb = nodes.find(n => n.props.title === 'Game Glance')!;
    expect(crumb.props.parent).toBe('Plugins');
});
