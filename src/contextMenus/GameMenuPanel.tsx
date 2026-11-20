import { cloneElement, createElement, isValidElement, type ComponentType } from 'react';
import { findMenuModule } from '../home/gameMenu';
import { installPanelRenderPatchOn, PANEL_MARK, panelLive } from './panelPatch';
import { GameMenuView } from './GameMenuView';

/**
 * Steam's game menu as Game Glance's panel (spec B): Steam's AppActionsMenu runs inline (its hooks are ours for this render)
 * to give Steam's own Rt element, which renders marked, so its render patch draws the panel from Steam's own items.
 */
export function GameMenuPanel(props: Record<string, unknown>) {
    const menu = findMenuModule()?.uU as ComponentType<Record<string, unknown>> & ((p: Record<string, unknown>) => unknown) | undefined;
    if (!menu) return null;
    const inner = menu(props);
    if (!isValidElement(inner) || typeof inner.type !== 'function' || typeof (inner.type as { prototype?: { render?: unknown } }).prototype?.render !== 'function')
        return createElement(menu, props);
    if (!panelLive()) return inner;
    try {
        installPanelRenderPatchOn(inner.type as never, GameMenuView);
        return cloneElement(inner, { [PANEL_MARK]: true } as Record<string, unknown>);
    } catch {
        return inner;
    }
}
