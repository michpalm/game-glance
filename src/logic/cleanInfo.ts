import type { HltbResult } from '../data/hltb';
import { formatHours, minutesToHours } from './format';

/** One item of the Clean look's info card: a label, its value and, for a goal, how far along (0..1). */
export interface CleanStat {
    key: 'played' | 'achievements' | 'hltb';
    label: string;
    value: string;
    progress?: number;
}

/**
 * The Clean look's info card (the Game Glance page's bottom row): Played, Achievements (when the game has any) and
 * HowLongToBeat's main story with the played share of it. `hltb` undefined: still loading ('…'); not found or
 * unavailable: '—' without a bar. Pure.
 */
export function cleanStats(
    game: { playedMinutes: number; achievements: { achieved: number; total: number } | null },
    hltb: HltbResult | undefined,
    locale: string,
): CleanStat[] {
    const played = minutesToHours(game.playedMinutes);
    const stats: CleanStat[] = [{ key: 'played', label: 'Played', value: formatHours(played, locale) }];
    const a = game.achievements;
    if (a && a.total > 0) {
        stats.push({ key: 'achievements', label: 'Achievements', value: `${a.achieved} / ${a.total}`, progress: Math.min(1, Math.max(0, a.achieved / a.total)) });
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
