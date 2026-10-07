import { tr } from '../i18n/steamText';
declare const libraryEventStore: any;

/** Plain subset of a Steam event model, as read from libraryEventStore. */
export interface RawEvent {
    gid: string;
    appId: number;
    title: string;
    eventType: number;
    startTime: number;
    /** The event's own capsule art (`GetImageURL('capsule')`, a clan.steamstatic.com url), when it has one. */
    imageUrl?: string | null;
}

export interface NewsCard {
    gid: string;
    appId: number;
    title: string;
    pill: string;
    pillKey: 'event' | 'patch' | 'major' | 'news' | 'regular';
    sub: string;
    featured: boolean;
    /** Event art, or null (the card then shows the game's own art). */
    imageUrl: string | null;
}

const DAY_SECONDS = 86400;

// Verified on device via GetEventTypeAsString(): 13 Regular Update, 14 Major Update, 28 News.
// Steam event / Patch notes codes are not verified, so those pills are unreachable for now.
const PILLS: Record<number, { label: () => string; key: NewsCard['pillKey'] }> = {
    13: { label: () => tr('regularUpdate'), key: 'regular' },
    14: { label: () => tr('majorUpdate'), key: 'major' },
    28: { label: () => tr('news'), key: 'news' },
};

export function pillFor(eventType: number): { label: string; key: NewsCard['pillKey'] } {
    const pill = PILLS[eventType] ?? PILLS[28];
    return { label: pill.label(), key: pill.key };
}

/** Only an https url is used as a background image. */
function artUrl(url: unknown): string | null {
    return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
}

function agoLabel(startTime: number, now: number): string {
    if (!(startTime > 0)) return '';
    const days = Math.max(0, Math.floor((now - startTime) / DAY_SECONDS));
    if (days === 0) return tr('today').toUpperCase();
    return (days === 1 ? tr('dayAgo') : tr('daysAgo', [days])).toUpperCase();
}

export function mapWhatsNew(
    events: RawEvent[],
    appName: (appId: number) => string,
    now: number,
    limit = 12,
): NewsCard[] {
    const cards: NewsCard[] = [];
    for (const e of events) {
        if (cards.length >= limit) break;
        if (!e.title || !e.appId) continue;
        const pill = pillFor(e.eventType);
        cards.push({
            gid: e.gid,
            appId: e.appId,
            title: e.title,
            pill: pill.label,
            pillKey: pill.key,
            sub: [appName(e.appId).toUpperCase(), agoLabel(e.startTime, now)].filter(Boolean).join(' - '),
            featured: cards.length === 0,
            imageUrl: artUrl(e.imageUrl),
        });
    }
    return cards;
}

/**
 * Probed on the Ally (2026-10-04): every What's New event answers `GetImageURL('capsule')` with a
 * clan.steamstatic.com url (from `jsondata.localized_capsule_image`); 'background' is the title image, often a
 * transparent logo, so it is not used.
 */
function eventArt(e: any): string | null {
    try {
        const url = e?.GetImageURL?.('capsule');
        return typeof url === 'string' ? url : null;
    } catch {
        return null;
    }
}

export function readWhatsNew(): RawEvent[] {
    try {
        const list = libraryEventStore?.GetWhatsNewEvents?.()?.eventsToShow;
        if (!Array.isArray(list)) return [];
        return list.map((e: any) => ({
            gid: String(e.GID ?? ''),
            appId: Number(e.appid) || 0,
            title: String(e.GetNameWithFallback?.() ?? ''),
            eventType: Number(e.type) || 0,
            startTime: Number(e.GetStartTimeAndDateUnixSeconds?.() ?? e.startTime) || 0,
            imageUrl: eventArt(e),
        }));
    } catch {
        return [];
    }
}
