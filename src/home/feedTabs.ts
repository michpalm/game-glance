import type { FeedTab } from './feedLayout';
import type { Zone } from './focusZones';

/**
 * Which of Home's feed tabs are shown (docs/superpowers/specs/2026-10-23-feed-tabs-design.md, #56): a switch each for
 * What's new, Friends and Recommended, all on by default. A tab that is off is not shown and loads nothing; with none on
 * Home has no feed. Pure.
 */

/** The tabs in their strip order. */
export const FEED_TAB_IDS: readonly FeedTab[] = ['news', 'friends', 'recommended'];

export type FeedTabs = Record<FeedTab, boolean>;

export const FEED_TABS_DEFAULT: FeedTabs = { news: true, friends: true, recommended: true };

/** A stored value read field by field: a missing or non-boolean field is on; anything but a plain object is the default. */
export function feedTabsOf(value: unknown): FeedTabs {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return { ...FEED_TABS_DEFAULT };
    const raw = value as Record<string, unknown>;
    const read = (tab: FeedTab) => (typeof raw[tab] === 'boolean' ? (raw[tab] as boolean) : FEED_TABS_DEFAULT[tab]);
    return { news: read('news'), friends: read('friends'), recommended: read('recommended') };
}

/** The tabs that are on, in strip order. */
export function shownTabs(tabs: FeedTabs): FeedTab[] {
    return FEED_TAB_IDS.filter((tab) => tabs[tab]);
}

/** The tab a restore selects: the remembered one while it is shown, else the first shown tab; null with none shown. */
export function restoreTabId(remembered: FeedTab | null | undefined, shown: FeedTab[]): FeedTab | null {
    return remembered && shown.includes(remembered) ? remembered : shown[0] ?? null;
}

/** The selected tab after the shown tabs change: the same one while it is shown, else the first shown tab; null with none. */
export function nextTabId(current: FeedTab, shown: FeedTab[]): FeedTab | null {
    return shown.includes(current) ? current : shown[0] ?? null;
}

/** The zone a restore focuses: the remembered one, except the tabs or feed when Home has no feed (the game cards then). */
export function restoreZoneFor(zone: Zone | undefined, hasFeed: boolean): Zone {
    if (!zone) return 'recents';
    return !hasFeed && (zone === 'tabs' || zone === 'feed') ? 'recents' : zone;
}
