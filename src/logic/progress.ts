import { formatHours } from './format';
export type Tier = 'main' | 'mainExtras' | 'completionist';

export interface HltbTimes {
    main: number | null;
    mainExtras: number | null;
    completionist: number | null;
}

export type Progress =
    | { kind: 'noTimes' }
    | { kind: 'notPlayed' }
    | { kind: 'toward'; tier: Tier; goalHours: number; percent: number }
    | { kind: 'beyond'; lastTier: Tier };

export const TIER_LABELS: Record<Tier, string> = {
    main: 'main story',
    mainExtras: 'main + extras',
    completionist: 'completionist',
};

const ORDER: Tier[] = ['main', 'mainExtras', 'completionist'];

export function computeProgress(playedHours: number, times: HltbTimes): Progress {
    const available = ORDER.filter((tier) => {
        const value = times[tier];
        return value !== null && value > 0;
    });
    if (available.length === 0) return { kind: 'noTimes' };
    if (!(playedHours > 0)) return { kind: 'notPlayed' };
    for (const tier of available) {
        const goal = times[tier] as number;
        if (playedHours < goal) {
            return { kind: 'toward', tier, goalHours: goal, percent: Math.floor((playedHours / goal) * 100) };
        }
    }
    return { kind: 'beyond', lastTier: available[available.length - 1] };
}

export function beyondCaption(lastTier: Tier): string {
    return `Past ${TIER_LABELS[lastTier]} time`;
}

const LEFT_IN: Record<Tier, string> = {
    main: 'left in main story',
    mainExtras: 'left in main + extras',
    completionist: 'left to 100%',
};

/** "33.1 h left in main story": hours from `playedHours` to the tier's goal; never "0 h" while short of it. */
export function towardCaption(playedHours: number, goalHours: number, tier: Tier, locale: string): string {
    return `${formatHours(Math.max(goalHours - playedHours, 0.01), locale)} ${LEFT_IN[tier]}`;
}
