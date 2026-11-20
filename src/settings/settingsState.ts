import type { EntryKey } from './settingsModel';

const BARE = /^\/settings\/?$/;
const UNDER = /^\/settings(\/.*)?$/;

/**
 * Whether Steam's `/settings` route shows the Settings home (spec §1): ours only on the bare path; any
 * `/settings/<page>` is Steam's own page. While Steam leaves the route the previous choice stands (no flash).
 */
export function settingsGateChoice({ enabled, path }: { enabled: boolean; path: string | null }, previous?: 'ours' | 'native'): 'ours' | 'native' {
    if (!enabled || path === null) return 'native';
    if (BARE.test(path)) return 'ours';
    if (UNDER.test(path)) return 'native';
    return previous ?? 'native';
}

let focus: EntryKey = 'display';
/** The entry the page was left on: B from Steam's page comes back to it (the page remounts). */
export const settingsMemory = {
    get: (): { focus: EntryKey } => ({ focus }),
    remember(p: { focus: EntryKey }): void { focus = p.focus; },
};
