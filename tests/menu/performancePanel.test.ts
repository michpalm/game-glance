import { readFileSync } from 'node:fs';
import { LuEye, LuGauge, LuImage, LuLayers } from 'react-icons/lu';
import { expect, it, vi } from 'vitest';
import { settingIcon } from '../../src/menu/components/PerformancePanel';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', SliderField: 'div', ToggleField: 'div', NavEntryPositionPreferences: {}, findModule: () => null }));
const source = readFileSync('src/menu/components/PerformancePanel.tsx', 'utf8');

it('gives every Performance setting row an icon', () => {
    expect(settingIcon('frameLimit')).toBe(LuGauge);
    expect(settingIcon('overlayLevel')).toBe(LuLayers);
    expect(settingIcon('overlaySteam')).toBe(LuEye);
    expect(settingIcon('hdr')).toBe(LuImage);
});
it('shows a slider value beside its label, with no tick labels', () => {
    expect(source).not.toContain('notchLabels');
});
it('labels the performance profile with the setting label, not a section label', () => {
    expect(source).not.toContain('<h3>Performance profile</h3>');
    expect(source).toContain('<div className="gg-menu-setting-header">Performance profile</div>');
});
