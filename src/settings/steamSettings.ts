import { callable } from '@decky/api';
import { getSteamLanguage } from '../data/steam';
import { statusState } from '../home/statusStore';
import type { SettingsSnapshot } from './settingsGlance';

type Live = Pick<SettingsSnapshot, 'display' | 'audio' | 'bluetooth'>;
export interface SettingsReaders {
    /** Plain field reads from Steam's stores; never throws. */
    readNow(): SettingsSnapshot;
    /** Display, sound and paired Bluetooth devices; each part null when it fails or takes longer than the limit. */
    readLive(): Promise<Live>;
    /** The first connected controller's type and index, for Steam's Controllers route; null when none. */
    firstController(): { type: number; index: number } | null;
}
export interface SettingsBackend {
    pairedDevices(): Promise<unknown>;
    controllerBatteries(): { name: string; percent: number }[];
    language(): string | undefined;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined => (v && typeof v === 'object' ? v as Obj : undefined);
const safe = <T,>(fn: () => T): T | undefined => { try { return fn(); } catch { return undefined; } };
const KINDS = new Set(['gamepad', 'audio', 'other']);

function withLimit<T>(work: () => Promise<T>, ms: number): Promise<T | null> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), ms);
        Promise.resolve().then(work).then(v => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(null); });
    });
}

/**
 * Reads the Settings home's values from Steam (spec Constraints): plain fields of settingsStore, App.m_CurrentUser,
 * friendStore and ControllerStore, plus two reads whose sources were checked in sp.js (display manager state, audio
 * devices). Nothing here changes a setting.
 */
