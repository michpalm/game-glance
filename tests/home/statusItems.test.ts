import { describe, expect, it } from 'vitest';
import { STATUS_BAR, connectionKind, formatClock, msToNextMinute, personaDot, prefers24Hour, protoFields, readBattery, readConnectivity, readNetworkDevices, readSelfPersona, statusPlacement, statusScale, toBytes } from '../../src/home/statusItems';

// Minimal protobuf encoder for the fixtures (varint and length-delimited fields).
const varint = (n: number): number[] => {
    const out: number[] = [];
    do {
        let byte = n % 128;
        n = Math.floor(n / 128);
        if (n > 0) byte |= 0x80;
        out.push(byte);
    } while (n > 0);
    return out;
};
const vField = (n: number, value: number) => [...varint(n * 8), ...varint(value)];
const bField = (n: number, bytes: number[]) => [...varint(n * 8 + 2), ...varint(bytes.length), ...bytes];
const str = (s: string) => [...s].map((c) => c.charCodeAt(0));

// CMsgNetworkDevicesData: devices = 1 { id 1, etype 2, estate 3, mac 4 (string), wired 9 { is_cable_present 1 }, wireless 10 { aps 1 { id 1, estrength 2, ssid 3, is_active 4 } } }
const ap = (active: boolean, ssid = 'Home') => bField(1, [...vField(1, 7), ...vField(2, 3), ...bField(3, str(ssid)), ...vField(4, active ? 1 : 0)]);
const wifiDevice = (...aps: number[][]) => bField(1, [...vField(1, 1), ...vField(2, 2), ...vField(3, 5), ...bField(4, str('aa:bb')), ...bField(10, aps.flat())]);
const wiredDevice = (cable: boolean) => bField(1, [...vField(1, 2), ...vField(2, 1), ...bField(9, [...vField(1, cable ? 1 : 0), ...vField(2, 1000)])]);
const message = (...devices: number[][]) => new Uint8Array([...devices.flat(), ...vField(2, 1)]);

describe('formatClock', () => {
    it('24 h pads the hours', () => {
        expect(formatClock(new Date(2026, 9, 6, 16, 20), true)).toBe('16:20');
        expect(formatClock(new Date(2026, 9, 6, 9, 5), true)).toBe('09:05');
        expect(formatClock(new Date(2026, 9, 6, 0, 0), true)).toBe('00:00');
    });
    it('12 h uses 12 for noon and midnight', () => {
        expect(formatClock(new Date(2026, 9, 6, 16, 20), false)).toBe('4:20 PM');
        expect(formatClock(new Date(2026, 9, 6, 0, 7), false)).toBe('12:07 AM');
        expect(formatClock(new Date(2026, 9, 6, 12, 0), false)).toBe('12:00 PM');
        expect(formatClock(new Date(2026, 9, 6, 11, 59), false)).toBe('11:59 AM');
    });
    it('the next tick is at the start of the next minute', () => {
        expect(msToNextMinute(new Date(2026, 9, 6, 16, 20, 45, 500))).toBe(14_500);
        expect(msToNextMinute(new Date(2026, 9, 6, 16, 20, 0, 0))).toBe(60_000);
    });
});

describe('prefers24Hour', () => {
    const steam = (value: unknown) => ({ friendStore: { m_ChatStore: { m_SettingsStore: { m_FriendsSettings: { b24HourClock: value } } } } });
    it("follows Steam's setting when it is known", () => {
        expect(prefers24Hour(steam(true), true)).toBe(true);
        expect(prefers24Hour(steam(false), false)).toBe(false);
        expect(prefers24Hour(steam(1), true)).toBe(true);
    });
    // Where current Steam builds keep it (seen on the Ally 2026-10-09: no friendStore.m_ChatStore any more).
    const settings = (value: unknown) => ({ settingsStore: { m_FriendSettings: { b24HourClock: value } } });
    it("follows Steam's setting in settingsStore, over the locale", () => {
        expect(prefers24Hour(settings(true), true)).toBe(true);
        expect(prefers24Hour(settings(false), false)).toBe(false);
        expect(prefers24Hour(settings(1), true)).toBe(true);
        expect(prefers24Hour(settings(0), false)).toBe(false);
    });
    it('reads settingsStore before the older friendStore place', () => {
        expect(prefers24Hour({ ...settings(true), ...steam(false) }, true)).toBe(true);
        expect(prefers24Hour({ ...settings('yes'), ...steam(true) }, true)).toBe(true);
    });
    it("falls back to the locale's default", () => {
        expect(prefers24Hour(settings(undefined), true)).toBe(false);
        expect(prefers24Hour({}, false)).toBe(true);
        expect(prefers24Hour({}, true)).toBe(false);
        expect(prefers24Hour(null, undefined)).toBe(false);
        expect(prefers24Hour(steam('yes'), false)).toBe(true);
    });
});

