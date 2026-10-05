/**
 * The store pill's look (icon + store name), shared by the restyled game page (`.gg-pill`, sized in --gg-d units) and
 * Spotlight Home (`.gh-source`, in canvas px), so both draw exactly the same pill. Sizes are handoff px on the
 * 1440-wide canvas; `unit` turns them into the target's CSS length. Pure.
 */
export const SOURCE_PILL = {
    height: 32,
    padX: 14,
    fontSize: 15,
    fontWeight: 700,
    blur: 12,
    icon: 16,
    iconGap: 8,
    /** Distance from the screen's right edge (the page's side inset). */
    right: 56,
    background: 'rgba(12, 16, 22, 0.4)',
    border: 'rgba(255, 255, 255, 0.18)',
} as const;

/** Size, type and fill of the pill (the game page's restyle on top of its 1.1.1 pill: radius 999, 1px border, inline-flex). */
export function sourcePillLook(unit: (px: number) => string): string {
    const p = SOURCE_PILL;
    return `height: ${unit(p.height)}; padding: 0 ${unit(p.padX)}; font-size: ${unit(p.fontSize)}; font-weight: ${p.fontWeight}; backdrop-filter: blur(${unit(p.blur)});
            background: ${p.background}; border-color: ${p.border};`;
}

/** The icon inside the pill. */
export function sourcePillIcon(unit: (px: number) => string): string {
    const p = SOURCE_PILL;
    return `width: ${unit(p.icon)}; height: ${unit(p.icon)}; margin-right: ${unit(p.iconGap)};`;
}
