import { entryOf, type EntryKey } from './settingsModel';

/** What could be read from Steam; every field optional: absent means unreadable, and its rows are left out (spec §3). */
export interface SettingsSnapshot {
    client?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    friendSettings?: Record<string, unknown>;
    timeZone?: string;
    user?: { accountName?: string; balance?: string; familyName?: string; familyMembers?: number; notifications?: Record<string, number> };
    friends?: { online: number; total: number };
    language?: string;
    display?: { description: string; width: number; height: number; refresh: number; hdr: boolean; vrr: boolean } | null;
    audio?: { output?: string; outputVolume?: number; input?: string } | null;
    bluetooth?: { name: string; connected: boolean; kind: 'gamepad' | 'audio' | 'other'; percent?: number }[] | null;
    controllers?: { name: string; wireless: boolean; percent?: number }[];
}
export interface GlanceRow { label: string; value: string }
export interface GlanceItem { name: string; state: string; ok: boolean }
export interface Glance { title: string; description: string; rows: GlanceRow[]; items: GlanceItem[]; inMenu: string | null }

export const onOff = (v: unknown): string | null => (v === true ? 'On' : v === false ? 'Off' : null);
const invertedOnOff = (v: unknown): string | null => onOff(typeof v === 'boolean' ? !v : v);

