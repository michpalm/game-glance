import { ReactElement, useEffect, useState, useSyncExternalStore } from 'react';
import { BatteryView, ConnectionKind, formatClock, msToNextMinute, PersonaDot, personaDot, prefers24Hour, readSelfPersona, SelfPersona } from './statusItems';
import { startStatus, statusState, subscribeStatus } from './statusStore';

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

const CONNECTION: Record<ConnectionKind, { icon: () => ReactElement; label: string }> = {
    wifi: { icon: WifiIcon, label: 'Connected' },
    wired: { icon: WiredIcon, label: 'Wired connection' },
    offline: { icon: OfflineIcon, label: 'Offline' },
};

/** The battery outline with its fill at the level; a bolt while charging. */
function BatteryIcon({ battery }: { battery: BatteryView }) {
    const fill = Math.round(15 * battery.percent) / 100;
    return (
        <svg viewBox="0 0 24 18" fill="none" aria-hidden="true">
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

const DOT_LABEL: Record<PersonaDot, string> = { online: 'Online', away: 'Away', off: 'Invisible or offline' };

/**
 * Spotlight Home's status bar: connection, battery and clock in one glass pill at the top-right (homeCss `.gh-status`),
 * then a dot for your own online status. `away` fades it all out while focus is in Steam's own top bar. An item Steam
 * has not reported is left out.
 */
export function StatusBar({ away }: { away: boolean }) {
    useEffect(() => startStatus(), []);
    const { battery, connection } = useSyncExternalStore(subscribeStatus, statusState, statusState);
    const clock = useClock();
    const self = useSelfPersona();
    const dot = personaDot(self);
    const conn = connection ? CONNECTION[connection] : null;
    return (
        <div className={`gh-status${away ? ' gh-status-away' : ''}`} aria-hidden={away}>
            <div className="gh-status-pill">
                {conn && (
                    <span className={`gh-status-item gh-status-${connection}`} aria-label={conn.label}>
                        <conn.icon />
                    </span>
                )}
                {battery && (
                    <span className={`gh-status-item${battery.low ? ' gh-status-low' : ''}`} aria-label={`Battery ${battery.percent}%${battery.charging ? ', charging' : ''}`}>
                        <BatteryIcon battery={battery} />
                        {battery.percent}%
                    </span>
                )}
                <span className="gh-status-item">{clock}</span>
            </div>
            {dot && <span className={`gh-status-dot gh-status-dot-${dot}`} role="img" aria-label={DOT_LABEL[dot]} />}
        </div>
    );
}
