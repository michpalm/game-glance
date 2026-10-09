/**
 * Home's focus zones, top to bottom: the action row, the recents card row (where Home's focus starts, as on Steam's
 * own Home), the feed tabs and the feed cards. Up/down moves between zones (Steam's own spatial navigation does the
 * moving; these rules say where it should land), left/right moves within one: on the card row they select the
 * previous / next game (recentsButton). L1/R1 select games too, from the cards or the action row, with focus on Play.
 * Pure.
 */
export type Zone = 'actions' | 'recents' | 'tabs' | 'feed';

const ORDER: Zone[] = ['actions', 'recents', 'tabs', 'feed'];

/**
 * The zone above or below. Stops at the ends. `feedUp`: the feed row can take focus (the selected tab has
 * cards); when false, down from the tabs stays on the tabs.
 */
export function nextZone(zone: Zone, direction: 'up' | 'down', feedUp: boolean): Zone {
    const zones = feedUp ? ORDER : ORDER.filter((z) => z !== 'feed');
    const at = zones.indexOf(zone);
    if (at < 0) return zone === 'feed' ? 'tabs' : zone;
    const to = Math.min(zones.length - 1, Math.max(0, at + (direction === 'down' ? 1 : -1)));
    return zones[to];
}

/**
 * Where B goes: feed -> tabs -> the game cards, and the action row -> the game cards. On the cards (where Home starts)
 * Home does not handle B at all ('stock'), so Steam's own handling applies and the user is never trapped.
 */
export function onBack(zone: Zone): Zone | 'stock' {
    switch (zone) {
        case 'feed':
            return 'tabs';
        case 'tabs':
        case 'actions':
            return 'recents';
        default:
            return 'stock';
    }
}

/** GamepadButton.BUMPER_LEFT / BUMPER_RIGHT in @decky/ui: L1 and R1 (LB and RB). */
const BUMPER_LEFT = 5;
const BUMPER_RIGHT = 6;

/**
 * The feed tab L1/R1 selects, as Steam's own tabbed pages do (probed on the Ally: their `onButtonDown` moves one
 * tab per BUMPER_LEFT/BUMPER_RIGHT). Clamped at the ends, no wrap. null: not a shoulder button, so the event is
 * left to Steam. A broken current tab is clamped into range; no tabs gives 0.
 */
export function tabForButton(tab: number, button: number, tabCount: number): number | null {
    const step = button === BUMPER_LEFT ? -1 : button === BUMPER_RIGHT ? 1 : 0;
    if (step === 0) return null;
    const last = Number.isFinite(tabCount) ? Math.floor(tabCount) - 1 : -1;
    if (last < 0) return 0;
    const at = Number.isFinite(tab) ? Math.min(last, Math.max(0, Math.round(tab))) : 0;
    return Math.min(last, Math.max(0, at + step));
}

/** GamepadButton.SELECT (View) and START (Menu) in @decky/ui. */
const SELECT = 13;
const START = 14;

/**
 * The selected recents item after L1/R1 on the action row (bumper navigation). Items are the games 0..count-1 and
 * the Library card at `count`. A press steps one item and wraps through the Library card (R1: last game -> Library
 * card -> game 1; L1: game 1 -> Library card -> last game). `isRepeat` (the bumper held): steps but stops at the
 * ends (R1 at the Library card, L1 at game 1) instead of looping the row. null: not a bumper or no games, so the
 * event is left to Steam. A broken current index is clamped into 0..count.
 */
export function selectionForButton(index: number, button: number, count: number, isRepeat = false): number | null {
    const step = button === BUMPER_LEFT ? -1 : button === BUMPER_RIGHT ? 1 : 0;
    if (step === 0) return null;
    return stepSelection(index, step, count, isRepeat);
}

/**
 * The selected recents item one step (-1 or 1) from `index`, as L1/R1 step: through the Library card at `count`,
 * wrapping unless `isRepeat` (then it stops at the ends). null: no games. A broken index is clamped into 0..count.
 */
