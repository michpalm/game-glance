/**
 * Home's motion timings in one place (ms). Switching games (L1/R1) must feel immediate, so every per-switch
 * transition is short; the feed sheet's raise and the open-to-details transition (OPEN_TIMINGS) keep their
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
/** A fast L1/R1 run's end (home/fastCycle): the selected card widens this quickly, alone. */
export const SETTLE_WIDEN_MS = 160;
export const SHEET = `${SHEET_MS}ms ${SHEET_EASE}`;
export const FEED_SCROLL = `${FEED_SCROLL_MS}ms ${SHEET_EASE}`;

/** How many games on each side of the selected one get their hero art pre-loaded and decoded. */
export const HERO_PRELOAD_RADIUS = 2;
/** Pre-loading waits this long after a selection settles, so a fast run of L1/R1 does not queue loads for every game. */
export const HERO_PRELOAD_DELAY_MS = 150;

/**
 * The open transition (Home to the game page; spec docs/superpowers/specs/2026-10-09-open-transition-design.md), ms
 * unless noted. leave: the game cards row drops `leaveDrop` canvas px and fades; infoFade: the info button fades;
 * morph: Home's elements move to the page's places; feedHero / feedUi: a feed card's game's hero fades in over Home
 * and Home's UI fades out; bridgeFade: the frozen copy of Home fades off the page; readyCap: the longest the copy
 * waits for the page; revealDelay / reveal: the page's new parts fade in (rising `feedRise` css px when the whole
 * page arrives).
 */
export const OPEN_TIMINGS = {
    leave: 220,
    infoFade: 180,
    morph: 450,
    /** The morph's first 40%: Home's moving text hands over to its page-sized twins (home/openTwins), opacity only. */
    twinFade: 180,
    /** At the hand-over, the twins glide onto the page's text as measured (home/openTwins.settleDelta). */
    settleGlide: 150,
    /** The morph's last part, as it comes to rest: the page's exact look (the glass's blur, the pill's round ends) fades in. */
    settle: 180,
    /** The page's parts Home draws as it turns into it (the description, the HowLongToBeat card's rest) fade in, done at the hand-over. */
    extras: 250,
    feedHero: 300,
    feedUi: 220,
    bridgeFade: 300,
    /**
     * The morph's copy of Home fades in over live Home before the page opens: live Home's moved text and logo are drawn
     * soft (an animated layer's raster), the copy crisp, and replacing one by the other in a frame read as a pop.
     */
    bridgeIn: 150,
    /** Emergency escape only: cold native hero visibility exceeded 500 ms on the Ally. Ready pages hand off early. */
    readyCap: 2000,
    revealDelay: 0,
    reveal: 200,
    leaveDrop: 70,
    feedRise: 14,
} as const;
/**
 * The morph's easing: a gentle start and a long, soft landing (the prototype's .2,.8,.2,1 jumped off the press and
 * still crept at the end; Michael on the device: slower and smoother, so the hand-over cannot be seen).
 */
export const MORPH_EASE = 'cubic-bezier(.3,.55,.15,1)';

/**
 * The way back (B from a game, news or store page): Home is just there, as when B comes during the open. Steam's own
 * page fades are off while Home returns (the page leaving is hidden at once, Home is not faded in from black; Steam's
 * leave animation, 0.2 s delay + 0.6 s, must be over before they come back: `hold`), the art is up on Home's first frame,
 * and Home's title, chips, buttons and row fade in over it (`fade`). Probed on the Ally: Home mounts 50-70 ms after B,
 * then Steam waited ~0.7 s, faded the page to black and Home in from black (~0.8 s).
 */
export const RETURN_TIMINGS = { fade: 200, hold: 1500 } as const;
