import type { HltbResult } from '../data/hltb';
import { formatAchievements, formatHours, minutesToHours } from './format';
import type { SizeStat } from './sizeStat';
import { tr } from '../i18n/steamText';

/** One item of the Clean look's info card: a label, its value and, for a goal, how far along (0..1). */
export interface CleanStat {
    key: 'played' | 'size' | 'achievements' | 'hltb';
    label: string;
    value: string;
    progress?: number;
}

/**
 * The Clean look's info card (the Game Glance page's bottom row): Played, a Unifideck game's size (when known), Achievements (when the game has any) and
 * HowLongToBeat's main story with the played share of it. `hltb` undefined: still loading ('…'); not found or
 * unavailable: '—' without a bar. Pure.
 */
export function cleanStats(
    game: { playedMinutes: number; achievements: { achieved: number; total: number } | null },
    hltb: HltbResult | undefined,
    locale: string,
    size: SizeStat | null = null,
): CleanStat[] {
    const played = minutesToHours(game.playedMinutes);
    const stats: CleanStat[] = [];
    stats.push({ key: 'played', label: tr('played'), value: formatHours(played, locale) });
    if (size) stats.push(size); // a Unifideck game's install or download size, right after Played (Played stays first in every game)
    const a = game.achievements;
    if (a && a.total > 0) {
        stats.push({ key: 'achievements', label: tr('achievements'), value: formatAchievements(a), progress: Math.min(1, Math.max(0, a.achieved / a.total)) });
    }
    if (hltb === undefined) {
        stats.push({ key: 'hltb', label: 'HLTB main', value: '…' });
    } else {
        const main = hltb.status === 'found' ? hltb.times.main : null;
        stats.push(main !== null && main > 0
            ? { key: 'hltb', label: 'HLTB main', value: formatHours(main, locale), progress: Math.min(1, played / main) }
            : { key: 'hltb', label: 'HLTB main', value: '—' });
    }
    return stats;
}

/** Home already has formatted achievement/size chips; the other columns use the page's own data formatter. */
export function homeCleanStats(chips: { key: string; label: string; value: string; progress?: number }[], playedMinutes: number, hltb: HltbResult | undefined, locale: string, size: SizeStat | null): CleanStat[] {
    const base = cleanStats({ playedMinutes, achievements: null }, hltb, locale, size);
    const at = base.length - 1;
    const extra = chips.filter((c) => c.key === 'achievements' || (c.key === 'size' && !size)) as CleanStat[];
    return [...base.slice(0, at), ...extra.sort((a, b) => Number(a.key !== 'size') - Number(b.key !== 'size')), base[at]];
}
