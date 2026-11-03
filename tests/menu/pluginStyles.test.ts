import { expect, it } from 'vitest';
import { pluginStyles } from '../../src/menu/pluginStyles';

const rule = (selector: string) => pluginStyles.split('\n').find(line => line.startsWith(selector + '{')) ?? '';

it('lays the Game Glance cards out two across', () => {
    expect(rule('.gg-menu .gg-menu-grid.gg-plugin-cards')).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
});
it('draws plugin rows and the match card in the menu glass', () => {
    expect(rule('.gg-menu-native-host .gg-menu button.gg-menu-action.gg-plugin-row.DialogButton')).toContain('background:var(--gg-glass)');
    expect(rule('.gg-menu .gg-plugin-card')).toContain('background:var(--gg-glass)');
});
