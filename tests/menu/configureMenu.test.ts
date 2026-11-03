import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { ConfigureMenuView } from '../../src/menu/components/MorePanel';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', ToggleField: 'toggle-field', NavEntryPositionPreferences: {} }));
vi.mock('../../src/menu/steam/performanceIcons', () => ({ steamPerformanceIcon: () => null }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children), ...tree(element.props.aside)];
}

it('titles the view More › Configure menu with the count, and has no on-screen back button', () => {
    const nodes = tree(ConfigureMenuView({ pins: ['navigate', 'social'], onChange: vi.fn(), error: '' }));
    const crumb = nodes.find(n => n.props.title === 'Configure menu')!;
    expect(crumb.props.parent).toBe('More');
    expect(nodes.some(n => n.props.children === '2 / 4 on the bar')).toBe(true);
    expect(nodes.some(n => n.props.id === 'configure:back')).toBe(false);
    expect(nodes.find(n => n.props.className === 'gg-plugin-note')!.props.children).toBe('Choose 1–4 menus for the bar. The rest stay in More; a running game gets its own tab.');
});

it('shows each menu with its tab icon and keeps the 1–4 rule', () => {
    const onChange = vi.fn();
    const nodes = tree(ConfigureMenuView({ pins: ['navigate'], onChange, error: '' }));
    const toggles = nodes.filter(n => n.type === 'toggle-field');
    expect(toggles).toHaveLength(7);
    const navigate = toggles[0];
    expect(tree(navigate.props.label).some(n => n.props.className === 'gg-menu-setting-label')).toBe(true);
    expect(navigate.props.checked).toBe(true);
    expect(navigate.props.disabled).toBe(true); // the last menu on the bar cannot be turned off
    toggles[1].props.onChange(true);
    expect(onChange).toHaveBeenCalledWith(['navigate', 'quick-settings']);
});

it('shows a save error', () => {
    const nodes = tree(ConfigureMenuView({ pins: ['navigate'], onChange: vi.fn(), error: 'Could not save menu choices. Try again.' }));
    expect(nodes.find(n => n.props.role === 'alert')!.props.children).toBe('Could not save menu choices. Try again.');
});
