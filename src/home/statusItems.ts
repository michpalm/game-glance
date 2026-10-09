import { FRIEND_COLOURS, isAwayState, isOnlineState } from './friends';

/**
 * Spotlight Home's status bar (top-right, in Steam's top strip): the clock, the battery and the connection, read from
 * Steam's own client callbacks (statusStore), and a dot for your own online status from Steam's friend store. Everything here is pure: formatting and turning Steam's raw payloads into
 * what the bar shows. Anything unknown comes back as null and the bar leaves that item out.
 */

/** Below this battery level (and not charging) the battery shows in the "bad" colour. */
export const LOW_BATTERY = 0.2;

/** The bar's cross-fade when focus moves into Steam's own top bar and back. */
export const STATUS_FADE_MS = 150;

export interface BatteryView {
    /** 0..100, rounded. */
    percent: number;
    charging: boolean;
    low: boolean;
}

export type ConnectionKind = 'wifi' | 'wired' | 'offline';

/** "16:20" (24 h, hours padded) or "4:20 PM" (12 h). */
export function formatClock(date: Date, hours24: boolean): string {
    const h = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, '0');
    if (hours24) return `${String(h).padStart(2, '0')}:${mm}`;
    return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Milliseconds until the next minute starts (the clock's next tick), at least 1. */
export function msToNextMinute(date: Date): number {
    return Math.max(1, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()));
}

/** A `b24HourClock` value as a choice, or null when it is not one. */
function clockChoice(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (value === 0 || value === 1) return value === 1;
    return null;
}

type ClockGlobals = {
    settingsStore?: { m_FriendSettings?: { b24HourClock?: unknown } };
    friendStore?: { m_ChatStore?: { m_SettingsStore?: Record<string, unknown> } };
};

/**
 * Steam's clock setting (Settings > System's 24-hour clock is the friends setting `b24HourClock`), else the locale's
 * own default; never throws. Current Steam keeps it in `settingsStore.m_FriendSettings`; older builds in the friends
 * chat store, still read as a fallback.
 */
export function prefers24Hour(globals: unknown, localeHour12: boolean | undefined): boolean {
    try {
        const g = globals as ClockGlobals | null | undefined;
        const current = clockChoice(g?.settingsStore?.m_FriendSettings?.b24HourClock);
        if (current !== null) return current;
        const chat = g?.friendStore?.m_ChatStore?.m_SettingsStore;
        for (const key of ['m_FriendsSettings', 'FriendsSettings']) {
            const older = clockChoice((chat?.[key] as { b24HourClock?: unknown } | undefined)?.b24HourClock);
            if (older !== null) return older;
        }
    } catch {
        // fall through to the locale
    }
    return localeHour12 === false;
}

// Steam's battery enums (SteamClient.System.RegisterForBatteryStateChanges).
const AC_CONNECTED = [2, 3]; // EACState Connected, ConnectedSlow
const BATTERY_CHARGING = 2; // EBatteryState
const BATTERY_FULL = 3;

/**
 * Steam's battery payload ({ bHasBattery, eACState, eBatteryState, flLevel 0..1 }) as the bar shows it; null with no
 * battery (a desktop, or the payload is unusable): the battery is then left out. Charging shows the bolt; full on the
 * charger does too (it is plugged in).
 */
export function readBattery(raw: unknown): BatteryView | null {
    if (!raw || typeof raw !== 'object') return null;
    const b = raw as { bHasBattery?: unknown; eACState?: unknown; eBatteryState?: unknown; flLevel?: unknown };
    if (b.bHasBattery !== true) return null;
    if (typeof b.flLevel !== 'number' || !Number.isFinite(b.flLevel)) return null;
    const level = Math.min(1, Math.max(0, b.flLevel));
    const charging = b.eBatteryState === BATTERY_CHARGING || (b.eBatteryState === BATTERY_FULL && AC_CONNECTED.includes(Number(b.eACState)));
    return { percent: Math.round(level * 100), charging, low: !charging && level < LOW_BATTERY };
}

// --- Steam's network device list: a CMsgNetworkDevicesData protobuf (SteamClient.System.Network.RegisterForDeviceChanges).

/** Raw bytes from what Steam passes: an ArrayBuffer, a typed array, or base64 text; null otherwise. */
export function toBytes(raw: unknown): Uint8Array | null {
    try {
        if (raw instanceof Uint8Array) return raw;
        if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
        if (ArrayBuffer.isView(raw)) return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        if (typeof raw === 'string' && typeof atob === 'function') return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    } catch {
        // not bytes
    }
    return null;
}