describe('readBattery', () => {
    it('rounds the level and flags low under 20% when not charging', () => {
        expect(readBattery({ bHasBattery: true, eACState: 1, eBatteryState: 1, flLevel: 0.694 })).toEqual({ percent: 69, charging: false, low: false });
        expect(readBattery({ bHasBattery: true, eACState: 1, eBatteryState: 1, flLevel: 0.14 })).toEqual({ percent: 14, charging: false, low: true });
    });
    it('charging, or full on the charger, shows the bolt and is never low', () => {
        expect(readBattery({ bHasBattery: true, eACState: 2, eBatteryState: 2, flLevel: 0.1 })).toEqual({ percent: 10, charging: true, low: false });
        expect(readBattery({ bHasBattery: true, eACState: 2, eBatteryState: 3, flLevel: 1 })).toEqual({ percent: 100, charging: true, low: false });
        expect(readBattery({ bHasBattery: true, eACState: 1, eBatteryState: 3, flLevel: 1 })?.charging).toBe(false);
    });
    it('no battery or an unusable payload hides it', () => {
        expect(readBattery({ bHasBattery: false, flLevel: 0.5 })).toBeNull();
        expect(readBattery({ bHasBattery: true })).toBeNull();
        expect(readBattery({ bHasBattery: true, flLevel: NaN })).toBeNull();
        expect(readBattery(null)).toBeNull();
        expect(readBattery('x')).toBeNull();
    });
    it('clamps out-of-range levels', () => {
        expect(readBattery({ bHasBattery: true, flLevel: 1.4 })?.percent).toBe(100);
        expect(readBattery({ bHasBattery: true, flLevel: -1 })?.percent).toBe(0);
    });
});

describe('network devices (CMsgNetworkDevicesData)', () => {
    it('reads an active Wi-Fi access point', () => {
        expect(readNetworkDevices(message(wifiDevice(ap(false, 'Other'), ap(true))))).toEqual({ wifi: true, wired: false });
        expect(readNetworkDevices(message(wifiDevice(ap(false))))).toEqual({ wifi: false, wired: false });
    });
    it('reads a plugged-in cable', () => {
        expect(readNetworkDevices(message(wiredDevice(true), wifiDevice(ap(true))))).toEqual({ wifi: true, wired: true });
        expect(readNetworkDevices(message(wiredDevice(false)))).toEqual({ wifi: false, wired: false });
    });
    it('takes an ArrayBuffer, a typed array view or base64 text', () => {
        const bytes = message(wifiDevice(ap(true)));
        expect(readNetworkDevices(bytes.buffer)).toEqual({ wifi: true, wired: false });
        expect(toBytes(new DataView(bytes.buffer))).toEqual(bytes);
        const base64 = btoa(String.fromCharCode(...bytes));
        expect(readNetworkDevices(base64)).toEqual({ wifi: true, wired: false });
    });
    it('malformed or foreign payloads give null', () => {
        expect(readNetworkDevices(new Uint8Array([0x0a, 0x10, 0x01]))).toBeNull();
        expect(readNetworkDevices({})).toBeNull();
        expect(readNetworkDevices(42)).toBeNull();
        expect(readNetworkDevices('%%%')).toBeNull();
    });
    it('the field reader skips fixed-width fields', () => {
        const buf = new Uint8Array([...varint(1 * 8 + 5), 1, 2, 3, 4, ...varint(2 * 8 + 1), 1, 2, 3, 4, 5, 6, 7, 8, ...vField(3, 300)]);
        expect(protoFields(buf)).toEqual([{ n: 3, varint: 300 }]);
    });
});

