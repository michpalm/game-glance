import { Focusable, Menu, MenuItem, showContextMenu } from '@decky/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LOG_PREFIX } from '../constants';
import { NSL_IDS, NSL_PLAYER_ID, NSL_STORAGE_KEY, nslPresent, pressNsl, readThemeMusic, themeMusicRows, type ThemeMusicAction, type ThemeMusicMenuState, type ThemeMusicState } from '../data/themeMusic';
import { appButtonsSelector } from '../styles/theme';
import { useSettings } from '../data/settings';
import { homeMode } from '../home/mode';

/** NSL's own buttons and its inline hint take no room: ours stands in for them. */
const HIDE_NSL = `${Object.values(NSL_IDS).map((id) => `#${id}`).join(', ')} { display: none !important; }`;
/**
 * Always the row's last button, after cloud and any other add-on's (Steam's row is a flex row). Dimmed while silent.
 * While the page arrives from Home (Home's copy draws no music button) it is in place but unseen, then fades in with
 * the page's other new parts (themeCss buildArrivingCss: ARRIVE_MS 200).
 */
const OWN_CSS = `.gg-music-choice { order: 99 !important; position: relative; }
.gg-music-choice svg { width: calc(24px * var(--gg-d, 1)); height: calc(24px * var(--gg-d, 1)); }
.gg-music-choice.gg-music-off svg { opacity: 0.45; }
.gg-music-choice.gg-music-choice { transition: opacity 200ms ease, transform 250ms, box-shadow 250ms !important; }
.gg-music-choice.gg-music-choice.gg-music-arriving { opacity: 0 !important; transition: none !important; }`;

interface PageWindow {
    localStorage?: Storage;
    __THEMEMUSIC_CURRENT_GAME_NAME__?: unknown;
    music?: { diagnose?: () => { navigationNodes?: unknown } };
}

/** NSL's state as the page sees it now. */
function readState(doc: Document): ThemeMusicState {
    const win = doc.defaultView as unknown as PageWindow | null;
    let raw: string | null = null;
    try {
        raw = win?.localStorage?.getItem(NSL_STORAGE_KEY) ?? null;
    } catch {
        raw = null;
    }
    const key = typeof win?.__THEMEMUSIC_CURRENT_GAME_NAME__ === 'string' ? win.__THEMEMUSIC_CURRENT_GAME_NAME__ : null;
    return readThemeMusic(raw, key, !!doc.getElementById(NSL_PLAYER_ID));
}

/** NSL put its buttons in Steam's focus tree (its normal mode); its mouse-only fallback has no nodes. */
function controllerMode(doc: Document): boolean {
    try {
        const nodes = (doc.defaultView as unknown as PageWindow | null)?.music?.diagnose?.().navigationNodes;
        return typeof nodes === 'number' ? nodes > 0 : true;
    } catch {
        return true;
    }
}

/** NSL's theme music is running in this window: its script sets this flag long before it injects its buttons. */
function nslActive(doc: Document): boolean {
    return (doc.defaultView as unknown as { __THEMEMUSIC_LOADED__?: unknown } | null)?.__THEMEMUSIC_LOADED__ === true || nslPresent(doc);
}

/**
 * Where ours goes: Steam's round-button group on this game's page (the one near our hero; a page being left can still be
 * in the document), and the classes to wear (Steam's own first circle there, the controller button, as NSL's clones do).
 * Found as soon as Steam draws the row, so ours is in place before NSL injects anything.
 */
function findRow(doc: Document): { row: Element; className: string } | null {
    const group = appButtonsSelector();
    const nsl = doc.getElementById(NSL_IDS.mute);
    let row: Element | null = nsl && group ? nsl.closest(group) : null;
    if (!row && group) {
        row = [...doc.querySelectorAll(group)].find((g) => {
            for (let el: Element | null = g.parentElement, i = 0; el && i < 12; el = el.parentElement, i++) if (el.querySelector('.gg-hero')) return true;
            return false;
        }) ?? null;
    }
    if (!row) return null;
    const source = [...row.querySelectorAll<HTMLElement>('[role="button"]')].find((el) => !el.id.startsWith('my-custom-') && !el.classList.contains('gg-music-choice'));
    const className = source ? [...source.classList].filter((c) => !c.startsWith('gpfocus')).join(' ') : '';
    return className ? { row, className } : null;
}