/** Seconds as Steam's settings show a time: "Never" for 0, "15 min", "1 h", "1 h 30 min". */
export function minutes(sec: unknown): string | null {
    if (typeof sec !== 'number' || !Number.isFinite(sec) || sec < 0) return null;
    if (sec === 0) return 'Never';
    const m = Math.round(sec / 60), h = Math.floor(m / 60), rest = m % 60;
    if (h === 0) return `${m} min`;
    return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const toolName = (v: unknown) => { const s = str(v); return s ? s.split('_').map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ') : null; };
const RECORDING = ['Off', 'In the background', 'Manual']; // sp.js enum 24457: Never 0, Always 1, Manual 2

const DESCRIPTIONS: Record<EntryKey, string> = {
    display: 'Your screen and how Steam draws on it', sound: 'Where sound goes and comes from', bluetooth: 'Paired devices',
    controllers: 'Connected controllers', keyboard: 'Layout and keyboard options', power: 'Sleep and the screen saver',
    ingame: 'The overlay while a game runs', recording: 'Recording while you play', compat: 'Steam Play and Proton',
    downloads: 'Where and when games download', cloud: 'Saves in Steam Cloud', remoteplay: 'Play on and from other devices',
    friends: 'Friends and how they reach you', family: 'Your Steam family', notifications: 'What pops up, and when',
    account: 'Your Steam account', customization: 'Startup movie and Home', accessibility: 'Contrast, motion and reading',
    system: 'Updates, client and time', interface: 'Language and clock', security: 'Lock screen and sign-in',
};
const IN_MENU: Partial<Record<EntryKey, string>> = {
    display: 'Brightness, Auto scale', sound: 'Volume, output and input', bluetooth: 'Bluetooth on and off', power: 'Sleep, restart, shut down',
    ingame: 'Performance overlay level', downloads: "Game Glance's Downloads page", friends: 'Status', notifications: 'Notifications page',
};

function rowsFor(s: SettingsSnapshot, key: EntryKey): [string, string | null][] {
    const c = s.client ?? {}, st = s.settings ?? {}, f = s.friendSettings ?? {}, u = s.user ?? {};
    switch (key) {
        case 'display': {
            const d = s.display, scale = num(st.flCurrentDisplayScaleFactor);
            const auto = st.bDisplayIsUsingAutoScale === true ? 'Auto' : st.bDisplayIsUsingAutoScale === false ? 'Manual' : null;
            return [['Display', d?.description ?? null], ['Resolution', d ? `${d.width} × ${d.height}` : null], ['Refresh rate', d ? `${d.refresh} Hz` : null],
                ['HDR', d ? onOff(d.hdr) : null], ['Scale', auto && scale !== null ? `${auto} · ${Math.round(scale * 100)}%` : null]];
        }
        case 'sound': {
            const a = s.audio;
            return [['Output', a?.output ?? null], ['Volume', a?.outputVolume !== undefined ? `${Math.round(a.outputVolume)}%` : null], ['Input', a?.input ?? null]];
        }
        case 'power':
            return [['Sleep on battery', minutes(c.system_idle_suspend_battery_sec)], ['Sleep plugged in', minutes(c.system_idle_suspend_ac_sec)],
                ['Screen saver plugged in', minutes(c.system_idle_screensaver_ac_sec)]];
        case 'ingame': {
            const corner = num(c.overlay_fps_counter_corner);
            return [['Overlay', onOff(c.enable_overlay)], ['Performance overlay', corner === null ? null : corner > 0 ? 'On' : 'Off'],
                ['Screenshot notification', onOff(c.enable_screenshot_notification)]];
        }
        case 'recording': {
            const mode = num(c.gamerecording_background_mode), keep = str(c.gamerecording_background_max_keep), fps = num(c.gamerecording_max_fps);
            return [['Mode', mode !== null ? RECORDING[mode] ?? null : null], ['Keep', keep ? keep.replace(/^(\d+)\s*min$/, '$1 min') : null], ['Max frame rate', fps !== null ? `${fps} fps` : null]];
        }
        case 'compat':
            return [['Steam Play', onOff(st.bCompatEnabledForOtherTitles)], ['Default tool', toolName(st.strCompatTool)], ['Shader pre-caching', onOff(c.enable_shader_precache)]];
        case 'downloads': {
            const regions = Array.isArray(st.vecValidDownloadRegions) ? st.vecValidDownloadRegions as { nRegionID?: unknown; strRegionName?: unknown }[] : [];
            const region = regions.find(r => r?.nRegionID === c.download_region);
            return [['Region', str(region?.strRegionName)], ['Download while playing', onOff(c.download_while_app_running)], ['Limit while streaming', onOff(c.download_throttle_while_streaming)]];
        }
        case 'cloud': return [['Steam Cloud', onOff(c.cloud_enabled)]];
        case 'friends':
            return [['Friends online', s.friends ? `${s.friends.online} of ${s.friends.total}` : null], ['Do Not Disturb', onOff(f.bDoNotDisturbMode)], ['Sign into friends', onOff(f.bSignIntoFriends)]];
        case 'family': return [['Family', str(u.familyName)], ['Members', typeof u.familyMembers === 'number' && u.familyMembers > 0 ? String(u.familyMembers) : null]];
        case 'notifications': {
            const items = num(u.notifications?.inventory_items);
            return [['All toasts', invertedOnOff(c.disable_all_toasts)], ['In game', invertedOnOff(c.disable_toasts_in_game)], ['New items', items !== null && items > 0 ? String(items) : null]];
        }
        case 'account': return [['Account', str(u.accountName)], ['Wallet', str(u.balance)]];
        case 'customization': {
            const movie = str(c.startup_movie_id);
            return [['Startup movie', movie === null ? null : movie === '0' ? 'Default' : 'Custom'], ['Store content on Home', onOff(c.show_store_content_on_home)]];
        }
        case 'accessibility':
            return [['High contrast', onOff(c.accessibility_high_contrast_mode)], ['Reduce motion', onOff(c.accessibility_reduce_motion)],
                ['Screen reader', onOff(c.accessibility_screen_reader_enabled)], ['Mono audio', onOff(c.accessibility_mono_audio)]];
        case 'system': return [['Client', str(st.strCurrentBetaName)], ['Time zone', str(s.timeZone)]];
        case 'interface': return [['Language', str(s.language)], ['24-hour clock', onOff(f.b24HourClock)]];
        default: return [];
    }
}

function itemsFor(s: SettingsSnapshot, key: EntryKey): GlanceItem[] {
    const pct = (p?: number) => (typeof p === 'number' ? ` · ${Math.round(p)}%` : '');
    if (key === 'bluetooth') return (s.bluetooth ?? []).map(d => ({ name: d.name, state: d.connected ? `Connected${pct(d.percent)}` : 'Not connected', ok: d.connected }));
    if (key === 'controllers') return (s.controllers ?? []).map(c => ({ name: c.name, state: c.wireless ? `Wireless${pct(c.percent)}` : 'Wired', ok: true }));
    return [];
}

/** The panel for an entry (spec §3): its heading, what could be read, and what the Game Glance menu already covers. */
export function glanceFor(snap: SettingsSnapshot, key: EntryKey): Glance {
    let rows: GlanceRow[] = [], items: GlanceItem[] = [];
    try {
        rows = rowsFor(snap, key).filter((r): r is [string, string] => r[1] !== null).map(([label, value]) => ({ label, value }));
        items = itemsFor(snap, key);
    } catch { /* Steam changed a store: the heading and the jump stay */ }
    const menu = IN_MENU[key];
    return { title: entryOf(key).name, description: DESCRIPTIONS[key], rows, items, inMenu: menu ? `Already in the menu: ${menu}` : null };
}
