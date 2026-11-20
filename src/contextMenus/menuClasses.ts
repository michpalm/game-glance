import { findClassModule } from '@decky/ui';
import { memoLookup } from '../home/moduleLookup';

/** The hashed classes of Steam's gamepad context menu that the restyle uses (probed on the Ally, 2026-11-12). */
export type MenuClasses = Partial<Record<'active' | 'BasicContextMenuContainer' | 'BasicContextMenuHeader' | 'contextMenu' | 'contextMenuContents' | 'contextMenuItem'
    | 'hasSubMenu' | 'Selected' | 'Focused' | 'Destructive' | 'MenuSectionHeader' | 'SubMenu' | 'ContextMenuSeparator' | 'Label' | 'Arrow', string>>;

/** Steam's context-menu class module, or null while it cannot be found (then Steam's menus keep their look). */
export const menuClasses: () => MenuClasses | null = memoLookup('context-menu classes', () =>
    (findClassModule((m: Record<string, string>) => Boolean(m.BasicContextMenuContainer && m.contextMenuItem && m.ContextMenuSeparator)) || null) as MenuClasses | null);
