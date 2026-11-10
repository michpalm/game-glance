/** ProtonDB's ratings, best first. "pending" (too few reports) is not one: such a game reads as unrated. */
export const PROTON_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'borked'] as const;
export type ProtonTier = (typeof PROTON_TIERS)[number];

/** ProtonDB's own colour for each rating (as its site and the ProtonDB Badges plugin draw them). */
export const PROTON_COLOURS: Record<ProtonTier, string> = {
    platinum: '#b4c7dc',
    gold: '#cfb53b',
    silver: '#a6a6a6',
    bronze: '#cd7f32',
    borked: '#ff0000',
};

export function parseTier(value: unknown): ProtonTier | null {
    if (typeof value !== 'string') return null;
    const tier = value.toLowerCase() as ProtonTier;
    return PROTON_TIERS.includes(tier) ? tier : null;
}
