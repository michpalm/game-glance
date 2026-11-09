/**
 * The shading over the game art on Spotlight Home and the restyled game page together
 * (docs/superpowers/specs/2026-10-30-page-shading-design.md): Bottom half keeps the two bottom scrims, None draws none.
 * The layers themselves are themeCss.pageScrimLayers. Pure.
 */

export type PageShading = 'bottom' | 'none';
export const PAGE_SHADINGS: readonly PageShading[] = ['bottom', 'none'];

export function pageShadingOf(value: unknown): PageShading {
    return value === 'none' ? 'none' : 'bottom';
}

/** The settings panel's option labels and the description shown for the selected one. */
export const PAGE_SHADING_COPY: Record<PageShading, { label: string; description: string }> = {
    bottom: { label: 'Bottom half', description: 'A soft shade behind the games and cards, none at the top.' },
    none: { label: 'None', description: 'The art stays clear to every edge.' },
};
