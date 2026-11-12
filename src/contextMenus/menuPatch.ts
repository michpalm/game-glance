import { beforePatch, findModuleExport } from '@decky/ui';
import { createElement, type ComponentType } from 'react';
import { findMenuModule } from '../home/gameMenu';
import { memoLookup } from '../home/moduleLookup';
import { GameMenuPanel } from './GameMenuPanel';
import { removePanelRenderPatches, setPanelLive } from './panelPatch';
import { menuStyled } from './applyMenuStyle';
import { LOG_PREFIX } from '../constants';

type Panel = ComponentType<any>;
type Manager = { prototype: { CreateContextMenuInstance(...a: unknown[]): unknown } };

/** Steam's game menu element handed to the panel (same props); any other value (another menu, no game) is returned as it is. Never throws. */
export function swapGameMenu(element: unknown, appActionsMenu: unknown, Panel: Panel): unknown {
    try {
        if (!appActionsMenu || !element || typeof element !== 'object') return element;
        const e = element as { type?: unknown; props?: { overview?: { appid?: unknown } } };
        const appid = e.props?.overview?.appid;
        if (e.type !== appActionsMenu || typeof appid !== 'number' || !(appid > 0)) return element;
        return createElement(Panel, e.props as Record<string, unknown>);
    } catch {
        return element;
    }
}

/** The class behind every context menu Steam opens (showContextMenu → CreateContextMenuInstance). */
export const findMenuManager: () => Manager | null = memoLookup('context-menu manager', () =>
    findModuleExport((e: any) => typeof e === 'function' && typeof e.prototype?.CreateContextMenuInstance === 'function') as Manager | null);

const installed = new WeakMap<object, () => void>();

/** Test seam: patches `M` so its game menus open in `Panel` where `styled(target)`. Installing twice is a no-op; the remover unpatches. */
export function installGameMenuPatchOn(M: Manager, appActionsMenu: () => unknown, Panel: Panel, styled: (target: unknown) => boolean = () => true): () => void {
    const existing = installed.get(M);
    if (existing) return existing;
    setPanelLive(true);
    const patch = beforePatch(M.prototype, 'CreateContextMenuInstance', (args: unknown[]) => {
        try {
            // Only where the card has its styles: another window, or no class module, keeps Steam's menu.
            if (styled(args[1])) args[0] = swapGameMenu(args[0], appActionsMenu(), Panel);
        } catch { /* Steam's menu as it is */ }
        return args;
    });
    const remove = () => {
        if (installed.get(M) !== remove) return;
        installed.delete(M);
        removePanelRenderPatches();
        try {
            patch.unpatch();
        } catch (error) {
            console.warn(`${LOG_PREFIX} could not remove the game menu patch`, error);
        }
    };
    installed.set(M, remove);
    return remove;
}

/** Steam's game menu, wherever Steam opens it in a styled window, in the Game Glance card; null while Steam's manager is not found. */
export function installGameMenuPatch(): (() => void) | null {
    try {
        const M = findMenuManager();
        return M ? installGameMenuPatchOn(M, () => findMenuModule()?.uU, GameMenuPanel, menuStyled) : null;
    } catch {
        return null;
    }
}
