import { expect, it } from 'vitest';
import { soundtrackStyles } from '../../src/menu/soundtrackStyles';

const rule = (selector: string) => soundtrackStyles.split('\n').find(line => line.startsWith(selector + '{')) ?? '';
const ON = '.gg-menu-native-host .gg-menu button.gg-menu-action.gg-soundtrack-button.DialogButton[aria-pressed=true]';

it('keeps room for a two-line track name: album pinned at the top, the name just above the play time', () => {
    // A longer name never moves the controls; a short one leaves its space between the album and the name.
    expect(rule('.gg-menu .gg-soundtrack-track')).toContain('-webkit-line-clamp:2');
    const titles = rule('.gg-menu .gg-soundtrack-titles');
    expect(titles).toContain('justify-content:space-between');
    expect(titles).toContain('min-height:calc(2 * 1.15 * 30px + 6px + 1.4 * var(--gg-type-label))');
    expect(rule('.gg-menu .gg-soundtrack-titles .gg-plugin-dim')).toContain('text-overflow:ellipsis');
});

it('marks shuffle and repeat while on with the accent: icon, tint, edge and a dot', () => {
    const on = rule(ON);
    expect(on).toContain('color:var(--gg-accent-text,var(--gg-accent))');
    expect(on).toContain('border-color:var(--gg-accent)');
    expect(on).toContain('background:color-mix(in srgb,var(--gg-accent) 30%,transparent)');
    expect(rule(ON + '::after')).toContain('border-radius:50%');
});

it('holds only CSS', () => {
    expect(soundtrackStyles.split('\n').filter(line => line.trim().startsWith('//'))).toEqual([]);
});
