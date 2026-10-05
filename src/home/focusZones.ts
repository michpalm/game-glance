/**
 * Home's focus zones, top to bottom. Up/down moves between zones (Steam's own spatial navigation does the
 * moving; these rules say where it should land), left/right moves within one. The recents card row is display
 * only (bumper navigation): it is not a zone, L1/R1 on the action row changes the selected game, and so do Left
 * past the row's first button and Right past its last (edgeStep). Pure.
 */
export type Zone = 'actions' | 'tabs' | 'feed';

const ORDER: Zone[] = ['actions', 'tabs', 'feed'];

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
 * Where B goes: feed -> tabs -> actions. From the actions Home does not handle B at all ('stock'), so Steam's
 * own handling applies and the user is never trapped.
 */
export function onBack(zone: Zone): Zone | 'stock' {
    switch (zone) {
        case 'feed':
            return 'tabs';
        case 'tabs':
            return 'actions';
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
 * Edge navigation on the action row: Left on its first button (the Play pill) steps to the previous game, Right on
 * its last button to the next one; anywhere else Left/Right just move between the buttons (Steam's own navigation, so
 * null). `at`: the focused button's index among the row's `buttons` (-1: unknown, nothing happens). A held direction
 * (`isRepeat`) never crosses, so holding Right walks to the last button and stops there instead of running through games.
 */
export function edgeStep(button: number, at: number, buttons: number, isRepeat = false): -1 | 1 | null {
    if (isRepeat || !Number.isInteger(at) || at < 0 || !Number.isFinite(buttons) || at >= buttons) return null;
    if (button === DIR_LEFT && at === 0) return -1;
    if (button === DIR_RIGHT && at === buttons - 1) return 1;
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
