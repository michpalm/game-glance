import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router } from '@decky/ui';
import { menuScale, menuSize, menuWindowSize } from '../../src/menu/menuScale';
import { menuStyles as MENU_CSS } from '../../src/menu/styles';
import { SIZE_FACTOR } from '../../src/home/scale';

vi.mock('@decky/ui', () => ({ Router: {} }));

const size = (innerWidth: number, innerHeight: number) => ({ innerWidth, innerHeight });

describe('menuScale', () => {
    it('normalizes against the 829 px handheld viewport, times the size factor', () => {
        expect(menuScale(829)).toBeCloseTo(0.65, 10);
        expect(menuScale(1500)).toBeCloseTo(1500 * 0.65 / 829, 10);
        expect(menuScale(1500, SIZE_FACTOR.tv)).toBeCloseTo(1500 * 0.65 / 829 * 0.88, 10);
    });
});

describe('menuSize: the menu shrinks by Home\'s size factor', () => {
    it('follows Big Picture\'s own size: TV docked, handheld otherwise', () => {
        expect(menuSize(size(829, 467), size(828, 466))).toBe(SIZE_FACTOR.handheld);
        expect(menuSize(size(1500, 845), size(1500, 844))).toBe(SIZE_FACTOR.tv);
    });
    it('trusts Big Picture over the menu\'s own window, which Steam resizes in-game', () => {
        expect(menuSize(size(1920, 1080), size(828, 466))).toBe(SIZE_FACTOR.handheld);
    });
    it('falls back to the menu\'s own window without Big Picture, or with an unusable one', () => {
        expect(menuSize(size(1500, 845), null)).toBe(SIZE_FACTOR.tv);
        expect(menuSize(size(829, 467), undefined)).toBe(SIZE_FACTOR.handheld);
        expect(menuSize(size(1500, 845), size(0, 0))).toBe(SIZE_FACTOR.tv);
    });
});

describe('menuWindowSize', () => {
    const owner = Router as unknown as { WindowStore?: unknown };
    afterEach(() => { delete owner.WindowStore; });
    it('reads Steam\'s main window', () => {
        owner.WindowStore = { GamepadUIMainWindowInstance: { BrowserWindow: size(1500, 844) } };
        expect(menuWindowSize(size(829, 467))).toBe(SIZE_FACTOR.tv);
    });
    it('uses the menu\'s window when Steam has none', () => {
        expect(menuWindowSize(size(829, 467))).toBe(SIZE_FACTOR.handheld);
    });
    it('survives a throwing store', () => {
        owner.WindowStore = { get GamepadUIMainWindowInstance() { throw new Error('gone'); } };
        expect(menuWindowSize(size(1500, 845))).toBe(SIZE_FACTOR.tv);
    });
});

describe('the panel', () => {
    it('shrinks by --gg-menu-size around the same centre, keeping its logical size', () => {
        expect(MENU_CSS).toContain('width:calc(60vw * var(--gg-menu-size,1) / var(--gg-menu-scale,.65))');
        expect(MENU_CSS).toContain('height:calc(84vh * var(--gg-menu-size,1) / var(--gg-menu-scale,.65))');
        expect(MENU_CSS).toContain('top:calc(7.6923vh + 84vh * (1 - var(--gg-menu-size,1)) / 2)');
        expect(MENU_CSS).not.toContain('top:7.6923vh;');
    });
});
