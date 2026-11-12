import { ProtonResult } from '../data/protondb';
import { ProtonTier } from './protonTier';
import { formatLastPlayed } from '../home/recents';
import { protonStat } from './cleanInfo';
import { formatHours, minutesToHours } from './format';

/** What a featured card (the game page's right-hand card, docs/superpowers/specs/2026-11-10-game-info-slots) draws. Pure. */
export interface FeaturedView {
    title: string;
    columns: Array<{ key: string; label: string; value: string; accent?: boolean; tone?: string }>;
    /**
     * The tile row: a picture (`src`: the latest unlock's, the game's icon) or ProtonDB's mark in a rating's colour
     * (`tone`), beside a label and the headline value (`accent`: in the game's accent, as HowLongToBeat's Main).
     */
    icon?: { src?: string; tone?: ProtonTier; label: string; value: string; accent?: boolean };
    /** ProtonDB's scale under the tile row, worst first, with the rating's step lit (`at`: its index). */
    ladder?: { steps: readonly ProtonTier[]; at: number };
    bar: number | null;
    caption: string | null;
    empty?: string;
    loading?: boolean;
}

const loadingView = (title: string): FeaturedView => ({ title, columns: [], bar: null, caption: null, loading: true });
const emptyView = (title: string, empty: string): FeaturedView => ({ title, columns: [], bar: null, caption: null, empty });
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ProtonDB's scale as the card's ladder draws it: worst first, so the lit step sits further right the better the rating. */
export const PROTON_LADDER: readonly ProtonTier[] = ['borked', 'bronze', 'silver', 'gold', 'platinum'];

/** What Steam itself says about running the game: Valve's Steam Deck rating and the compatibility tool Steam picked. */
export interface SteamCompat {
    /** The app overview's steam_deck_compat_category: 3 Verified, 2 Playable, 1 Unsupported, 0 or null unknown. */
    deck: number | null;
    /** The app details' strCompatToolDisplayName ("Proton 11.0-2"), null when Steam names none (a native game). */
    tool: string | null;
}

const DECK_VERDICT: Record<number, string> = { 3: 'Verified on Steam Deck', 2: 'Playable on Steam Deck', 1: 'Unsupported on Steam Deck' };

