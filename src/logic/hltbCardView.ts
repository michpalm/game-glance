import { tr } from '../i18n/steamText';
import { formatHours, minutesToHours } from './format';
import { beyondCaption, computeProgress, HltbTimes, mainStoryProgress, Tier, towardCaption } from './progress';

/**
 * What the HowLongToBeat card shows for a game it found: the three columns, the bar and the caption. Shared by the page's
 * card (components/HltbCard) and Spotlight Home's open transition, which draws the same card before the page arrives,
 * so the two cannot drift apart. Pure.
 */

/** The card's title. */
export const HLTB_TITLE = 'HowLongToBeat';

/** A column's key (data-stat): Main is `hltb`, as Home's chip and the Clean look's stat. */
export type HltbColumnKey = 'hltb' | 'mainExtras' | 'completionist';

export const HLTB_COLUMNS: Array<{ tier: Tier; key: HltbColumnKey; label: string }> = [
    { tier: 'main', key: 'hltb', label: 'Main' },
    { tier: 'mainExtras', key: 'mainExtras', label: '+ Extras' },
    { tier: 'completionist', key: 'completionist', label: '100%' },
];

export interface HltbColumn { tier: Tier; key: HltbColumnKey; label: string; value: string; goal: boolean }
export interface HltbFoundView {
    columns: HltbColumn[];
    /** The bar's fill in percent, or null when the card has no bar. */
    bar: number | null;
    /**
     * The restyled page's bar as the whole game (`track`): Main, + Extras and 100% as stretches to scale, each ending at
     * `ends` (percent of the longest time), with `bar` as your hours against that same length. Null: the plain bar.
     */
    track: { ends: number[] } | null;
    caption: string | null;
}

/**
 * The whole game's stretches: each known time that is longer than the one before ends a stretch, in percent of the
 * longest; null when there is only one (a lone Main is today's bar). Pure.
 */
export function hltbTrack(times: HltbTimes): { ends: number[]; total: number } | null {
    const known: number[] = [];
    for (const t of [times.main, times.mainExtras, times.completionist]) {
        if (t !== null && t > 0 && (known.length === 0 || t > known[known.length - 1])) known.push(t);
    }
    if (known.length < 2) return null;
    const total = known[known.length - 1];
    return { ends: known.map((t) => (t / total) * 100), total };
}

/**
 * `restyle`: the restyled page, where the caption follows the main story only, no column is the goal, and the bar is
 * the whole game (track) with HowLongToBeat's players' rating (`rating`, percent) after the caption.
 */
export function hltbFoundView(times: HltbTimes, playedMinutes: number, locale: string, restyle: boolean, rating: number | null = null): HltbFoundView {
    const view = baseView(times, playedMinutes, locale, restyle);
    if (!restyle) return view;
    const track = hltbTrack(times);
    const played = minutesToHours(playedMinutes);
    const rated = rating !== null && rating > 0 ? `rated ${Math.round(rating)}%` : null;
    return {
        ...view,
        // The fill is your hours along the whole game (none yet: the stretches alone show its shape).
        ...(track ? { track: { ends: track.ends }, bar: Math.min(100, Math.round((played / track.total) * 100)) } : {}),
        caption: [view.caption, rated].filter(Boolean).join(' · ') || null,
    };
}

function baseView(times: HltbTimes, playedMinutes: number, locale: string, restyle: boolean): HltbFoundView {
    const played = minutesToHours(playedMinutes);
    const progress = restyle ? mainStoryProgress(played, times) : computeProgress(played, times);
    const goalTier = !restyle && progress.kind === 'toward' ? progress.tier : null;
    const columns = HLTB_COLUMNS.map((c) => {
        const hours = times[c.tier];
        return { ...c, value: hours === null ? '—' : formatHours(hours, locale), goal: c.tier === goalTier };
    });
    switch (progress.kind) {
        case 'toward':
            return { columns, track: null, bar: progress.percent, caption: towardCaption(played, progress.goalHours, progress.tier, locale) };
        case 'beyond':
            return { columns, track: null, bar: 100, caption: beyondCaption(progress.lastTier) };
        case 'complete':
            return { columns, track: null, bar: 100, caption: 'Main story complete' };
        case 'notPlayed':
            return { columns, track: null, bar: null, caption: 'Not played yet' };
        default:
            return { columns, track: null, bar: null, caption: null };
    }
}

/** The no-match card's two lines (the page's card and Home's copy as it opens): no matches, and where to fix it. Pure. */
export function hltbNotFoundView(overrideId?: number): { muted: string; caption: string } {
    return overrideId !== undefined
        ? { muted: `#${overrideId} · ${tr('noMatches')}`, caption: 'Check or remove the override in Quick Access → Game Glance' }
        : { muted: tr('noMatches'), caption: 'Set the right game in Quick Access → Game Glance' };
}
