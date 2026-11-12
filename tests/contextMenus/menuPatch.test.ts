import { createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { installGameMenuPatchOn, swapGameMenu } from '../../src/contextMenus/menuPatch';

const AppActionsMenu = () => null;
const Other = () => null;
const Card = (_: Record<string, unknown>) => null as unknown as ReactElement;
const gameEl = createElement(AppActionsMenu, { overview: { appid: 620 } } as Record<string, unknown>);

describe('swapGameMenu', () => {
    it('hands the game menu to the panel with every prop', () => {
        const out = swapGameMenu(gameEl, AppActionsMenu, Card) as ReactElement;
        expect(out.type).toBe(Card);
        expect(out.props).toEqual(gameEl.props);
    });
    it('passes every other menu through untouched', () => {
        const other = createElement(Other, { overview: { appid: 620 } } as Record<string, unknown>);
        expect(swapGameMenu(other, AppActionsMenu, Card)).toBe(other);
        const bare = createElement(AppActionsMenu, {});
        expect(swapGameMenu(bare, AppActionsMenu, Card)).toBe(bare);
        const zero = createElement(AppActionsMenu, { overview: { appid: 0 } } as Record<string, unknown>);
        expect(swapGameMenu(zero, AppActionsMenu, Card)).toBe(zero);
        expect(swapGameMenu('text', AppActionsMenu, Card)).toBe('text');
        expect(swapGameMenu(null, AppActionsMenu, Card)).toBeNull();
        expect(swapGameMenu(gameEl, undefined, Card)).toBe(gameEl);
    });
});

describe('installGameMenuPatchOn', () => {
    const fresh = () => class M { CreateContextMenuInstance(e: unknown) { return e; } };
    it('leaves the game menu alone in a window without the stylesheet', () => {
        const M = fresh();
        const remove = installGameMenuPatchOn(M, () => AppActionsMenu, Card, () => false);
        expect(new M().CreateContextMenuInstance(gameEl)).toBe(gameEl);
        remove();
    });
    it('removes itself without throwing when another patcher replaced the method', () => {
        const M = fresh();
        const remove = installGameMenuPatchOn(M, () => AppActionsMenu, Card);
        M.prototype.CreateContextMenuInstance = function (e: unknown) { return e; };
        expect(() => remove()).not.toThrow();
    });
    it('wraps the game menu while installed, once, and stops when removed', () => {
        const M = fresh();
        const remove = installGameMenuPatchOn(M, () => AppActionsMenu, Card);
        installGameMenuPatchOn(M, () => AppActionsMenu, Card);
        const out = new M().CreateContextMenuInstance(gameEl) as ReactElement<{ overview: unknown }>;
        expect(out.type).toBe(Card);
        expect(out.props.overview).toEqual({ appid: 620 });
        const other = createElement(Other, {});
        expect(new M().CreateContextMenuInstance(other)).toBe(other);
        remove();
        expect(new M().CreateContextMenuInstance(gameEl)).toBe(gameEl);
    });
    it('lets the original through when the lookup throws', () => {
        const M = fresh();
        const remove = installGameMenuPatchOn(M, () => { throw new Error('gone'); }, Card);
        expect(new M().CreateContextMenuInstance(gameEl)).toBe(gameEl);
        remove();
    });
});