export function stepSelection(index: number, step: -1 | 1, count: number, isRepeat = false): number | null {
    if (!Number.isFinite(count) || count < 1) return null;
    const n = Math.floor(count);
    const at = Number.isFinite(index) ? Math.min(n, Math.max(0, Math.floor(index))) : 0;
    const next = at + step;
    if (isRepeat) return Math.min(n, Math.max(0, next));
    return (next + n + 1) % (n + 1);
}

/** GamepadButton.DIR_LEFT / DIR_RIGHT in @decky/ui: the d-pad and the left stick, which Steam sends as the same buttons. */
const DIR_LEFT = 11;
const DIR_RIGHT = 12;

/**
 * What a button does on the game card row: Left/Right select the previous / next game (`{ select }`, the same step as
 * L1/R1: through the Library card, wrapping on a press, stopping at the ends while held, as Steam repeats a held
 * d-pad); L1/R1 are 'bumper' (focus goes to Play and the action row's bumper selection takes over); View/Menu are
 * 'menu' (the selected game's menu). null: anything else, left to Steam (A, B, up and down). No games: null.
 */
export function recentsButton(button: number, index: number, count: number, isRepeat = false): { select: number } | 'bumper' | 'menu' | null {
    if (!Number.isFinite(count) || count < 1) return null;
    if (button === DIR_LEFT || button === DIR_RIGHT) {
        const next = stepSelection(index, button === DIR_LEFT ? -1 : 1, count, isRepeat);
        return next === null ? null : { select: next };
    }
    if (button === BUMPER_LEFT || button === BUMPER_RIGHT) return 'bumper';
    if (opensGameMenu(button)) return 'menu';
    return null;
}

/**
 * Steam repeats only the d-pad when a button is held (its input layer's repeat set), so Home repeats a held bumper
 * itself: the first repeat after a pause, then a steady rate. 170 ms: the 220 ms slide (motion.SLIDE_MS, a fast-out
 * curve) is about 90% there after ~110 ms, so each card has visibly landed before the next step retargets it,
 * at about six games a second.
 */
export const BUMPER_REPEAT_FIRST_MS = 400;
export const BUMPER_REPEAT_MS = 170;

/** The wait before repeat number `repeats` (0: the first) of a held bumper. */
export function bumperRepeatDelay(repeats: number): number {
    return repeats <= 0 ? BUMPER_REPEAT_FIRST_MS : BUMPER_REPEAT_MS;
}

/** The last step of a held direction on the game cards: when it happened and how many repeats it has had. */
export interface RepeatState {
    at: number;
    repeats: number;
}

/**
 * Paces a held Left/Right on the game cards like a held bumper. Steam repeats a held stick or d-pad itself, much
 * faster than the cards can slide (Ally test: "it doesn't keep up"), so its repeat events are thinned out: a fresh press
 * always steps and starts over; a repeat steps only once bumperRepeatDelay(repeats) has passed since the last step
 * (400 ms for the first, then 170 ms), the rest are swallowed. `last` null: nothing held yet. Pure.
 */
export function repeatStep(now: number, last: RepeatState | null, isRepeat: boolean): { step: boolean; next: RepeatState | null } {
    if (!isRepeat || !last) return { step: true, next: { at: now, repeats: 0 } };
    if (now - last.at < bumperRepeatDelay(last.repeats)) return { step: false, next: last };
    return { step: true, next: { at: now, repeats: last.repeats + 1 } };
}

/**
 * Whether a button opens the selected game's context menu on Home: View/Select (the user's choice) and the Menu
 * button, which Steam's own library capsules and lists use for the same menu ("Options").
 */
export function opensGameMenu(button: number): boolean {
    return button === SELECT || button === START;
}

/**
 * NavEntryPositionPreferences.PREFERRED_CHILD in @decky/ui (kept here so components need no enum at import).
 * On a zone's row, focus entering from another zone lands on the row's `preferredFocus` child (the Play
 * pill, the selected tab or card) instead of the one spatially nearest, as Steam's own forms and tabs do.
 */
export const PREFERRED_CHILD = 4;

/** NavEntryPositionPreferences.FIRST in @decky/ui: focus entering a row lands on its first child. */
export const NAV_FIRST = 0;
