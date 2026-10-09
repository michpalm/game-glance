import { tr } from '../i18n/steamText';
export interface PlayNextCandidate {
    appId: number;
    name: string;
    playedMinutes: number;
    hltbMainHours: number | null;
}

export interface RecommendedCard {
    appId: number;
    name: string;
    pill: string;
    pillKey: 'playNext' | 'notStarted' | 'short' | 'sale';
    sub: string;
}

const SHORT_GAME_HOURS = 10;
const LOW_PLAYTIME_MINUTES = 120;

/** A 0 HLTB time is treated as unknown. */
function isShort(c: PlayNextCandidate): boolean {
    return c.hltbMainHours !== null && c.hltbMainHours > 0 && c.hltbMainHours < SHORT_GAME_HOURS;
}

function tier(c: PlayNextCandidate): number {
    if (c.playedMinutes <= 0) return 0;
    if (c.playedMinutes < LOW_PLAYTIME_MINUTES) return 1;
    if (isShort(c)) return 2;
    return 3;
}

function within(c: PlayNextCandidate, t: number): number {
    if (t === 1) return c.playedMinutes;
    if (t === 2) return c.hltbMainHours ?? 0;
    return 0;
}

function hours(minutes: number): string {
    return `${Math.round((minutes / 60) * 10) / 10} h`;
}

function toCard(c: PlayNextCandidate): RecommendedCard {
    const played = c.playedMinutes > 0 ? `${hours(c.playedMinutes)} played` : '';
    const beat = c.hltbMainHours !== null && c.hltbMainHours > 0 ? `${Math.round(c.hltbMainHours * 10) / 10} h to beat` : '';
    const sub = [played, beat].filter(Boolean).join(' - ');
    if (c.playedMinutes <= 0) return { appId: c.appId, name: c.name, pill: tr('notStarted'), pillKey: 'notStarted', sub };
    return { appId: c.appId, name: c.name, pill: tr('playNext'), pillKey: 'playNext', sub };
}

/** Owned installed games worth picking up next: not started, then barely played, then short ones. */
export function scorePlayNext(candidates: PlayNextCandidate[], excludeIds: Set<number>, limit = 8): RecommendedCard[] {
    return candidates
        .filter((c) => c.appId > 0 && c.name.length > 0 && !excludeIds.has(c.appId))
        .map((c, index) => ({ c, index, t: tier(c) }))
        .sort((a, b) => a.t - b.t || within(a.c, a.t) - within(b.c, b.t) || a.index - b.index)
        .slice(0, Math.max(0, limit))
        .map(({ c }) => toCard(c));
}