type Field = { n: number; varint?: number; bytes?: Uint8Array };

/** The top-level fields of one protobuf message (varints and length-delimited only; fixed fields are skipped). Throws on malformed input. */
export function protoFields(buf: Uint8Array): Field[] {
    const fields: Field[] = [];
    let i = 0;
    const varint = (): number => {
        let value = 0;
        let mul = 1;
        for (let shift = 0; shift < 64; shift += 7) {
            if (i >= buf.length) throw new Error('truncated varint');
            const byte = buf[i++];
            value += (byte & 0x7f) * mul;
            mul *= 128;
            if ((byte & 0x80) === 0) return value;
        }
        throw new Error('varint too long');
    };
    while (i < buf.length) {
        const key = varint();
        const n = Math.floor(key / 8);
        const wire = key % 8;
        if (wire === 0) fields.push({ n, varint: varint() });
        else if (wire === 2) {
            const len = varint();
            if (i + len > buf.length) throw new Error('truncated field');
            fields.push({ n, bytes: buf.subarray(i, i + len) });
            i += len;
        } else if (wire === 1) i += 8;
        else if (wire === 5) i += 4;
        else throw new Error(`unsupported wire type ${wire}`);
        if (i > buf.length) throw new Error('truncated fixed field');
    }
    return fields;
}

export interface NetworkDevices {
    /** A Wi-Fi access point is active (connected). */
    wifi: boolean;
    /** A wired device has its cable in. */
    wired: boolean;
}

/**
 * The parts of CMsgNetworkDevicesData the bar needs (field numbers from Steam's steammessages_client_objects.proto):
 * devices = 1 { wired = 9 { is_cable_present = 1 }, wireless = 10 { aps = 1 { is_active = 4 } } }. Null when the
 * payload is not that message.
 */
export function readNetworkDevices(raw: unknown): NetworkDevices | null {
    const bytes = toBytes(raw);
    if (!bytes) return null;
    try {
        const result: NetworkDevices = { wifi: false, wired: false };
        for (const device of protoFields(bytes)) {
            if (device.n !== 1 || !device.bytes) continue;
            for (const part of protoFields(device.bytes)) {
                if (part.n === 9 && part.bytes) {
                    if (protoFields(part.bytes).some((f) => f.n === 1 && f.varint === 1)) result.wired = true;
                } else if (part.n === 10 && part.bytes) {
                    for (const ap of protoFields(part.bytes)) {
                        if (ap.n === 1 && ap.bytes && protoFields(ap.bytes).some((f) => f.n === 4 && f.varint === 1)) result.wifi = true;
                    }
                }
            }
        }
        return result;
    } catch {
        return null;
    }
}

// Steam's connectivity test results (SteamClient.System.Network.RegisterForConnectivityTestChanges): 1 Connected; 2
// captive portal, 3 timed out, 4 failed, 5 Wi-Fi off and 6 no LAN all mean no internet; 0 is unknown.
const CONNECTED = 1;
const NOT_CONNECTED = [2, 3, 4, 5, 6];

/** The connectivity test's verdict: true online, false offline, null not known (yet, or still checking). */
export function readConnectivity(raw: unknown): boolean | null {
    if (!raw || typeof raw !== 'object') return null;
    const result = (raw as { eConnectivityTestResult?: unknown }).eConnectivityTestResult;
    if (result === CONNECTED) return true;
    if (typeof result === 'number' && NOT_CONNECTED.includes(result)) return false;
    return null;
}

/**
 * Which connection icon shows, or null for none (nothing known yet). The connectivity test decides online/offline when
 * it has an answer; otherwise an active device counts as online (a device list with none active is not taken as
 * offline on its own: only the test says offline). Online: a plugged-in cable wins (the system routes over it), else
 * Wi-Fi; online with no device list known shows Wi-Fi.
 */
export function connectionKind(online: boolean | null, devices: NetworkDevices | null): ConnectionKind | null {
    const deviceUp = devices && (devices.wired || devices.wifi) ? true : null;
    const up = online ?? deviceUp;
    if (up === null) return null;
    if (!up) return 'offline';
    if (devices?.wired) return 'wired';
    return 'wifi';
}

// --- Your own online status: a dot right of the pill.

/** The dot's states: online (or in a game), away (away or snooze), off (invisible or offline). */
export type PersonaDot = 'online' | 'away' | 'off';

