/**
 * The game's title and logo size on Spotlight Home and the restyled game page (settings titleSize). Some logos and long
 * names read too large on some screens, so they can be drawn smaller: the logo's box (home/logo.logoFit) and the title's
 * type both scale by the factor, bottom-left in the same place, so the eyebrow, chips and actions never move. Large is
 * the size Game Glance always drew. Home and the page share the factor, so the open transition's twins keep their ratio.
 * Pure.
 */

export type TitleSize = 'small' | 'medium' | 'large';
export const TITLE_SIZES: readonly TitleSize[] = ['small', 'medium', 'large'];

export const TITLE_SCALE: Record<TitleSize, number> = { small: 0.7, medium: 0.85, large: 1 };

export function titleSizeOf(value: unknown): TitleSize {
    return value === 'small' || value === 'medium' ? value : 'large';
}

/** The factor for a stored value; 1 for anything unknown. */
export function titleScale(value: unknown): number {
    return TITLE_SCALE[titleSizeOf(value)];
}

/** The CSS custom property the title rules multiply their font size by (homeCss .gh-title and twins, themeCss .gg-title). */
export const TITLE_SCALE_VAR = '--gg-title-scale';

/** The settings' option labels and the description shown for the selected one. */
export const TITLE_SIZE_COPY: Record<TitleSize, { label: string; description: string }> = {
    small: { label: 'Small', description: 'The logo or name at 70%, for more room around the art.' },
    medium: { label: 'Medium', description: 'The logo or name at 85%.' },
    large: { label: 'Large', description: 'The logo or name at full size.' },
};
