/**
 * NonSteamLaunchers' theme music on the game page, seen from Game Glance.
 *
 * NSL's "NSL Game Scanner" service injects a script into Big Picture that plays "<game> Theme Music" from YouTube on
 * every game page, with four buttons cloned from Steam's Configure Controller button (ids below). Game Glance hides
 * those buttons and shows one music button at the end of the Play row instead (components/ThemeMusicButton). Its picker
 * presses NSL's hidden buttons with the events NSL's own listeners answer, so NSL keeps playback and its saved songs,
 * and nothing here runs without NSL.
 *
 * NSL's state lives in the Big Picture window's localStorage ("ThemeMusicData"): `themeMusic` (all music on or off;
 * absent means on), and per game, keyed "<name> Theme Music", `{ muted, videoId }`. The page's game key is
 * `window.__THEMEMUSIC_CURRENT_GAME_NAME__`; the hidden player is the element with id PLAYER_ID.
 */

export const NSL_IDS = {
    left: 'my-custom-left-arrow',
    music: 'my-custom-music-button',
    mute: 'my-custom-mute-button',
    right: 'my-custom-right-arrow',
    message: 'my-custom-paste-message',
} as const;

export const NSL_STORAGE_KEY = 'ThemeMusicData';
export const NSL_PLAYER_ID = 'steam-theme-youtube';

/** NSL's hold-to-save threshold is 450 ms; hold a little longer. */
const KEEP_HOLD_MS = 600;
const A = 1;

export interface ThemeMusicState {
    /** All theme music on (NSL's master switch). */
    masterOn: boolean;
    /** This game's music muted. */
    gameMuted: boolean;
    /** NSL's hidden player exists (music is playing or loading). */
    playing: boolean;
    /** NSL's key for this game ("<name> Theme Music"), or null when unknown. */
    game: string | null;
}

export type ThemeMusicAction = 'next' | 'previous' | 'keep' | 'gameMute' | 'master';

export interface ThemeMusicRow {
    action: ThemeMusicAction;
    label: string;
    /** A switch's state, shown at the right ("On" / "Off"); absent for actions. */
    value?: 'On' | 'Off';
    /** Shown but greyed out: the menu keeps the same rows in the same places whatever the state. */
    disabled: boolean;
}

/** What happened in the open menu that its rows reflect. */
export interface ThemeMusicMenuState {
    /** A song was picked with Next or Previous during this visit: NSL holds a song that Keep would save. */
    skipped: boolean;
    /** Keep was just used: the row says so until the next skip. */
    kept: boolean;
    /** NSL is in its controller mode (keeping needs the A hold). */
    canKeep: boolean;
}

const truthy = (v: unknown) => v === true || v === 'true';

/** NSL's state from its raw ThemeMusicData, for `game` (falls back to its currentlyPlaying name). */
export function readThemeMusic(raw: string | null, game: string | null, playing: boolean): ThemeMusicState {
    let data: Record<string, unknown> = {};
    try {
        const parsed: unknown = raw === null ? {} : JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
    } catch {
        data = {};
    }
    const masterOn = data.themeMusic === undefined ? true : truthy(data.themeMusic);
    const current = (data.currentlyPlaying as { name?: unknown } | undefined)?.name;
    const key = game ?? (typeof current === 'string' ? current : null);
    const entry = key ? (data[key] as { muted?: unknown } | undefined) : undefined;
    return { masterOn, gameMuted: truthy(entry?.muted), playing, game: key };
}

/** NSL's buttons are on this page (its master button is always injected, even with music off). */
export function nslPresent(doc: Document): boolean {
    return !!doc.getElementById(NSL_IDS.mute);
}

function fire(el: Element, type: string, detail: unknown, win: typeof globalThis | null): void {
    const Ctor = (win as { CustomEvent?: typeof CustomEvent } | null)?.CustomEvent ?? CustomEvent;
    // Not bubbling: only NSL's own listeners on the button should see it, not Steam's handlers above.
    el.dispatchEvent(new Ctor(type, { detail, bubbles: false, cancelable: true }));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Press NSL's hidden button for `action`, with the events its listeners answer. `controller`: NSL registered its
 * buttons in Steam's focus tree (its normal mode, where "this game" listens for A down/up); without it, NSL's mouse
 * fallback listens for real clicks (event.detail !== 0) instead. False when the button is missing.
 */
export async function pressNsl(doc: Document, action: ThemeMusicAction, controller: boolean, wait: (ms: number) => Promise<void> = sleep): Promise<boolean> {
    const win = doc.defaultView as unknown as typeof globalThis | null;
    const id = action === 'next' ? NSL_IDS.right : action === 'previous' ? NSL_IDS.left : action === 'master' ? NSL_IDS.mute : NSL_IDS.music;
    const el = doc.getElementById(id);
    if (!el) return false;
    switch (action) {
        case 'next':
        case 'previous':
            fire(el, 'click', 0, win);
            return true;
        case 'master':
            fire(el, 'vgp_onbuttondown', { button: A }, win);
            return true;
        case 'gameMute':
            if (controller) {
                fire(el, 'vgp_onbuttondown', { button: A }, win);
                fire(el, 'vgp_onbuttonup', { button: A }, win);
            } else {
                fire(el, 'click', 1, win);
            }
            return true;
        case 'keep':
            fire(el, 'vgp_onbuttondown', { button: A }, win);
            await wait(KEEP_HOLD_MS);
            fire(el, 'vgp_onbuttonup', { button: A }, win);
            return true;
    }
}

/**
 * The menu's rows: always the same five, in the same order, so a choice never moves the cursor or changes the menu
 * under it. Switches show their state at the right; rows that can't act now are greyed out.
 */
export function themeMusicRows(state: ThemeMusicState, menu: ThemeMusicMenuState): ThemeMusicRow[] {
    const audible = state.masterOn && !state.gameMuted;
    return [
        { action: 'next', label: 'Next song', disabled: !audible },
        { action: 'previous', label: 'Previous song', disabled: !audible },
        { action: 'keep', label: menu.kept ? 'Song kept' : 'Keep this song', disabled: !audible || !menu.canKeep || !menu.skipped },
        { action: 'gameMute', label: 'Music for this game', value: state.gameMuted ? 'Off' : 'On', disabled: !state.masterOn },
        { action: 'master', label: 'All theme music', value: state.masterOn ? 'On' : 'Off', disabled: false },
    ];
}
