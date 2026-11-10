import { SLOT_INDEXES, type SlotIndex } from '../logic/infoSlots';

/** View ids the Plugins section pushes on the menu stack, and where focus returns when B leaves each one. */
export const GAME_GLANCE_VIEW = 'game-glance';
export const HOME_ROW_VIEW = 'gg:home:row';
export const GAME_INFO_VIEW = 'gg:game-page:info';
export const VERSIONS_VIEW = 'gg:general:versions';

export function categoryView(id: string): string {
    return `gg:${id}`;
}

export function pluginFocusKey(name: string): string {
    return `plugins:${name}`;
}

/** The slot a game info picker view id names, or null when it is not exactly `${GAME_INFO_VIEW}:0|1|2|featured`. */
export function parseInfoView(viewId: string): SlotIndex | null {
    const prefix = `${GAME_INFO_VIEW}:`;
    if (!viewId.startsWith(prefix)) return null;
    return SLOT_INDEXES.find(slot => String(slot) === viewId.slice(prefix.length)) ?? null;
}

/** The focus key B returns to after leaving `viewId`, or null to keep the one the menu remembered. */
export function returnFocusKey(viewId: string | undefined): string | null {
    if (viewId === GAME_GLANCE_VIEW) return pluginFocusKey('Game Glance');
    if (viewId === HOME_ROW_VIEW) return 'gg:home:games';
    const slot = viewId === undefined ? null : parseInfoView(viewId);
    if (slot !== null) return `gg:game-page:slot:${slot}`;
    if (viewId === VERSIONS_VIEW) return 'gg:general:versions';
    const category = /^gg:([a-z-]+)$/.exec(viewId ?? '');
    return category ? `gg:card:${category[1]}` : null;
}
