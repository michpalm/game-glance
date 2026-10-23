import { CSSProperties, ReactElement, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { avatarView, BatteryView, ControllerBatteryView, controllerItems, batteryColour, downloadStatus, statusAway, ConnectionKind, formatClock, msToNextMinute, PersonaDot, personaDot, prefers24Hour, readSelfPersona, SelfPersona, statusPlacement, statusScale } from './statusItems';
import { COVER_CSS, useHideSteamBar } from './useHideSteamBar';
import { startStatus, statusState, subscribeStatus } from './statusStore';
import { acquireDownloads, activeDownload, subscribeDownloads } from './downloadStore';
import { tr } from '../i18n/steamText';
import { useSettings } from '../data/settings';

/** Steam's clock setting, else the locale's. */
function hours24(): boolean {
    let localeHour12: boolean | undefined;
    try {
        localeHour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
    } catch {
        localeHour12 = undefined;
    }
    return prefers24Hour(globalThis, localeHour12);
}

/** The time as shown, updated at each minute's start (the 12/24 h setting is read again then). */
function useClock(): string {
    const [text, setText] = useState(() => formatClock(new Date(), hours24()));
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            const now = new Date();
            setText(formatClock(now, hours24()));
            timer = setTimeout(tick, msToNextMinute(now));
        };
        timer = setTimeout(tick, msToNextMinute(new Date()));
        return () => clearTimeout(timer);
    }, []);
    return text;
}

function WifiIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M2.5 9a14 14 0 0 1 19 0" />
            <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
            <path d="M8.7 16a5 5 0 0 1 6.6 0" />
            <circle cx="12" cy="19.3" r="1.2" fill="currentColor" stroke="none" />
        </svg>
    );
}

function OfflineIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M2.5 9a14 14 0 0 1 19 0" />
            <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
            <path d="M8.7 16a5 5 0 0 1 6.6 0" />
            <circle cx="12" cy="19.3" r="1.2" fill="currentColor" stroke="none" />
            <path d="M3 3l18 18" strokeWidth={2.2} />
        </svg>
    );
}

function WiredIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="5" width="16" height="12" rx="2" />
            <path d="M9 17v3h6v-3M8 9v3M12 9v3M16 9v3" />
        </svg>
    );
}

function GamepadIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            <path d="M7 6h10a5 5 0 0 1 4.8 6.4l-1.3 4.4a2.5 2.5 0 0 1-4.2 1L14.5 16h-5l-1.8 1.8a2.5 2.5 0 0 1-4.2-1l-1.3-4.4A5 5 0 0 1 7 6z" />
            <path d="M7.5 9.5v3M6 11h3" />
            <circle cx="15.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
    );
}

/**
 * The connected Bluetooth controllers' batteries (lowest first, at most two, then "+n"), in the low colour at or below
 * LOW_BATTERY like the system battery. Nothing without controllers. No hooks: the bar passes the store's list.
 */
export function ControllerItems({ controllers }: { controllers: ControllerBatteryView[] }) {
    const { shown, more } = controllerItems(controllers);
    return (
        <>
            {shown.map((c, i) => (
                <span key={`${c.name}-${i}`} className={`gh-status-item gh-controller${c.low ? ' gh-status-low' : ''}`} aria-label={`${c.name}, ${tr('battery', [c.percent])}`}>
                    <GamepadIcon />
                    {c.percent}%
                </span>
            ))}
            {more > 0 && (
                // English only: Steam's strings have none for this (rare: three or more controllers).
                <span className="gh-status-item gh-controller" aria-label={`${more} more ${more === 1 ? 'controller' : 'controllers'}`}>
                    +{more}
                </span>
            )}
        </>
    );
}

const CONNECTION: Record<ConnectionKind, { icon: () => ReactElement; label: () => string }> = {
    wifi: { icon: WifiIcon, label: () => tr('connected') },
    wired: { icon: WiredIcon, label: () => tr('wired') },
    offline: { icon: OfflineIcon, label: () => tr('offline') },
};

/** The battery outline with its fill at the level; a bolt while charging. */
function BatteryIcon({ battery }: { battery: BatteryView }) {
    const fill = Math.round(15 * battery.percent) / 100;
    const colour = batteryColour(battery.charging);
    return (
        <svg viewBox="0 0 24 18" fill="none" aria-hidden="true" style={colour ? { color: colour } : undefined}>
            <rect x="1" y="3" width="19" height="12" rx="3" stroke="currentColor" strokeWidth={1.6} />
            <rect x="21" y="7" width="2" height="4" rx="1" fill="currentColor" />
            <rect x="3" y="5" width={fill} height="8" rx="1.5" fill="currentColor" />
            {battery.charging && <path d="M12.6 3.6L7.6 9.8h3.2l-1.6 4.6 5.2-6.4h-3.2l1.4-4.4z" fill="#0b0d10" stroke="currentColor" strokeWidth={0.9} strokeLinejoin="round" />}
        </svg>
    );
}