export function protonView(r: ProtonResult | undefined, steam: SteamCompat = { deck: null, tool: null }): FeaturedView {
    const title = 'ProtonDB';
    if (r === undefined) return loadingView(title);
    if (r.status !== 'found') return emptyView(title, 'No ProtonDB rating yet');
    const d = r.details;
    // A value the summary did not have is left out of the label.
    const said = [d && d.total !== null && `${d.total} ${d.total === 1 ? 'report' : 'reports'}`, d && d.confidence !== null && `${d.confidence} confidence`].filter(Boolean);
    const icon = { tone: r.tier, label: said.length ? said.join(' · ') : 'Players\' rating', value: protonStat(r.tier).value };
    // The caption is Steam's side of the story; without it, ProtonDB's own trend.
    const steamSays = [steam.deck !== null ? DECK_VERDICT[steam.deck] : undefined, steam.tool && `runs with ${steam.tool}`].filter(Boolean);
    const trend = [d?.trending && `Trending ${capitalise(d.trending)}`, d?.best && `best reported ${capitalise(d.best)}`].filter(Boolean);
    const caption = steamSays.length ? steamSays.join(' · ') : trend.length ? trend.join(' · ') : null;
    return { title, columns: [], icon, ladder: { steps: PROTON_LADDER, at: PROTON_LADDER.indexOf(r.tier) }, bar: null, caption };
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

const NO_ACHIEVEMENTS: AchievementFacts = { achieved: 0, total: 0, unlocked: [] };

/**
 * The game page's achievements facts: loading (undefined) only until Steam has the details; a non-Steam game, or details
 * without a readable achievements record (Steam leaves it out for a game with none), have none, so the card says so. Pure.
 */
export function pageAchievementFacts(details: unknown, isShortcut: boolean): AchievementFacts | undefined {
    if (isShortcut) return NO_ACHIEVEMENTS;
    if (details === undefined || details === null) return undefined;
    return readAchievementFacts(details) ?? NO_ACHIEVEMENTS;
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
    // Below a tenth of a percent it would print "0.0%".
    const share = (pct: number) => (pct < 0.1 ? '<0.1' : pct.toFixed(1));
    const caption = `${a.achieved} of ${a.total} unlocked` + (rarest ? ` · rarest: ${rarest.name} (${share(rarest.globalPct)}% have it)` : '');
    if (!latest) return { title, columns: [], bar, caption };
    const when = latest.unlockedAt > 0 ? ` · ${formatLastPlayed(latest.unlockedAt, now, locale)}` : '';
    return { title, columns: [], bar, caption, icon: { src: latest.image, label: `Latest${when}`, value: latest.name } };
}

export interface PlayFacts {
    minutes: number;
    twoWeeks: number;
    /** Unix seconds, 0 when never played. */
    lastPlayed: number;
    /** The game's Steam icon, null when there is none (a non-Steam game). */
    icon: string | null;
    /** When it was bought or added (Unix seconds), 0 when unknown. */
    purchased: number;
    /** Steam's review score in percent, null when unknown. */
    reviews: number | null;
}

/** The game's small Steam icon from the app overview's icon_hash; null without one. Pure. */
export function steamIconUrl(appId: number, iconHash: unknown): string | null {
    return typeof iconHash === 'string' && /^[0-9a-f]{40}$/.test(iconHash)
        ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`
        : null;
}

export function playTimeView(p: PlayFacts, now: number, locale: string): FeaturedView {
    const hours = (minutes: number) => formatHours(minutesToHours(minutes), locale);
    const columns: FeaturedView['columns'] = [{ key: 'twoWeeks', label: 'Past 2 weeks', value: hours(p.twoWeeks) }];
    if (p.purchased > 0) columns.push({ key: 'owned', label: 'Owned since', value: new Date(p.purchased * 1000).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) });
    if (p.reviews !== null && p.reviews > 0) columns.push({ key: 'reviews', label: 'Steam reviews', value: `${Math.round(p.reviews)}%` });
    return {
        title: 'Play time',
        icon: {
            src: p.icon ?? undefined,
            label: p.lastPlayed > 0 ? `Last played · ${formatLastPlayed(p.lastPlayed, now, locale)}` : 'Not played yet',
            value: `${hours(p.minutes)} played`,
            accent: true,
        },
        columns,
        bar: null,
        caption: null,
    };
}

const field = (o: unknown, key: string): unknown => (o as Record<string, unknown> | null | undefined)?.[key];
const num = (o: unknown, key: string): number => {
    const n = Number(field(o, key) ?? 0);
    return Number.isFinite(n) ? n : 0;
};

/**
 * The Play time card's facts from Steam's app overview: `minutes` and `lastPlayed` as the caller merged them with a
 * launcher's; a non-Steam game has no Steam icon or review score. Pure.
 */
export function playFactsOf(appId: number, overview: unknown, played: { minutes: number; lastPlayed: number }, isShortcut: boolean): PlayFacts {
    const reviews = num(overview, 'review_percentage_with_bombs');
    return {
        minutes: played.minutes,
        twoWeeks: num(overview, 'minutes_playtime_last_two_weeks'),
        lastPlayed: played.lastPlayed,
        icon: isShortcut ? null : steamIconUrl(appId, field(overview, 'icon_hash')),
        purchased: num(overview, 'rt_purchased_time'),
        reviews: !isShortcut && reviews > 0 ? reviews : null,
    };
}

/** Steam's Deck rating (app overview) and the compatibility tool it runs the game with (app details); none for a non-Steam game. Pure. */
export function steamCompatOf(overview: unknown, details: unknown, isShortcut: boolean): SteamCompat {
    if (isShortcut) return { deck: null, tool: null };
    const deck = num(overview, 'steam_deck_compat_category');
    const tool = field(details, 'strCompatToolDisplayName');
    return { deck: deck > 0 ? deck : null, tool: typeof tool === 'string' && tool.trim() !== '' ? tool.trim() : null };
}
