import { expect, it } from 'vitest';
import { soundtrackStyles } from '../../src/menu/soundtrackStyles';

const rule = (selector: string) => soundtrackStyles.split('\n').find(line => line.startsWith(selector + '{')) ?? '';
const ON = '.gg-menu-native-host .gg-menu button.gg-menu-action.gg-soundtrack-button.DialogButton[aria-pressed=true]';

it('keeps two lines for the track name, so a longer one never moves the controls', () => {
    const track = rule('.gg-menu .gg-soundtrack-track');
    expect(track).toContain('-webkit-line-clamp:2');
    expect(track).toContain('min-height:calc(2 * 1.15em)');
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
