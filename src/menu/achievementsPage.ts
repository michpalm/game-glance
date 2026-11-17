import { allSets, type SetSchema, type SetUser } from './achievementSets';

/**
 * The menu's Achievements page (mock-up "Achievement Sets", board 2, 2026-11-17): the sets at left, and for the picked
 * one what is next (locked, closest first) or, once it is done, what was unlocked (newest first). Steam's data as its
 * own achievements page has it (menu/steam/achievementSets); what counts follows achievementSets.setsSummary. Pure.
 */
export interface PageAchievement {
    internal_key: number; archived: boolean; name?: string; description?: string; hidden?: boolean;
    icon_achieved?: string; icon_unachieved?: string; min_progress?: number; max_progress?: number;
}
export interface PageSchema extends SetSchema { groups: (SetSchema['groups'][number] & { achievements: PageAchievement[] })[] }
export interface PageUser extends SetUser { achievements: Record<number, { unlocked?: boolean; unlock_time?: number; progress?: number } | undefined> }
export interface PageRates { percentages: Record<number, number | undefined> }

export interface SetRow { id: number; name: string; kind: string; count: string; ratio: number; done: boolean; base: boolean }
export interface ItemRow {
    key: number; name: string; description: string; icon: string | null;
    /** Its date once unlocked, its progress ("41 / 50"), or Locked. */ right: string;
    /** 0–1 for one with progress steps, else null. */ progress: number | null;
    rarity: string | null; rare: boolean; unlocked: boolean;
}
export interface AchievementsPageView { header: string; sets: SetRow[]; picked: number; title: string; items: ItemRow[] }

/** The list's orders (sort pill, mock-up variant A). Closest first is the default: what is next to earn. */
export const ACH_SORTS = ['closest', 'rarest', 'common', 'recent'] as const;
export type AchSort = (typeof ACH_SORTS)[number];
export const SORT_LABELS: Record<AchSort, string> = { closest: 'Closest first', rarest: 'Rarest first', common: 'Most common first', recent: 'Recently unlocked' };
/** The list's heading names what it holds; the sort pill beside it names the order. */
const LIST_TITLES = { next: 'Next up', all: 'All achievements', unlocked: 'Unlocked' } as const;

/** Steam's rare mark: unlocked by fewer than this share of players. */
const RARE_PERCENT = 10;
const DAY = 86_400;

/** When an achievement was unlocked: Today, Yesterday, N days ago within a week, else its date. `when` and `now` in unix seconds. */
export function whenText(when: number, now: number, locale: string): string {
    const day = (s: number) => { const d = new Date(s * 1000); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 1000 / DAY); };
    const days = day(now) - day(when);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const sameYear = new Date(when * 1000).getFullYear() === new Date(now * 1000).getFullYear();
    return new Intl.DateTimeFormat(locale, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(when * 1000));
}

/** A set's name without the game's own in front ("Kingdom Two Crowns: Norse Lands" is "Norse Lands"): the page already names the game. */
function setName(name: string, game: string): string {
    const g = game.trim();
    if (!g || !name.startsWith(g)) return name;
    const rest = /^\s*[:\-–—]\s*(.+)$/.exec(name.slice(g.length));
    return rest ? rest[1] : name;
}

export function achievementsPage(schema: PageSchema | undefined, user: PageUser | undefined, rates: PageRates | undefined, picked: number | null, now: number, locale: string, gameName = '', sort: AchSort = 'closest'): AchievementsPageView | null {
    if (!schema || !user || !Array.isArray(schema.groups)) return null;
    // A game with one set still gets its page.
    const summary = allSets(schema, user);
    if (!summary) return null;
    const bars = summary.bars;
    const got = (key: number) => user.achievements?.[key]?.unlocked === true;
    let archivedHidden = 0;
    for (const g of schema.groups) for (const x of g.achievements ?? []) if ((g.archived || x.archived) && !got(x.internal_key)) archivedHidden++;
    const header = `${summary.unlocked} of ${summary.total} you can earn${archivedHidden ? ` · ${archivedHidden} archived hidden` : ''}`;
    const sets: SetRow[] = bars.map(b => ({
        id: b.id, name: b.base && !b.name ? 'Base game' : setName(b.name, gameName) || 'Set', base: b.base, done: b.complete,
        kind: b.base ? 'Main game' : b.earnable || b.complete ? 'DLC' : 'DLC · not owned',
        count: `${b.unlocked} / ${b.size}`, ratio: b.size > 0 ? b.unlocked / b.size : 0,
    }));
    const pick = bars.find(b => b.id === picked) ?? bars.find(b => b.earnable && !b.complete) ?? bars[0];
    const group = schema.groups.find(g => g.id === pick.id)!;
    const counted = (group.achievements ?? []).filter(x => group.archived || !x.archived || got(x.internal_key));
    const rate = (key: number) => { const p = rates?.percentages?.[key]; return typeof p === 'number' && Number.isFinite(p) ? p : null; };
    const stepOf = (x: PageAchievement) => {
        const max = Number(x.max_progress), min = Number(x.min_progress) || 0, cur = Number(user.achievements?.[x.internal_key]?.progress);
        return Number.isFinite(max) && max > min && Number.isFinite(cur) ? { cur: Math.min(Math.max(cur, min), max), min, max } : null;
    };
    const item = (x: PageAchievement): ItemRow => {
        const unlocked = got(x.internal_key), secret = x.hidden === true && !unlocked, p = rate(x.internal_key), step = unlocked ? null : stepOf(x);
        const when = user.achievements?.[x.internal_key]?.unlock_time;
        return {
            key: x.internal_key, unlocked,
            name: secret ? 'Hidden achievement' : x.name || 'Achievement',
            description: secret ? 'Keep playing to reveal it' : x.description ?? '',
            icon: (unlocked ? x.icon_achieved : x.icon_unachieved) ?? null,
            right: unlocked ? (typeof when === 'number' && when > 0 ? whenText(when, now, locale) : 'Unlocked') : step ? `${step.cur} / ${step.max}` : 'Locked',
            progress: step ? (step.cur - step.min) / (step.max - step.min) : null,
            rarity: p === null ? null : `${p.toFixed(1)}% of players${p < RARE_PERCENT ? ' · Rare' : ''}`, rare: p !== null && p < RARE_PERCENT,
        };
    };
    const time = (k: number) => user.achievements?.[k]?.unlock_time ?? 0;
    // Unknown shares go last either way.
    const share = (k: number, missing: number) => rate(k) ?? missing;
    if (sort === 'rarest' || sort === 'common') {
        const items = counted.map(item);
        items.sort(sort === 'rarest' ? (x, y) => share(x.key, 1e9) - share(y.key, 1e9) : (x, y) => share(y.key, -1e9) - share(x.key, -1e9));
        return { header, sets, picked: pick.id, title: LIST_TITLES.all, items };
    }
    // Closest first on a finished set has nothing left: it shows what was unlocked, as Recently unlocked does.
    if (sort === 'recent' || pick.complete) {
        const items = counted.filter(x => got(x.internal_key)).map(item);
        items.sort((x, y) => time(y.key) - time(x.key));
        return { header, sets, picked: pick.id, title: LIST_TITLES.unlocked, items };
    }
    const items = counted.filter(x => !got(x.internal_key)).map(item);
    items.sort((x, y) => (y.progress ?? 0) - (x.progress ?? 0) || (rate(y.key) ?? 0) - (rate(x.key) ?? 0));
    return { header, sets, picked: pick.id, title: LIST_TITLES.next, items };
}
