/**
 * Home's motion timings in one place (ms). Switching games (L1/R1) must feel immediate, so every per-switch
 * transition is short; the feed sheet's raise and the open-to-details transition (openTransition.TIMINGS) keep their
 * own, longer timings. Pure constants.
 *
 * Measured on the Ally, docked, 120 Hz (C12): the old switch missed about 21 of 65 frames in its first 800 ms, with
 * 40-50 ms spikes. Nearly all of that was the root's `--glance-accent` transition. A registered, inherited custom
 * property animated on `.gh-root` makes Chrome recalculate the style of all ~184 Home elements on every frame
 * (UpdateLayoutTree 7-17 ms per frame for 500 ms). Layout of the resizing cards was about 0.3 ms per frame. So the
 * accent variable itself never transitions: it changes at once, and only the few accent-coloured elements fade
 * their own background (ACCENT_MS), which recalculates just those elements.
 */

/** Hero art crossfade on a game switch (was 700). */
export const HERO_FADE_MS = 260;
/** Recents row slide and the selected card's widening (was 380 ms, cubic-bezier(.2,.8,.2,1)). */
export const SLIDE_MS = 220;
export const SLIDE_EASE = 'cubic-bezier(.2,.9,.25,1)';
/** Per-element accent fades: Play pill, chip fill, card bars, Library cell, tab underline (was 500 via the root variable). */
export const ACCENT_MS = 280;
/** A card's dim/border change as the selection moves (was 300). */
export const CAP_STATE_MS = 220;
/** The selected card's wide art fading in over its portrait (was 350). */
export const CAP_ART_FADE_MS = 160;

/** Unchanged: the feed sheet rising (and the hero dim that goes with it), the feed row's scroll and its card art. */
export const SHEET_MS = 500;
export const SHEET_EASE = 'cubic-bezier(.2,.8,.2,1)';
export const FEED_SCROLL_MS = 380;
export const FEED_ART_FADE_MS = 350;

/** CSS shorthands. */
export const SLIDE = `${SLIDE_MS}ms ${SLIDE_EASE}`;
export const SHEET = `${SHEET_MS}ms ${SHEET_EASE}`;
export const FEED_SCROLL = `${FEED_SCROLL_MS}ms ${SHEET_EASE}`;

/** How many games on each side of the selected one get their hero art pre-loaded and decoded. */
export const HERO_PRELOAD_RADIUS = 2;
/** Pre-loading waits this long after a selection settles, so a fast run of L1/R1 does not queue loads for every game. */
export const HERO_PRELOAD_DELAY_MS = 150;
