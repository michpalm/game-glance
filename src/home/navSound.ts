import { findModule } from '@decky/ui';
import { memoLookup } from './moduleLookup';

/**
 * Steam's navigation sound names used here (its enum, probed on the Ally: ChangeTabs for L1/R1 tabs, FailedNav at an
 * end, BasicNav for a d-pad move). OutOfGameDetail is its "back out of a game page" sound (enum 14, probed 2026-10-21),
 * played when B cancels an open.
 */
export type NavSoundName = 'ChangeTabs' | 'FailedNav' | 'BasicNav' | 'IntoGameDetail' | 'OutOfGameDetail' | 'LaunchGame';

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

/**
 * The sound for one step through Home's games: ChangeTabs for L1/R1 (as on the feed tabs), BasicNav for Left/Right on
 * the game cards (Steam's own d-pad sound, which it no longer plays because Home takes those presses). None when the
 * selection stays (`next` equals `at`) or there is none (`next` null).
 */
export function gameStepSound(at: number, next: number | null, kind: 'bumper' | 'dpad'): NavSoundName | null {
    if (next === null || next === at) return null;
    return kind === 'bumper' ? 'ChangeTabs' : 'BasicNav';
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

/** Puts the player's own method back, if there is a skip pending; set by skipSteamSound. */
let endSkip: (() => void) | null = null;

/**
 * Drops the next play of one of Steam's sounds, by anyone (Steam's own code included), for `ms` at most. Home's Play
 * plays LaunchGame itself, then Steam's Play handler opens the game's page for its launch screen, and in Game Mode
 * Steam's `Navigator.App` plays IntoGameDetail for that: a second sound for one press. The player's `PlayNavSound`
 * is wrapped; every other sound passes through, and the original is put back (as it was: an own property or the
 * prototype's) on the first skipped call or after `ms`; the wrapper then only passes through, even if something else
 * wrapped the method after it. A second call while one is pending replaces it. Nothing happens when Steam's player
 * cannot be found.
 */
export function skipSteamSound(name: NavSoundName, ms: number) {
    try {
        const found = parts();
        const sound = found?.names[name];
        if (!found || typeof sound !== 'number') return;
        endSkip?.();
        const { player } = found;
        const original = player.PlayNavSound;
        const own = Object.prototype.hasOwnProperty.call(player, 'PlayNavSound');
        let timer: ReturnType<typeof setTimeout> | undefined;
        // Once ended the wrapper only passes through: someone may have wrapped the method after us, and then we cannot unhook.
        let done = false;
        const wrapper = function (this: unknown, ...args: [number]) {
            if (!done && args[0] === sound) return end();
            return original.apply(this, args);
        };
        const end = () => {
            done = true;
            clearTimeout(timer);
            if (player.PlayNavSound === wrapper) {
                if (own) player.PlayNavSound = original;
                else delete (player as { PlayNavSound?: unknown }).PlayNavSound;
            }
            if (endSkip === end) endSkip = null;
        };
        player.PlayNavSound = wrapper;
        endSkip = end;
        timer = setTimeout(end, ms);
    } catch {
        // a sound played twice is not worth breaking the press for
    }
}
