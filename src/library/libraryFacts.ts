import { parseTier, type ProtonTier } from '../logic/protonTier';
import type { LibGame } from './libraryModel';

/** What Game Glance's caches know of a game; anything absent is left out of the glance (spec §6 "Unknowns"). */
export interface KnownStats {
    achievements?: { achieved: number; total: number };
    hltbMainHours?: number;
    protonTier?: string;
    /** Bytes a game that is not installed needs (Steam's details, lDiskSpaceRequiredBytes). */
    requiredBytes?: number;
}
export interface ProgressLine { label: string; value: string; ratio: number }
/** A fact; `tone` marks a ProtonDB rating, drawn with ProtonDB's logo in that rating's colour. */
export interface GlanceFact { label: string; value: string; tone?: ProtonTier }
export interface Glance { progress: ProgressLine[]; facts: GlanceFact[]; collections: string[] }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPlayed(min: number): string {
    const m = Math.max(0, Math.round(min));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), rest = m % 60;
    return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

export function formatLastPlayed(unixSeconds: number, now: Date): string {
    const d = new Date(unixSeconds * 1000);
    const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return d.getFullYear() === now.getFullYear() ? day : `${day} ${d.getFullYear()}`;
}

/** Binary units labelled GB/MB, as Steam shows sizes. */
export function formatSize(bytes: number): string {
    const gib = bytes / 2 ** 30;
    return gib >= 1 ? `${gib.toFixed(1)} GB` : `${Math.round(bytes / 2 ** 20)} MB`;
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The highlighted game's glance (mock-up L11): Progress, Facts and collection pills, only what is known. */
export function glance(game: LibGame, known: KnownStats, collections: string[], now: Date): Glance {
    const progress: ProgressLine[] = [];
    const a = known.achievements;
    if (a && a.total > 0) progress.push({ label: 'Achievements', value: `${a.achieved} of ${a.total}`, ratio: a.achieved / a.total });
    const main = known.hltbMainHours;
    if (main !== undefined && main > 0) {
        const hours = game.playedMin / 60;
        // Named for its source (Michael, PS5 check 2026-11-19: "Story" alone did not say it was HowLongToBeat's).
        progress.push({ label: 'HLTB main story', value: `${Math.round(hours)} of ${Math.round(main)} h`, ratio: Math.min(1, hours / main) });
    }
    const facts: GlanceFact[] = [];
    if (game.playedMin > 0) facts.push({ label: 'Played', value: formatPlayed(game.playedMin) });
    if (game.lastPlayed > 0) facts.push({ label: 'Last played', value: formatLastPlayed(game.lastPlayed, now) });
    if (game.installed && game.sizeBytes > 0) facts.push({ label: 'On disk', value: formatSize(game.sizeBytes) });
    else if (!game.installed && known.requiredBytes && known.requiredBytes > 0) facts.push({ label: 'Required space', value: formatSize(known.requiredBytes) });
    if (known.protonTier) {
        const tone = parseTier(known.protonTier);
        facts.push(tone ? { label: 'ProtonDB', value: titleCase(known.protonTier), tone } : { label: 'ProtonDB', value: titleCase(known.protonTier) });
    }
    return { progress, facts, collections };
}
