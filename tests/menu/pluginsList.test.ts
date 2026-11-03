import { createElement, type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { PluginsList } from '../../src/menu/components/PluginsList';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const icon = createElement('svg', { id: 'own-icon' });
const plugins = [{ name: 'Unifideck', version: '0.7.6', icon }, { name: 'Game Glance', version: '4.0.0', icon: null }];

it('lists each plugin by name and version under Plugins, with Open in Steam in the heading', () => {
    const openDecky = vi.fn();
    const nodes = tree(PluginsList({ plugins, openGameGlance: vi.fn(), openOther: vi.fn(), openDecky }));
    expect(nodes.find(n => n.type === 'h2')!.props.children).toBe('Plugins');
    const ids = nodes.map(n => n.props.id).filter((id): id is string => typeof id === 'string' && id.startsWith('plugins:'));
    expect(ids).toEqual(['plugins:native', 'plugins:Unifideck', 'plugins:Game Glance']);
    nodes.find(n => n.props.id === 'plugins:native')!.props.onAction();
    expect(openDecky).toHaveBeenCalledTimes(1);
});

it('opens Game Glance inside the menu and any other plugin in Decky', () => {
    const openGameGlance = vi.fn(), openOther = vi.fn();
    const nodes = tree(PluginsList({ plugins, openGameGlance, openOther, openDecky: vi.fn() }));
    nodes.find(n => n.props.id === 'plugins:Game Glance')!.props.onAction();
    expect(openGameGlance).toHaveBeenCalledTimes(1);
    nodes.find(n => n.props.id === 'plugins:Unifideck')!.props.onAction();
    expect(openOther).toHaveBeenCalledWith('Unifideck');
});

it('says where each plugin opens and keeps the plugin’s own icon', () => {
    const nodes = tree(PluginsList({ plugins, openGameGlance: vi.fn(), openOther: vi.fn(), openDecky: vi.fn() }));
    const ends = nodes.filter(n => n.props.className === 'gg-plugin-end').map(n => n.props.children[0]);
    expect(ends).toEqual(['Opens in Steam', 'Settings']);
    expect(nodes.some(n => n.props.id === 'own-icon')).toBe(true);
});

it('says so when the list cannot be read', () => {
    const nodes = tree(PluginsList({ plugins: null, openGameGlance: vi.fn(), openOther: vi.fn(), openDecky: vi.fn() }));
    expect(nodes.find(n => n.props.className === 'gg-plugin-note')!.props.children).toBe('Plugins could not be listed.');
    expect(nodes.some(n => n.props.id === 'plugins:native')).toBe(true);
});
