import { findModule } from '@decky/ui';
import { memoLookup } from './moduleLookup';

/** Steam's navigation sound names used here (its enum, probed on the Ally: ChangeTabs for L1/R1 tabs, FailedNav at an end). */
export type NavSoundName = 'ChangeTabs' | 'FailedNav';

interface NavSoundParts {
    player: { PlayNavSound(sound: number): void };
    names: Record<string, unknown>;
}

/**
 * Steam's sound player and its sound names, if `m` is the module that exports both (minified export names change
 * between Steam builds, so they are found by shape: an object with `PlayNavSound`, and an enum with ChangeTabs and
 * BasicNav). Pure; null for anything else.
 */
export function navSoundParts(m: unknown): NavSoundParts | null {
    if (!m || typeof m !== 'object') return null;
    let player: NavSoundParts['player'] | null = null;
    let names: NavSoundParts['names'] | null = null;
    for (const v of Object.values(m as Record<string, unknown>)) {
        if (!v || typeof v !== 'object') continue;
        const o = v as Record<string, unknown>;
        if (typeof o.PlayNavSound === 'function') player = o as unknown as NavSoundParts['player'];
        if (typeof o.ChangeTabs === 'number' && typeof o.BasicNav === 'number') names = o;
    }
    return player && names ? { player, names } : null;
}

/**
 * The sound for L1/R1 on Home's tabs, as on Steam's own tabbed pages: ChangeTabs when the tab changes, FailedNav at
 * an end (`next` is the tab it stays on), none for another button (`next` null). Our handler takes the press before
 * Steam does, so Steam plays nothing itself; the D-pad's moves keep Steam's own sound.
 */
export function shoulderSound(tab: number, next: number | null): NavSoundName | null {
    if (next === null) return null;
    return next === tab ? 'FailedNav' : 'ChangeTabs';
}

const parts = memoLookup<NavSoundParts>('navigation sounds', () => navSoundParts(findModule((m: unknown) => navSoundParts(m) !== null)));

/** Plays one of Steam's navigation sounds; nothing (and no error) when Steam's player cannot be found. */
export function playNavSound(name: NavSoundName) {
    try {
        const found = parts();
        const sound = found?.names[name];
        if (found && typeof sound === 'number') found.player.PlayNavSound(sound);
    } catch {
        // a missing sound is not worth breaking navigation for
    }
}
