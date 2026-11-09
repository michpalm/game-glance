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
it('keeps the panel padding in view when Steam scrolls to the first or last row', () => {
    // Steam scrolls only until the focused row touches the panel edge; the padding and the heading would stay hidden.
    expect(rule('.gg-menu .gg-menu-panel:has(.gg-plugin-rows,.gg-plugin-cards,.gg-plugin-list)')).toContain('scroll-padding-block:24px');
    const first = rule('.gg-menu :is(.gg-plugin-rows>:first-child,.gg-plugin-list>:first-child,.gg-plugin-cards>:nth-child(-n+2)),.gg-menu :is(.gg-plugin-rows>:first-child,.gg-plugin-list>:first-child) *');
    expect(first).toContain('scroll-margin-top:64px');
});
it('sizes the Game Glance cards as the Navigate tiles, so six fit without scrolling', () => {
    expect(rule('.gg-menu-native-host .gg-menu .gg-menu-grid.gg-plugin-cards button.gg-menu-action.DialogButton')).toContain('min-height:112px');
});
it('holds only CSS: a // line would swallow the rule after it', () => {
    expect(pluginStyles.split('\n').filter(line => line.trim().startsWith('//'))).toEqual([]);
});
it('scrolls a long list under a fixed heading, fading its rows only while more is below', () => {
    expect(rule('.gg-menu .gg-menu-panel:has(>.gg-plugin-list)')).toContain('overflow:hidden');
    const list = rule('.gg-menu .gg-menu-panel>.gg-plugin-list');
    expect(list).toContain('overflow-y:auto');
    expect(list).toContain('mask-image:linear-gradient(to bottom,#000 calc(100% - var(--gg-list-fade)),transparent)');
    // A scroll-driven animation needs an auto duration; the shorthand's default 0s leaves the fade off.
    expect(list).toContain('animation:gg-list-fade auto linear both');
    expect(list).toContain('animation-timeline:scroll(self)');
    expect(rule('@keyframes gg-list-fade')).toContain('100%{--gg-list-fade:0px}');
    expect(rule("@property --gg-list-fade")).toContain('initial-value:0px');
});
