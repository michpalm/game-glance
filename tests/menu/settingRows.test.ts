import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { Crumb, SegmentRow, ToggleRow } from '../../src/menu/components/SettingRows';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', ToggleField: 'toggle-field', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}

it('draws a crumb: parent, chevron and the title as the heading', () => {
    const nodes = tree(Crumb({ parent: 'Game Glance', title: 'Home', aside: 'x' }));
    expect(nodes[0].props.className).toBe('gg-menu-heading gg-plugin-crumb');
    expect(nodes.find(n => n.type === 'h2')!.props.children).toBe('Home');
    expect(nodes.find(n => n.type === 'span')!.props.children).toBe('Game Glance');
});

it('wraps a Steam toggle in a menu setting row with its focus key', () => {
    const onChange = vi.fn();
    const row = ToggleRow({ id: 'gg:home:spotlightHome', label: 'Spotlight Home', description: 'Text.', checked: true, onChange });
    expect(row.props.className).toBe('gg-menu-setting gg-menu-setting-toggle');
    expect(row.props['data-gg-focus']).toBe('gg:home:spotlightHome');
    const toggle = tree(row).find(n => n.type === 'toggle-field')!;
    expect(toggle.props).toMatchObject({ label: 'Spotlight Home', description: 'Text.', checked: true, disabled: false, highlightOnFocus: false });
    toggle.props.onChange(false);
    expect(onChange).toHaveBeenCalledWith(false);
});

it('marks a disabled toggle row', () => {
    const row = ToggleRow({ id: 'a', label: 'A', checked: false, disabled: true, onChange: vi.fn() });
    expect(row.props.className).toBe('gg-menu-setting gg-menu-setting-toggle gg-menu-setting-disabled');
});

it('draws segments under a header, with an optional note', () => {
    const onSelect = vi.fn();
    const row = SegmentRow({ id: 'gg:general:heroFit', label: 'Hero art', description: 'Fills.', options: ['fill', 'fit'] as const, labels: { fill: 'Fill', fit: 'Fit' }, value: 'fill', onSelect });
    expect(row.props.className).toBe('gg-menu-setting gg-menu-setting-segments');
    expect(row.props['data-gg-focus']).toBe('gg:general:heroFit');
    const nodes = tree(row);
    expect(nodes.find(n => n.props.className === 'gg-menu-setting-header')!.props.children).toBe('Hero art');
    const segments = nodes.find(n => n.props.options)!;
    expect(segments.props).toMatchObject({ id: 'gg:general:heroFit', label: 'Hero art', options: ['fill', 'fit'], value: 'fill' });
    segments.props.onSelect('fit');
    expect(onSelect).toHaveBeenCalledWith('fit');
    expect(nodes.find(n => n.props.className === 'gg-plugin-note')!.props.children).toBe('Fills.');
});
