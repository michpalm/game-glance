import { expect, it, vi } from 'vitest';
import { SettingSegments } from '../../src/menu/components/SettingSegments';

it('uses native option values and order rather than visual indices', () => {
    const set = vi.fn();
    const element = SettingSegments({ id: 'performance:scalingMode', label: 'Scaling mode', options: [1,2,3,5,4], value: 4,
        labels: { 1: 'Auto', 2: 'Integer', 3: 'Fit', 5: 'Stretch', 4: 'Fill' }, onSelect: set });
    const options = element.props.children;
    expect(options[3].props.children).toBe('Stretch'); options[3].props.onAction(); expect(set).toHaveBeenCalledWith(5);
    expect(options[4].props.selected).toBe(true); expect(options[3].props.selected).toBe(false);
});

it('keeps every option usable and spins the chosen one while Steam applies it', () => {
    const set = vi.fn();
    const options = SettingSegments({ id: 'performance:scalingMode', label: 'Scaling mode', options: [1,2,3], value: 2, spinning: true,
        labels: { 1: 'Auto', 2: 'Integer', 3: 'Fit' }, onSelect: set }).props.children;
    expect(options.some(o => o.props.disabled)).toBe(false);
    expect(options[1].props.className).toContain('gg-menu-pending');
    expect(options[1].props.busy).toBe(true);
    expect(options[0].props.className ?? '').not.toContain('gg-menu-pending');
    options[2].props.onAction(); expect(set).toHaveBeenCalledWith(3);
});
it('ignores the option that is already selected', () => {
    const set = vi.fn();
    const options = SettingSegments({ id: 'p', label: 'P', options: [1,2], value: 2, labels: {}, onSelect: set }).props.children;
    options[1].props.onAction(); expect(set).not.toHaveBeenCalled();
});
it('keeps unavailable choices inoperable', () => {
    const set = vi.fn();
    const options = SettingSegments({ id: 'p', label: 'P', options: [1,2], value: 2, disabled: true, labels: {}, onSelect: set }).props.children;
    expect(options.every(o => o.props.disabled)).toBe(true); options[0].props.onAction(); expect(set).not.toHaveBeenCalled();
});
