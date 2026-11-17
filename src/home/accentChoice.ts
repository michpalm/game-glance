import { DEFAULT_ACCENT } from './accent';

/**
 * The accent colour setting (settings accentMode, accentColor). Adaptive: each game's colour, sampled from its art,
 * with the chosen colour wherever the art gives none. Custom: the chosen colour everywhere. Every surface (Home, its
 * feed cards, the game page, the menu) asks effectiveAccent, so they always agree. Pure.
 */
export type AccentMode = 'adaptive' | 'custom';
export interface AccentChoice { accentMode: AccentMode; accentColor: string }

/** Presets in two rows of five, so the D-pad moves simply. `light`: fills that need dark text. */
export const ACCENT_SWATCHES: readonly { name: string; color: string; light?: true }[] = [
    { name: 'Teal', color: DEFAULT_ACCENT }, { name: 'Sky', color: '#4fb3ff' }, { name: 'Blue', color: '#6b8cff' },
    { name: 'Violet', color: '#a78bfa' }, { name: 'Pink', color: '#f472b6' },
    { name: 'Red', color: '#f87171' }, { name: 'Orange', color: '#fb923c' }, { name: 'Amber', color: '#fbbf24', light: true },
    { name: 'Lime', color: '#a3e635', light: true }, { name: 'Silver', color: '#d1d5db', light: true },
];

/** The settings' copy (menu General and Quick Access). */
export const ACCENT_MODE_LABELS: Record<AccentMode, string> = { adaptive: 'Match each game', custom: 'My color' };
export const ACCENT_MODE_COPY: Record<AccentMode, string> = {
    adaptive: "Each game's color, taken from its art. The color below is used when the art has none.",
    custom: 'Your color everywhere: Home, the game page and the menu.',
};

const HEX = /^#[\da-f]{6}$/i;

export function accentModeOf(value: unknown): AccentMode {
    return value === 'custom' ? 'custom' : 'adaptive';
}
export function accentColorOf(value: unknown): string {
    return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : DEFAULT_ACCENT;
}

/**
 * The colour to show. `sampled` is what the art gave: accentFor answers DEFAULT_ACCENT when the art has no vivid
 * colour, so that counts as none, as do null and junk.
 */
export function effectiveAccent(sampled: string | null | undefined, choice: AccentChoice): string {
    const chosen = accentColorOf(choice.accentColor);
    if (accentModeOf(choice.accentMode) === 'custom') return chosen;
    return typeof sampled === 'string' && HEX.test(sampled) && sampled.toLowerCase() !== DEFAULT_ACCENT ? sampled : chosen;
}

/** Text on an accent fill (--gg-on-accent): white, as Game Glance always drew it, except dark on a light custom swatch. */
export function onAccentFor(choice: AccentChoice): string {
    const chosen = accentColorOf(choice.accentColor);
    return accentModeOf(choice.accentMode) === 'custom' && ACCENT_SWATCHES.some(s => s.light && s.color === chosen) ? '#0b0d10' : '#fff';
}
