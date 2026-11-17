import { SLOT_INDEXES, type SlotIndex } from '../logic/infoSlots';

/** View ids Game Glance's settings push on the menu stack (from Navigate's Game Glance tile), and where focus returns when B leaves each one. */
export const GAME_GLANCE_VIEW = 'game-glance';
/** Navigate's Game Glance tile (NavigatePanel), which opens GAME_GLANCE_VIEW. */
export const GAME_GLANCE_TILE = 'navigate:game-glance';
export const HOME_ROW_VIEW = 'gg:home:row';
export const GAME_INFO_VIEW = 'gg:game-page:info';
export const VERSIONS_VIEW = 'gg:general:versions';
/** Quick settings' Wi-Fi page, opened from its Wi-Fi row (spec 2026-11-13-console-settings-design, Part 1). */
export const WIFI_VIEW = 'quick:wifi-page';
export const WIFI_ROW = 'quick:wifi';
/** A Wi-Fi network's own page (Disconnect, Join, Forget), by its access point key; B returns to its row. */
const WIFI_NETWORK_PREFIX = 'quick:wifi-network:';
export const wifiNetworkView = (key: string) => `${WIFI_NETWORK_PREFIX}${key}`;
export function parseWifiNetworkView(viewId: string | undefined): string | null {
    return viewId?.startsWith(WIFI_NETWORK_PREFIX) ? viewId.slice(WIFI_NETWORK_PREFIX.length) : null;
}

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
    if (viewId === GAME_GLANCE_VIEW) return GAME_GLANCE_TILE;
    if (viewId === WIFI_VIEW) return WIFI_ROW;
    const network = parseWifiNetworkView(viewId);
    if (network !== null) return `wifi:${network}`;
    if (viewId === HOME_ROW_VIEW) return 'gg:home:games';
    const slot = viewId === undefined ? null : parseInfoView(viewId);
    if (slot !== null) return `gg:game-page:slot:${slot}`;
    if (viewId === VERSIONS_VIEW) return 'gg:general:versions';
    const category = /^gg:([a-z-]+)$/.exec(viewId ?? '');
    return category ? `gg:card:${category[1]}` : null;
}