/** The dot's colours: the Friends tab's (friends.FRIEND_COLOURS), so your status reads like your friends'. */
export const PERSONA_DOT_COLOURS: Record<PersonaDot, string> = {
    online: FRIEND_COLOURS.online,
    away: FRIEND_COLOURS.away,
    off: 'rgba(196,201,209,.85)',
};

/** The dot's size and its gap to the pill, in canvas px. */
export const PERSONA_DOT = { size: 12, gap: 10 } as const;

/**
 * The fallback place of the status bar, in canvas px: the dot's right edge 32 from the screen's right edge, the bar's
 * centre line 32 down, the usual gap to the pill. Used only when the canvas scale is unusable (see `statusPlacement`).
 */
export const STATUS_BAR = { right: 32, centreY: 32, gap: 10 } as const;

/** A place for the status bar, in canvas px: the dot's right edge from the screen's right edge, the bar's centre line from its top, the pill-to-dot gap. */
export interface StatusPlacement {
    right: number;
    centreY: number;
    gap: number;
}

/**
 * The status bar's pill ends 52 css px from the screen's right edge and the dot is centred in that span (26 px from the
 * edge, so as far from the pill as from the screen's edge). The bar's vertical centre is Steam's top bar's (20 css px down,
 * whatever the screen size, probed on the Ally at 828x466, 1280x800, 1500x844 and 1920x1080).
 */
export const STATUS_LAYOUT = { pillFromRight: 52, centreFromTop: 20 } as const;

/**
 * Where the status bar goes for a canvas that is drawn `canvasScale` css px per canvas px (Home's own scale); the bar is
 * itself enlarged by `statusScale` from its right edge, so the dot and gap are worked out at that effective scale. Pure.
 */
export function statusPlacement(canvasScale: number): StatusPlacement {
    if (!(canvasScale > 0) || !Number.isFinite(canvasScale)) return STATUS_BAR;
    const tenth = (n: number) => Math.round(n * 10) / 10;
    const e = canvasScale * statusScale(canvasScale); // css px per bar px
    const centre = STATUS_LAYOUT.pillFromRight / 2;
    return {
        right: tenth((centre - (PERSONA_DOT.size / 2) * e) / canvasScale),
        centreY: tenth(STATUS_LAYOUT.centreFromTop / canvasScale),
        gap: tenth(centre / e - PERSONA_DOT.size / 2),
    };
}

export interface SelfPersona {
    state: number;
    inGame: boolean;
}

/**
 * Your own persona from Steam's friend store, null when Steam has not loaded it; never throws. You live on the friends
 * UI store (`friendStore.m_FriendsUIFriendStore`): its `m_eUserPersonaState` is the status you chose (and Steam's
 * auto-away), the fallback is `self.persona.m_ePersonaState`; the game comes from `self.persona`.
 */
export function readSelfPersona(globals: unknown): SelfPersona | null {
    try {
        type Self = { persona?: Record<string, unknown> } | undefined;
        type Ui = { m_eUserPersonaState?: unknown; self?: Self; m_self?: Self };
        const store = (globals as { friendStore?: Ui & { m_FriendsUIFriendStore?: Ui } })?.friendStore;
        const ui = store?.m_FriendsUIFriendStore;
        const persona = (ui?.self ?? ui?.m_self ?? store?.self ?? store?.m_self)?.persona;
        const chosen = ui?.m_eUserPersonaState ?? store?.m_eUserPersonaState;
        const state = typeof chosen === 'number' ? chosen : persona?.m_ePersonaState;
        if (typeof state !== 'number' || !Number.isFinite(state)) return null;
        return { state, inGame: Number(persona?.m_unGamePlayedAppID) > 0 };
    } catch {
        return null;
    }
}

/** The dot for a persona, null when unknown (the dot is then left out). In a game counts as online, as on the Friends tab. */
export function personaDot(self: SelfPersona | null): PersonaDot | null {
    if (!self) return null;
    if (self.inGame) return 'online';
    if (!isOnlineState(self.state)) return 'off';
    return isAwayState(self.state) ? 'away' : 'online';
}

/**
 * How much the status bar is enlarged beyond its canvas scale so it is never smaller than at the docked 1500 px layout (canvas
 * scale about 1): on the 828 px handheld the canvas scale is .575 and the bar would be tiny next to Steam's own top bar. 1 from scale 1 up.
 */
export function statusScale(canvasScale: number): number {
    return Number.isFinite(canvasScale) && canvasScale > 0 && canvasScale < 1 ? Math.round((1 / canvasScale) * 1000) / 1000 : 1;
}
