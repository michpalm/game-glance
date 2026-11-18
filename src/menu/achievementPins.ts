/**
 * Pinned achievements on the menu's Achievements page (spec 2026-11-18): per set, at most two, oldest first.
 * Y pins or unpins; a third replaces the oldest. Saved in settings as achievementPins[pinSlot(app, set)]. Pure.
 */
export const MAX_PINS = 2;

/** A set's key in settings.achievementPins. */
export function pinSlot(appId: number, setId: number): string {
    return `${appId}:${setId}`;
}

/** Unpins `key` if pinned, else pins it last, dropping the oldest beyond MAX_PINS. */
export function togglePin(pins: readonly number[], key: number): number[] {
    if (pins.includes(key)) return pins.filter(k => k !== key);
    return [...pins, key].slice(-MAX_PINS);
}
