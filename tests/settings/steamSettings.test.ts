import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSettingsReaders } from '../../src/settings/steamSettings';

const backend = (extra: Record<string, unknown> = {}) => ({ pairedDevices: async () => [], controllerBatteries: () => [], language: () => undefined, ...extra });
const persona = (state: number) => ({ m_persona: { m_ePersonaState: state } });
const ps5Globals = () => ({
    settingsStore: {
        m_ClientSettings: { cloud_enabled: true }, m_Settings: { strCompatTool: 'proton_11' }, m_FriendSettings: { b24HourClock: true },
        m_strTimeZoneID: { m_currentValue: 'Europe/Paris' },
    },
    App: { m_CurrentUser: { strAccountName: 'micpaal', strAccountBalance: '', strFamilyGroupName: 'Palma', rgFamilyGroupMembers: [1, 2, 3], NotificationCounts: { inventory_items: 17 } } },
    friendStore: { allFriends: [persona(0), persona(1), persona(0), persona(0), persona(0), persona(0), persona(0), persona(0)] },
    ControllerStore: { m_controllerList: [{ strName: 'Bity', bWireless: true, eControllerType: 30, nControllerIndex: 0 }] },
});

afterEach(() => { vi.useRealTimers(); });

describe('readNow', () => {
    it("maps the PS5's values", () => {
        const s = createSettingsReaders(ps5Globals(), backend({ controllerBatteries: () => [{ name: 'Bity', percent: 64 }], language: () => 'english' })).readNow();
        expect(s.client).toEqual({ cloud_enabled: true });
        expect(s.timeZone).toBe('Europe/Paris');
        expect(s.friends).toEqual({ online: 1, total: 8 });
        expect(s.user).toEqual({ accountName: 'micpaal', balance: '', familyName: 'Palma', familyMembers: 3, notifications: { inventory_items: 17 } });
        expect(s.controllers).toEqual([{ name: 'Bity', wireless: true, percent: 64 }]);
        expect(s.language).toBe('English');
    });
    it('nothing there gives an empty snapshot', () => {
        expect(createSettingsReaders({}, backend()).readNow()).toEqual({});
    });
    it('a store that throws leaves only its part out (Review Focus 1)', () => {
        const g: Record<string, unknown> = ps5Globals();
        Object.defineProperty(g, 'settingsStore', { get() { throw new Error('gone'); } });
        const s = createSettingsReaders(g, backend()).readNow();
        expect(s.client).toBeUndefined();
        expect(s.friends).toEqual({ online: 1, total: 8 });
    });
    it("the first controller's route parts", () => {
        expect(createSettingsReaders(ps5Globals(), backend()).firstController()).toEqual({ type: 30, index: 0 });
        expect(createSettingsReaders({}, backend()).firstController()).toBeNull();
    });
});

describe('readLive (Review Focus 2)', () => {
    const state = { displays: [{ description: 'LG Electronics LG TV SSCR2', is_primary: true, is_enabled: true, current_mode_id: 0, modes: [{ id: 0, width: 1920, height: 1080, refresh_hz: 60 }], is_hdr_output_active: true, is_vrr_output_active: true }] };
    const audio = { activeOutputDeviceId: 78, activeInputDeviceId: 0, vecDevices: [{ id: 78, sName: 'HDMI', bHasOutput: true, bHasInput: false, flOutputVolume: 0.5 }] };
    it('reads display, audio and paired devices', async () => {
        const g = { ...ps5Globals(), SystemDisplayManagerStore: { GetState: async () => state }, SteamClient: { System: { Audio: { GetDevices: async () => audio } } } };
        const live = await createSettingsReaders(g, backend({ pairedDevices: async () => [{ name: 'Headphones', connected: false, kind: 'audio' }] })).readLive();
        expect(live.display).toEqual({ description: 'LG Electronics LG TV SSCR2', width: 1920, height: 1080, refresh: 60, hdr: true, vrr: true });
        expect(live.audio).toEqual({ output: 'HDMI', outputVolume: 50 });
        expect(live.bluetooth).toEqual([{ name: 'Headphones', connected: false, kind: 'audio' }]);
    });
    it('a failed read is null; a hanging one is null after the limit', async () => {
        vi.useFakeTimers();
        const g = { SystemDisplayManagerStore: { GetState: async () => { throw new Error('x'); } }, SteamClient: { System: { Audio: { GetDevices: () => new Promise(() => {}) } } } };
        const p = createSettingsReaders(g, backend({ pairedDevices: async () => 'nonsense' }), 3000).readLive();
        await vi.advanceTimersByTimeAsync(3000);
        const live = await p;
        expect(live.display).toBeNull();
        expect(live.audio).toBeNull();
        expect(live.bluetooth).toBeNull();
    });
    it('a display with missing numbers or name gives no invented values', async () => {
        const bad = { displays: [{ is_primary: true, is_enabled: true, current_mode_id: 0, modes: [{ id: 0 }], is_hdr_output_active: true }] };
        const g = { SystemDisplayManagerStore: { GetState: async () => bad } };
        expect((await createSettingsReaders(g, backend()).readLive()).display).toBeNull();
    });
});