export function createSettingsReaders(globals: Obj, backend: SettingsBackend, timeoutMs = 3000): SettingsReaders {
    const g = (key: string) => safe(() => globals[key]);
    const controllerList = () => safe(() => obj(g('ControllerStore'))?.m_controllerList) as Obj[] | undefined;

    const readNow = (): SettingsSnapshot => {
        const snap: SettingsSnapshot = {};
        const store = obj(g('settingsStore'));
        if (store) {
            const client = obj(safe(() => store.m_ClientSettings)), settings = obj(safe(() => store.m_Settings)), friend = obj(safe(() => store.m_FriendSettings));
            if (client) snap.client = client;
            if (settings) snap.settings = settings;
            if (friend) snap.friendSettings = friend;
            const tz = safe(() => obj(store.m_strTimeZoneID)?.m_currentValue);
            if (typeof tz === 'string' && tz) snap.timeZone = tz;
        }
        const user = obj(safe(() => obj(g('App'))?.m_CurrentUser));
        if (user) {
            const members = safe(() => user.rgFamilyGroupMembers);
            const counts = obj(user.NotificationCounts);
            snap.user = {
                ...(typeof user.strAccountName === 'string' ? { accountName: user.strAccountName } : {}),
                ...(typeof user.strAccountBalance === 'string' ? { balance: user.strAccountBalance } : {}),
                ...(typeof user.strFamilyGroupName === 'string' ? { familyName: user.strFamilyGroupName } : {}),
                ...(Array.isArray(members) ? { familyMembers: members.length } : {}),
                ...(counts ? { notifications: counts as Record<string, number> } : {}),
            };
        }
        const friends = safe(() => obj(g('friendStore'))?.allFriends);
        if (Array.isArray(friends)) {
            const online = friends.filter(f => { const p = obj(obj(f)?.m_persona) ?? obj(obj(f)?.persona); return typeof p?.m_ePersonaState === 'number' && p.m_ePersonaState > 0; }).length;
            snap.friends = { online, total: friends.length };
        }
        const lang = safe(() => backend.language());
        if (typeof lang === 'string' && lang) snap.language = lang.charAt(0).toUpperCase() + lang.slice(1);
        const list = controllerList();
        if (Array.isArray(list) && list.length > 0) {
            const batteries = safe(() => backend.controllerBatteries()) ?? [];
            snap.controllers = list.filter(c => typeof c?.strName === 'string').map(c => {
                const battery = batteries.find(b => b.name === c.strName);
                return { name: c.strName as string, wireless: c.bWireless === true, ...(battery ? { percent: battery.percent } : {}) };
            });
        }
        return snap;
    };

    const readDisplay = async (): Promise<SettingsSnapshot['display']> => {
        const state = obj(await (obj(g('SystemDisplayManagerStore'))?.GetState as () => Promise<unknown>)());
        const displays = (Array.isArray(state?.displays) ? state!.displays : []) as Obj[];
        const d = displays.find(x => x.is_primary && x.is_enabled) ?? displays.find(x => x.is_enabled);
        const mode = (Array.isArray(d?.modes) ? d!.modes as Obj[] : []).find(m => m.id === d?.current_mode_id);
        const fin = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
        const width = fin(mode?.width), height = fin(mode?.height), refresh = fin(mode?.refresh_hz);
        const description = [d?.description, d?.name].find((v): v is string => typeof v === 'string' && v.length > 0);
        // Nothing made up (final review): a display missing its size, rate or name gives no display rows at all.
        if (!d || !mode || width === null || height === null || refresh === null || !description) return null;
        return { description, width, height, refresh, hdr: d.is_hdr_output_active === true, vrr: d.is_vrr_output_active === true };
    };
    const readAudio = async (): Promise<SettingsSnapshot['audio']> => {
        const audioApi = obj(obj(obj(g('SteamClient'))?.System)?.Audio);
        const devices = obj(await (audioApi?.GetDevices as () => Promise<unknown>)());
        const list = (Array.isArray(devices?.vecDevices) ? devices!.vecDevices : []) as Obj[];
        const out = list.find(x => x.id === devices?.activeOutputDeviceId && x.bHasOutput), inp = list.find(x => x.id === devices?.activeInputDeviceId && x.bHasInput);
        if (!out && !inp) return null;
        return {
            ...(typeof out?.sName === 'string' ? { output: out.sName } : {}),
            ...(typeof out?.flOutputVolume === 'number' ? { outputVolume: Math.round(out.flOutputVolume * 100) } : {}),
            ...(typeof inp?.sName === 'string' ? { input: inp.sName } : {}),
        };
    };
    const readPaired = async (): Promise<SettingsSnapshot['bluetooth']> => {
        const raw = await backend.pairedDevices();
        if (!Array.isArray(raw)) return null;
        return raw.flatMap(d => {
            const o = obj(d);
            if (!o || typeof o.name !== 'string' || typeof o.connected !== 'boolean') return [];
            const kind = KINDS.has(o.kind as string) ? o.kind as 'gamepad' | 'audio' | 'other' : 'other';
            return [{ name: o.name, connected: o.connected, kind, ...(typeof o.percent === 'number' ? { percent: o.percent } : {}) }];
        });
    };

    return {
        readNow: () => safe(readNow) ?? {},
        async readLive() {
            const [display, audio, bluetooth] = await Promise.all([withLimit(readDisplay, timeoutMs), withLimit(readAudio, timeoutMs), withLimit(readPaired, timeoutMs)]);
            return { display: display ?? null, audio: audio ?? null, bluetooth: bluetooth ?? null };
        },
        firstController() {
            const c = controllerList()?.find(x => typeof x?.eControllerType === 'number' && typeof x?.nControllerIndex === 'number');
            return c ? { type: c.eControllerType as number, index: c.nControllerIndex as number } : null;
        },
    };
}

let shared: SettingsReaders | null = null;
let language: string | undefined;
/** The readers on Steam's globals and Game Glance's backend, made on first use. */
export function sharedSettingsReaders(): SettingsReaders {
    if (shared) return shared;
    void getSteamLanguage().then(l => { language = l; }).catch(() => undefined);
    const paired = callable<[], unknown>('get_bluetooth_devices');
    shared = createSettingsReaders(globalThis as unknown as Obj, {
        pairedDevices: () => paired(),
        controllerBatteries: () => statusState().controllers.map(c => ({ name: c.name, percent: c.percent })),
        language: () => language,
    });
    return shared;
}