const same = (a: ThemeMusicState, b: ThemeMusicState) => a.masterOn === b.masterOn && a.gameMuted === b.gameMuted && a.playing === b.playing && a.game === b.game;

/**
 * The open menu. Steam's MenuItem with bInteractableItem runs onClick and keeps the menu open (it skips ForceHide), so a
 * choice updates the rows in place: the cursor stays on the row, a switch flips its On / Off.
 */
function ThemeMusicMenu({ doc, title, start, run }: { doc: Document; title: string; start: ThemeMusicMenuState; run: (action: ThemeMusicAction) => Promise<void> }) {
    const [state, setState] = useState(() => readState(doc));
    const [menu, setMenu] = useState(start);
    const busy = useRef(false);
    const choose = async (action: ThemeMusicAction) => {
        if (busy.current) return;
        busy.current = true;
        try {
            await run(action);
            setState(readState(doc));
            if (action === 'next' || action === 'previous') setMenu((m) => ({ ...m, skipped: true, kept: false }));
            if (action === 'keep') setMenu((m) => ({ ...m, skipped: false, kept: true }));
        } finally {
            busy.current = false;
        }
    };
    return (
        <Menu label={title} cancelText="Close">
            {themeMusicRows(state, menu).map((r) => (
                <MenuItem key={r.action} bInteractableItem disabled={r.disabled} onClick={() => void choose(r.action)}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1.5em', width: '100%', opacity: r.disabled ? 0.45 : 1 }}>
                        <span>{r.label}</span>
                        {r.value && <span style={{ opacity: r.value === 'On' ? 1 : 0.6, fontWeight: 600 }}>{r.value}</span>}
                    </span>
                </MenuItem>
            ))}
        </Menu>
    );
}

function NoteIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 17.5V6.6l11-2.1v10.9a3 3 0 1 1-2-2.83V8.1l-7 1.35v8.05a3 3 0 1 1-2-2.83z" />
        </svg>
    );
}

/**
 * NonSteamLaunchers' theme music as one button at the end of the Play row (data/themeMusic): its four buttons are
 * hidden, and A on ours opens a menu of what NSL can do now. Nothing renders without NSL. Lives in the page's window
 * (`doc`); the row is found again whenever the page changes, as NSL re-injects its buttons.
 */
export function ThemeMusicButton({ doc, appId, arriving = false }: { doc: Document | null; appId: number; arriving?: boolean }) {
    const [row, setRow] = useState<{ row: Element; className: string } | null>(null);
    const [state, setState] = useState<ThemeMusicState | null>(null);
    const skipped = useRef(false);
    const anchor = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        skipped.current = false;
    }, [appId]);

    useEffect(() => {
        if (!doc?.body) return undefined;
        let frame = 0;
        const check = () => {
            frame = 0;
            const found = nslActive(doc) ? findRow(doc) : null;
            setRow((prev) => (prev?.row === found?.row && prev?.className === found?.className ? prev : found));
            const next = found ? readState(doc) : null;
            setState((prev) => (prev && next && same(prev, next) ? prev : next));
        };
        const schedule = () => {
            if (!frame) frame = doc.defaultView?.requestAnimationFrame(check) ?? 0;
        };
        check();
        // NSL injects late and re-injects on re-renders; its labels change when music is muted or turned off.
        const observer = new MutationObserver(schedule);
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
        return () => {
            observer.disconnect();
            if (frame) doc.defaultView?.cancelAnimationFrame(frame);
        };
    }, [doc, appId]);

    const run = useCallback(async (action: ThemeMusicAction) => {
        if (!doc) return;
        try {
            if (action === 'next' || action === 'previous') skipped.current = true;
            if (action === 'keep') skipped.current = false;
            await pressNsl(doc, action, controllerMode(doc));
            setState(readState(doc));
        } catch (error) {
            console.warn(`${LOG_PREFIX} theme music ${action} failed`, error);
        }
    }, [doc]);

    const open = useCallback(() => {
        if (!doc || !anchor.current) return;
        // Steam greys a row only when it becomes disabled while open, so rows dim themselves (opacity on the label).
        showContextMenu(
            <ThemeMusicMenu doc={doc} title="Theme music" start={{ skipped: skipped.current, kept: false, canKeep: controllerMode(doc) }} run={run} />,
            anchor.current,
        );
    }, [doc, run]);

    // NSL's own buttons are hidden from the page's first frame, found or not (they flashed while the page arrived).
    if (!doc || !row || !state || !row.row.isConnected) return <style>{HIDE_NSL}</style>;
    const silent = !state.masterOn || state.gameMuted;
    const label = !state.masterOn ? 'Theme music: off' : state.gameMuted ? 'Theme music: muted for this game' : 'Theme music';
    return (
        <>
            <style>{HIDE_NSL}</style>
            <style>{OWN_CSS}</style>
            {createPortal(
                <Focusable ref={anchor} className={`${row.className} gg-music-choice${silent ? ' gg-music-off' : ''}${arriving ? ' gg-music-arriving' : ''}`} role="button" aria-label={label}
                    noFocusRing onActivate={open} onClick={open}>
                    <NoteIcon />
                </Focusable>,
                row.row,
            )}
        </>
    );
}

