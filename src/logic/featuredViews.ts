import { ProtonResult } from '../data/protondb';
import { formatLastPlayed } from '../home/recents';
import { protonStat } from './cleanInfo';
import { formatHours, minutesToHours } from './format';

/** What a featured card (the game page's right-hand card, docs/superpowers/specs/2026-11-10-game-info-slots) draws. Pure. */
export interface FeaturedView {
    title: string;
    columns: Array<{ key: string; label: string; value: string; accent?: boolean; tone?: string }>;
    icon?: { src: string; label: string; value: string };
    bar: number | null;
    caption: string | null;
    empty?: string;
    loading?: boolean;
}

const loadingView = (title: string): FeaturedView => ({ title, columns: [], bar: null, caption: null, loading: true });
const emptyView = (title: string, empty: string): FeaturedView => ({ title, columns: [], bar: null, caption: null, empty });
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function protonView(r: ProtonResult | undefined): FeaturedView {
    const title = 'ProtonDB';
    if (r === undefined) return loadingView(title);
    if (r.status !== 'found') return emptyView(title, 'No ProtonDB rating yet');
    const rating = protonStat(r.tier);
    const columns: FeaturedView['columns'] = [{ key: 'rating', label: 'Rating', value: rating.value, tone: r.tier }];
    let caption: string | null = null;
    if (r.details) {
        columns.push({ key: 'reports', label: 'Reports', value: String(r.details.total) });
        columns.push({ key: 'confidence', label: 'Confidence', value: capitalise(r.details.confidence) });
        const parts = [
            r.details.trending && `Trending ${capitalise(r.details.trending)}`,
            r.details.best && `best reported ${capitalise(r.details.best)}`,
        ].filter(Boolean);
        caption = parts.length ? parts.join(' · ') : null;
    }
    return { title, columns, bar: null, caption };
}

/** The featured ProtonDB card's result: a non-Steam game is never looked up (no Steam app id), so it has no rating rather than loading forever. Pure. */
export function featuredProton(isShortcut: boolean, looked: ProtonResult | undefined): ProtonResult | undefined {
    return isShortcut ? { status: 'none' } : looked;
}

export interface AchievementFacts {
    achieved: number;
    total: number;
    /** Unlocked ones only, newest first. */
    unlocked: Array<{ id: string; name: string; image: string; unlockedAt: number; globalPct: number }>;
}

/** From Steam's app details (`appDetailsStore.GetAppDetails(appId)`): highlighted and hidden-unlocked lists overlap, so each id counts once. */
export function readAchievementFacts(details: unknown): AchievementFacts | undefined {
    const a = (details as { achievements?: Record<string, unknown> } | null | undefined)?.achievements;
    if (!a || typeof a.nAchieved !== 'number' || typeof a.nTotal !== 'number') return undefined;
    const seen = new Set<string>();
    const unlocked: AchievementFacts['unlocked'] = [];
    for (const list of [a.vecHighlight, a.vecAchievedHidden]) {
        if (!Array.isArray(list)) continue;
        for (const ach of list) {
            if (!ach || !ach.bAchieved || typeof ach.strID !== 'string' || seen.has(ach.strID)) continue;
            seen.add(ach.strID);
            unlocked.push({
                id: ach.strID,
                name: String(ach.strName ?? ''),
                image: String(ach.strImage ?? ''),
                unlockedAt: Number(ach.rtUnlocked) || 0,
                globalPct: Number(ach.flAchieved) || 0,
            });
        }
    }
    unlocked.sort((x, y) => y.unlockedAt - x.unlockedAt);
    return { achieved: a.nAchieved, total: a.nTotal, unlocked };
}

export function achievementsView(a: AchievementFacts | undefined, now: number, locale: string): FeaturedView {
    const title = 'Achievements';
    if (a === undefined) return loadingView(title);
    if (a.total <= 0) return emptyView(title, 'No achievements');
    const bar = Math.round((a.achieved / a.total) * 100);
    if (a.achieved <= 0) return { title, columns: [], bar, caption: `${a.total} to unlock` };
    const latest = a.unlocked[0];
    const known = a.unlocked.filter((u) => u.globalPct > 0);
    const rarest = known.reduce<AchievementFacts['unlocked'][number] | null>((best, u) => (best === null || u.globalPct < best.globalPct ? u : best), null);
    const caption = `${a.achieved} of ${a.total} unlocked` + (rarest ? ` · rarest: ${rarest.name} (${rarest.globalPct.toFixed(1)}% have it)` : '');
    if (!latest) return { title, columns: [], bar, caption };
    const when = latest.unlockedAt > 0 ? ` · ${formatLastPlayed(latest.unlockedAt, now, locale)}` : '';
    return { title, columns: [], bar, caption, icon: { src: latest.image, label: `Latest${when}`, value: latest.name } };
}

export function playTimeView(p: { minutes: number; twoWeeks: number; lastPlayed: number }, now: number, locale: string): FeaturedView {
    const caption = p.twoWeeks <= 0 ? 'None in the past two weeks' : p.twoWeeks === p.minutes ? 'All of it in the past two weeks' : null;
    return {
        title: 'Play time',
        columns: [
            { key: 'total', label: 'Total', value: formatHours(minutesToHours(p.minutes), locale), accent: true },
            { key: 'twoWeeks', label: 'Past 2 weeks', value: formatHours(minutesToHours(p.twoWeeks), locale) },
            { key: 'lastPlayed', label: 'Last played', value: p.lastPlayed > 0 ? formatLastPlayed(p.lastPlayed, now, locale) : '-' },
        ],
        bar: null,
        caption,
    };
}
