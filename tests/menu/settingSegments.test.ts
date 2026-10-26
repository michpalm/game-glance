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

it('keeps pending or unavailable choices inoperable without replacing the current value', () => {
    const set = vi.fn();
    const element = SettingSegments({ id: 'profile', label: 'Profile', options: ['low-power','balanced','performance'], value: 'balanced', disabled: true,
        labels: { balanced: 'Balanced' }, onSelect: set });
    const options = element.props.children;
    expect(options.every(option => option.props.disabled)).toBe(true);
    options[2].props.onAction(); expect(set).not.toHaveBeenCalled(); expect(options[1].props.selected).toBe(true);
});
