import { describe, expect, it } from 'vitest';
import { glanceFor, minutes, onOff, type SettingsSnapshot } from '../../src/settings/settingsGlance';
import { GROUPS } from '../../src/settings/settingsModel';

// The PS5's values, read 2026-11-19.
const ps5: SettingsSnapshot = {
    client: {
        gamescope_hdr_enabled: true, system_idle_suspend_battery_sec: 900, system_idle_suspend_ac_sec: 3600, system_idle_screensaver_ac_sec: 300,
        enable_overlay: true, overlay_fps_counter_corner: 0, enable_screenshot_notification: true,
        gamerecording_background_mode: 0, gamerecording_background_max_keep: '120min', gamerecording_max_fps: 60,
        enable_shader_precache: true, download_region: 66, download_while_app_running: false, download_throttle_while_streaming: true,
        cloud_enabled: true, disable_all_toasts: false, disable_toasts_in_game: false, startup_movie_id: '0', show_store_content_on_home: true,
        accessibility_high_contrast_mode: false, accessibility_reduce_motion: false, accessibility_screen_reader_enabled: false, accessibility_mono_audio: false,
    },
    settings: { bDisplayIsUsingAutoScale: true, flCurrentDisplayScaleFactor: 1.2798104286193848, bCompatEnabledForOtherTitles: true, strCompatTool: 'proton_11', strCurrentBetaName: 'Steam Deck Stable', vecValidDownloadRegions: [{ nRegionID: 66, strRegionName: 'Europe - France' }] },
    friendSettings: { bDoNotDisturbMode: false, b24HourClock: true, bSignIntoFriends: true },
    timeZone: 'Europe/Paris',
    user: { accountName: 'micpaal', balance: '', familyName: 'Palma', familyMembers: 3, notifications: { inventory_items: 17 } },
    friends: { online: 1, total: 8 },
    language: 'English',
    display: { description: 'LG Electronics LG TV SSCR2', width: 1920, height: 1080, refresh: 60, hdr: true, vrr: true },
    audio: { output: 'Cyan Skillfish HDMI/DP Audio Controller', outputVolume: 50 },
    bluetooth: [{ name: 'DualSense Wireless Controller', connected: true, kind: 'gamepad', percent: 12 }, { name: 'Headphones', connected: false, kind: 'audio' }],
    controllers: [{ name: 'Bity', wireless: true, percent: 64 }],
};
const rows = (k: Parameters<typeof glanceFor>[1], s = ps5) => glanceFor(s, k).rows.map(r => [r.label, r.value]);

describe('glance', () => {
    it('Display', () => {
        expect(rows('display')).toEqual([['Display', 'LG Electronics LG TV SSCR2'], ['Resolution', '1920 × 1080'], ['Refresh rate', '60 Hz'], ['HDR', 'On'], ['Scale', 'Auto · 128%']]);
    });
    it('Power and the formats', () => {
        expect(minutes(900)).toBe('15 min');
        expect(minutes(3600)).toBe('1 h');
        expect(minutes(0)).toBe('Never');
        expect(minutes(5400)).toBe('1 h 30 min');
        expect(minutes('x')).toBeNull();
        expect(onOff(true)).toBe('On'); expect(onOff(false)).toBe('Off'); expect(onOff('yes')).toBeNull();
        expect(rows('power')).toEqual([['Sleep on battery', '15 min'], ['Sleep plugged in', '1 h'], ['Screen saver plugged in', '5 min']]);
    });
    it('Downloads region by name; an unknown id leaves the row out', () => {
        expect(rows('downloads')[0]).toEqual(['Region', 'Europe - France']);
        const other = { ...ps5, client: { ...ps5.client, download_region: 999 } };
        expect(rows('downloads', other).some(r => r[0] === 'Region')).toBe(false);
    });
    it('Compatibility tool name', () => {
        expect(rows('compat')).toContainEqual(['Default tool', 'Proton 11']);
    });
    it('Friends online', () => {
        expect(rows('friends')[0]).toEqual(['Friends online', '1 of 8']);
    });
    it('Recording and in-game read Steam\'s values', () => {
        expect(rows('recording')[0]).toEqual(['Mode', 'Off']);
        expect(rows('ingame')).toContainEqual(['Performance overlay', 'Off']);
    });
    it('Bluetooth and controller items', () => {
        expect(glanceFor(ps5, 'bluetooth').items.map(i => [i.name, i.state, i.ok])).toEqual([['DualSense Wireless Controller', 'Connected · 12%', true], ['Headphones', 'Not connected', false]]);
        expect(glanceFor(ps5, 'controllers').items.map(i => i.state)).toEqual(['Wireless · 64%']);
        expect(glanceFor(ps5, 'bluetooth').inMenu).toBe('Already in the menu: Bluetooth on and off');
    });
    it('Account without a wallet balance has no Wallet row', () => {
        expect(rows('account')).toEqual([['Account', 'micpaal']]);
    });
    it('a wrong type leaves the row out', () => {
        expect(rows('cloud', { client: { cloud_enabled: 'yes' } })).toEqual([]);
    });
    it('nothing readable: every entry still has its title and description (Review Focus 1)', () => {
        for (const e of GROUPS.flatMap(g => g.entries)) {
            const g = glanceFor({}, e.key);
            expect(g.title).toBe(e.name);
            expect(g.description.length).toBeGreaterThan(0);
            expect(g.rows).toEqual([]);
            expect(g.items).toEqual([]);
        }
    });
});
