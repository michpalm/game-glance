export type EntryKey = 'display' | 'sound' | 'bluetooth' | 'controllers' | 'keyboard' | 'power' | 'ingame' | 'recording' | 'compat' | 'downloads' | 'cloud'
    | 'remoteplay' | 'friends' | 'family' | 'notifications' | 'account' | 'customization' | 'accessibility' | 'system' | 'interface' | 'security';
export interface Entry { key: EntryKey; name: string; group: string }

const group = (name: string, entries: [EntryKey, string][]) => ({ name, entries: entries.map(([key, label]) => ({ key, name: label, group: name })) });

/** The Settings home's list (spec §2, mock-up S2c): Steam's settings the Game Glance menu doesn't reach, grouped. */
export const GROUPS: { name: string; entries: Entry[] }[] = [
    group('Device', [['display', 'Display'], ['sound', 'Sound'], ['bluetooth', 'Bluetooth'], ['controllers', 'Controllers'], ['keyboard', 'Keyboard'], ['power', 'Power and sleep']]),
    group('Games', [['ingame', 'In-game'], ['recording', 'Game recording'], ['compat', 'Compatibility'], ['downloads', 'Downloads'], ['cloud', 'Cloud'], ['remoteplay', 'Remote Play']]),
    group('People', [['friends', 'Friends and chat'], ['family', 'Family'], ['notifications', 'Notifications']]),
    group('You', [['account', 'Account'], ['customization', 'Customization'], ['accessibility', 'Accessibility']]),
    group('System', [['system', 'System'], ['interface', 'Interface'], ['security', 'Security']]),
];
const ALL = GROUPS.flatMap(g => g.entries);

export const entriesOf = (name: string): Entry[] => GROUPS.find(g => g.name === name)?.entries ?? [];
export const entryOf = (key: EntryKey): Entry => ALL.find(e => e.key === key) ?? ALL[0];

/** Up/Down through the whole list: crossing into the next or previous group, stopping at both ends. */
export function moveFocus(key: EntryKey, dir: 'up' | 'down'): EntryKey {
    const at = ALL.findIndex(e => e.key === key);
    const next = Math.min(ALL.length - 1, Math.max(0, at + (dir === 'down' ? 1 : -1)));
    return ALL[at < 0 ? 0 : next].key;
}

/** L1/R1: the previous or next group's first entry, wrapping (as the page kit's tabs). */
export function jumpGroup(key: EntryKey, step: -1 | 1): EntryKey {
    const at = Math.max(0, GROUPS.findIndex(g => g.entries.some(e => e.key === key)));
    return GROUPS[(at + step + GROUPS.length) % GROUPS.length].entries[0].key;
}

export const closedPreview = (name: string): string => entriesOf(name).map(e => e.name).join(' · ');

const ROUTES: Partial<Record<EntryKey, string>> = { sound: 'audio', recording: 'gamerecording', compat: 'compatibility' };
/** Steam's own page for an entry (sp.js Settings routes); Controllers needs a connected controller's type and index. */
export function steamRoute(key: EntryKey, firstController: { type: number; index: number } | null): string {
    if (key === 'controllers') return firstController ? `/settings/controller/${firstController.type}/${firstController.index}` : '/settings/controller';
    return `/settings/${ROUTES[key] ?? key}`;
}