/** How often your own status is read again (Steam's friend store has no change callback here; the Friends tab polls too). */
const PERSONA_POLL_MS = 2000;

/** Your own persona, read now and every PERSONA_POLL_MS; a new object only when something shown changes. */
function useSelfPersona(): SelfPersona | null {
    const [self, setSelf] = useState(() => readSelfPersona(globalThis));
    useEffect(() => {
        const timer = setInterval(() => {
            const next = readSelfPersona(globalThis);
            setSelf((old) => (old && next && old.state === next.state && old.inGame === next.inGame) || old === next ? old : next);
        }, PERSONA_POLL_MS);
        return () => clearInterval(timer);
    }, []);
    return self;
}

/** The running transfer's percent (a primitive, so React sees a change only when it moves), or null (#8). */
const downloadPercent = () => downloadStatus(activeDownload());

/** A download arrow, as Steam's own bar draws its download item. */
function DownloadIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const DOT_LABEL: Record<PersonaDot, () => string> = { online: () => tr('online'), away: () => tr('away'), off: () => `${tr('invisible')} / ${tr('offline')}` };

/**
 * Spotlight Home's status bar: connection, battery and clock in one glass pill at the top-right (homeCss `.gh-status`),
 * then a dot for your own online status. `away` fades it all out while focus is in Steam's own top bar. An item Steam
 * has not reported is left out.
 */
export function StatusBar({ away: topBarFocus, scale }: { away: boolean; scale: number }) {
    useEffect(() => startStatus(), []);
    useEffect(() => acquireDownloads(), []);
    const { battery, connection, controllers } = useSyncExternalStore(subscribeStatus, statusState, statusState);
    const percent = useSyncExternalStore(subscribeDownloads, downloadPercent, downloadPercent);
    const clock = useClock();
    const self = useSelfPersona();
    const dot = personaDot(self);
    const { statusAvatar } = useSettings();
    const avatar = avatarView(self, statusAvatar);
    const conn = connection ? CONNECTION[connection] : null;
    // Steam's own top bar is held hidden under ours (Steam hides it on Home itself, but forgets after sleep); the document is the one this bar is drawn in.
    const [doc, setDoc] = useState<Document | null>(null);
    // Quick Access takes the window's focus while it is open (its window blurs, and focus returns when it closes), so
    // focus is out of this window then: that is what keeps the bar on screen (#15).
    const [focused, setFocused] = useState(true);
    useEffect(() => {
        const win = doc?.defaultView;
        if (!doc || !win) return undefined;
        const sync = () => setFocused(doc.hasFocus());
        sync();
        win.addEventListener('focus', sync);
        win.addEventListener('blur', sync);
        return () => {
            win.removeEventListener('focus', sync);
            win.removeEventListener('blur', sync);
        };
    }, [doc]);
    const away = statusAway(topBarFocus, !focused);
    const marker = useCallback((el: HTMLSpanElement | null) => {
        if (el) setDoc(el.ownerDocument);
    }, []);
    useHideSteamBar(doc, away);
    const place = statusPlacement(scale);
    const style = { '--gh-status-right': `${place.right}px`, '--gh-status-cy': `${place.centreY}px`, '--gh-status-gap': `${place.gap}px`, '--gh-status-k': String(statusScale(scale)) } as CSSProperties;
    return (
        <>
        <span ref={marker} style={{ display: 'none' }} />
        <style>{COVER_CSS}</style>
        <div className={`gh-status${away ? ' gh-status-away' : ''}`} aria-hidden={away} style={style}>
            <div className="gh-status-pill">
                {percent !== null && (
                    <span className="gh-status-item gh-status-download" aria-label={`${tr('download')} ${percent}%`}>
                        <DownloadIcon />
                        {percent}%
                    </span>
                )}
                {conn && (
                    <span className={`gh-status-item gh-status-${connection}`} aria-label={conn.label()}>
                        <conn.icon />
                    </span>
                )}
                <ControllerItems controllers={controllers} />
                {battery && (
                    <span className={`gh-status-item${battery.low ? ' gh-status-low' : ''}`} aria-label={`${tr('battery', [battery.percent])}${battery.charging ? `, ${tr('charging').toLowerCase()}` : ''}`}>
                        <BatteryIcon battery={battery} />
                        {battery.percent}%
                    </span>
                )}
                <span className="gh-status-item">{clock}</span>
                {avatar && dot && (
                    <span className="gh-status-avatar" role="img" aria-label={DOT_LABEL[dot]()} style={{ backgroundImage: `url(${avatar.url})`, '--gh-avatar-ring': avatar.ring } as CSSProperties} />
                )}
            </div>
            {dot && !avatar && <span className={`gh-status-dot gh-status-dot-${dot}`} role="img" aria-label={DOT_LABEL[dot]()} />}
        </div>
        </>
    );
}