describe('connection', () => {
    it("reads Steam's connectivity test", () => {
        expect(readConnectivity({ eConnectivityTestResult: 1 })).toBe(true);
        for (const r of [2, 3, 4, 5, 6]) expect(readConnectivity({ eConnectivityTestResult: r })).toBe(false);
        expect(readConnectivity({ eConnectivityTestResult: 0 })).toBeNull();
        expect(readConnectivity(undefined)).toBeNull();
    });
    it('online: cable over Wi-Fi, Wi-Fi when the devices are unknown', () => {
        expect(connectionKind(true, { wifi: true, wired: true })).toBe('wired');
        expect(connectionKind(true, { wifi: true, wired: false })).toBe('wifi');
        expect(connectionKind(true, null)).toBe('wifi');
    });
    it('offline only on the test saying so', () => {
        expect(connectionKind(false, { wifi: true, wired: false })).toBe('offline');
        expect(connectionKind(null, { wifi: false, wired: false })).toBeNull();
        expect(connectionKind(null, null)).toBeNull();
    });
    it('an active device counts as online before the test answers', () => {
        expect(connectionKind(null, { wifi: true, wired: false })).toBe('wifi');
        expect(connectionKind(null, { wifi: false, wired: true })).toBe('wired');
    });
});

describe('your online status dot', () => {
    const store = (persona: Record<string, unknown>) => ({ friendStore: { self: { persona } } });
    it("reads your persona from the friends UI store, where Steam keeps you", () => {
        const ui = (extra: Record<string, unknown>) => ({ friendStore: { allFriends: [], m_FriendsUIFriendStore: extra } });
        expect(readSelfPersona(ui({ m_eUserPersonaState: 1, self: { persona: { m_ePersonaState: 1, m_unGamePlayedAppID: 0 } } }))).toEqual({ state: 1, inGame: false });
        // The status you chose wins over the persona's (invisible shows as offline to others).
        expect(readSelfPersona(ui({ m_eUserPersonaState: 7, self: { persona: { m_ePersonaState: 0 } } }))?.state).toBe(7);
        // Only one of the two known.
        expect(readSelfPersona(ui({ m_eUserPersonaState: 3 }))).toEqual({ state: 3, inGame: false });
        expect(readSelfPersona(ui({ m_self: { persona: { m_ePersonaState: 3, m_unGamePlayedAppID: 570 } } }))).toEqual({ state: 3, inGame: true });
    });
    it('falls back to self on the friend store itself; nothing known gives null', () => {
        expect(readSelfPersona(store({ m_ePersonaState: 1 }))?.state).toBe(1);
        expect(readSelfPersona({ friendStore: { allFriends: [] } })).toBeNull();
        expect(readSelfPersona({})).toBeNull();
        expect(readSelfPersona(store({ m_ePersonaState: 'x' }))).toBeNull();
        expect(readSelfPersona(null)).toBeNull();
    });
    it('online and busy are green, in a game too; away and snooze blue; invisible and offline grey', () => {
        const dot = (state: number, inGame = false) => personaDot({ state, inGame });
        expect(dot(1)).toBe('online');
        expect(dot(2)).toBe('online');
        expect(dot(3)).toBe('away');
        expect(dot(4)).toBe('away');
        expect(dot(3, true)).toBe('online');
        expect(dot(7)).toBe('off');
        expect(dot(0)).toBe('off');
        expect(personaDot(null)).toBeNull();
    });
});

describe('statusPlacement', () => {
    // The pill ends 52 css px from the screen's right edge; the dot is centred between it and the edge. Everything in css px
    // below is: bar px x the effective scale (canvas scale x statusScale).
    const effective = (scale: number) => scale * statusScale(scale);
    it('centres the dot between the pill and the screen edge at every screen size', () => {
        for (const width of [828, 1280, 1500, 1920]) {
            const scale = width / 1440;
            const e = effective(scale);
            const place = statusPlacement(scale);
            const dotRightCss = place.right * scale;
            const dotLeftCss = dotRightCss + 12 * e;
            const pillRightCss = dotLeftCss + place.gap * e;
            expect(pillRightCss).toBeCloseTo(52, 0);
            expect(dotRightCss).toBeCloseTo(pillRightCss - dotLeftCss, 0); // space right of the dot = space left of it
            expect(place.centreY * scale).toBeCloseTo(20, 1);
        }
    });
    it('gives canvas px for the handheld', () => {
        expect(statusPlacement(0.575)).toEqual({ right: 34.8, centreY: 34.8, gap: 20 });
    });
    it('falls back to the fixed place when the scale is unusable', () => {
        for (const bad of [0, -1, NaN, Infinity]) expect(statusPlacement(bad)).toEqual(STATUS_BAR);
    });
});

describe('statusScale', () => {
    it('enlarges the bar on a small screen so it is never smaller than at scale 1', () => {
        expect(statusScale(0.575)).toBeCloseTo(1.739, 3);
        expect(statusScale(1)).toBe(1);
        expect(statusScale(1.0417)).toBe(1);
        for (const bad of [0, -1, NaN, Infinity]) expect(statusScale(bad)).toBe(1);
    });
});
