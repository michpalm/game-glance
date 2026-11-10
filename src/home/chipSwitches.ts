/**
 * Which of Home's info chips can be switched off, and their switches. ProtonDB first (off by default: it asks
 * protondb.com about each game); Play time, Space required, Achievements and HowLongToBeat are to join it. A chip that
 * is off is not shown and looks nothing up. Pure.
 */

export const CHIP_SWITCH_IDS = ['protondb'] as const;
export type ChipSwitch = (typeof CHIP_SWITCH_IDS)[number];
export type HomeChips = Record<ChipSwitch, boolean>;

export const HOME_CHIPS_DEFAULT: HomeChips = { protondb: false };

/** A stored value read field by field: a missing or non-boolean field is its default; anything but a plain object is the default. */
export function homeChipsOf(value: unknown): HomeChips {
    const raw = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const out = { ...HOME_CHIPS_DEFAULT };
    for (const id of CHIP_SWITCH_IDS) if (typeof raw[id] === 'boolean') out[id] = raw[id] as boolean;
    return out;
}
