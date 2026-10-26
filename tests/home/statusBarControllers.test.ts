import { Children, ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ControllerItems } from '../../src/home/StatusBar';
import { readControllerBatteries } from '../../src/home/statusItems';

// No DOM renderer in these tests: the component has no hooks, so its element tree is checked directly.
const items = (controllers: ReturnType<typeof readControllerBatteries>) =>
    Children.toArray((ControllerItems({ controllers }) as ReactElement<{ children: unknown }>).props.children) as ReactElement<Record<string, unknown>>[];
const text = (el: ReactElement<Record<string, unknown>>) =>
    Children.toArray(el.props.children as never).filter((c) => typeof c === 'string' || typeof c === 'number').join('');

describe('ControllerItems (controller batteries in the status pill)', () => {
    it('shows a low controller with its percent, the low colour and a label', () => {
        const [item, ...rest] = items(readControllerBatteries([{ name: '8BitDo', percent: 17 }]));
        expect(rest).toHaveLength(0);
        expect(text(item)).toBe('17%');
        expect(item.props.className).toBe('gh-status-item gh-controller gh-status-low');
        expect(item.props['aria-label']).toBe('8BitDo, Battery 17%');
    });
    it('shows two controllers, lowest first, then +n for the rest', () => {
        const shown = items(readControllerBatteries([{ name: 'C', percent: 90 }, { name: 'A', percent: 10 }, { name: 'B', percent: 50 }]));
        expect(shown.map(text)).toEqual(['10%', '50%', '+1']);
        expect(shown[1].props.className).toBe('gh-status-item gh-controller');
        expect(shown[2].props['aria-label']).toBe('1 more controller');
    });
    it('says how many more controllers the +n stands for', () => {
        const four = items(readControllerBatteries([10, 20, 30, 40].map((percent, i) => ({ name: `P${i}`, percent }))));
        expect(text(four[2])).toBe('+2');
        expect(four[2].props['aria-label']).toBe('2 more controllers');
    });
    it('gives two controllers with the same name different keys', () => {
        const [a, b] = items(readControllerBatteries([{ name: '8BitDo', percent: 30 }, { name: '8BitDo', percent: 60 }]));
        expect(a.key).not.toBe(b.key);
    });
    it('shows nothing without controllers', () => {
        expect(items([])).toHaveLength(0);
    });
});