export const THEME_MUSIC_COMPONENT = 'GameGlanceThemeMusic';
const PARKING_ID = 'gg-nsl-parking';

/**
 * Moves NSL's injected buttons out of whatever row it put them in, into a hidden holder of ours in <body>. NSL injects
 * into any row with a "Configure Controller" button, Spotlight Home's open-transition copy included; even hidden, its
 * five elements count as children there, so Home's positional rules (:nth-child) landed on the wrong circles and the
 * gear jumped during the open (mutation log on the PS5, 2026-11-18). NSL only re-injects when its music button is not
 * connected, so once parked it never touches a row again; its listeners move with the elements, so pressNsl still works.
 * True when it moved any.
 */
export function parkNsl(doc: Document): boolean {
    const music = doc.getElementById(NSL_IDS.music);
    if (!music || music.parentElement?.id === PARKING_ID || !doc.body) return false;
    let holder = doc.getElementById(PARKING_ID);
    if (!holder) {
        holder = doc.createElement('div');
        holder.id = PARKING_ID;
        holder.hidden = true;
        holder.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(holder);
    }
    for (const id of Object.values(NSL_IDS)) {
        const el = doc.getElementById(id);
        if (el && el.parentElement !== holder) holder.appendChild(el);
    }
    return true;
}

/**
 * NSL's own buttons stay out of sight for the whole session while the restyled game page is on, where our one music
 * button stands in for them: parked (parkNsl) as soon as NSL injects them, and hidden by CSS as a fallback. A global
 * component (index.tsx), so both are in place before any page opens; tied to the page they came too late and NSL's
 * buttons flashed and wrapped the row during the open transition (filmed on the PS5, 2026-11-18).
 */
export function ThemeMusicHide() {
    const settings = useSettings();
    const on = settings.enabled && homeMode(settings).restyleDetails;
    const marker = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const doc = marker.current?.ownerDocument;
        if (!on || !doc?.body) return undefined;
        const park = () => {
            try { parkNsl(doc); } catch (error) { console.warn(`${LOG_PREFIX} theme music parking failed`, error); }
        };
        park();
        // The page window's own MutationObserver (NSL's runs there). Parking still lands ~30 ms after NSL's insert on
        // the PS5, so a frame or two can show NSL's elements in a row; hidden by HIDE_NSL, and Home's circle counting
        // leaves them out (home/circles HOME_CIRCLE), so nothing visible depends on this timing.
        const Observer = (doc.defaultView as unknown as { MutationObserver?: typeof MutationObserver } | null)?.MutationObserver ?? MutationObserver;
        const observer = new Observer(park);
        observer.observe(doc.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [on]);
    return (
        <>
            <span ref={marker} style={{ display: 'none' }} />
            {on && <style>{HIDE_NSL}</style>}
        </>
    );
}
