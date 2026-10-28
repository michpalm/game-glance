/** Shared appearance of Game Glance Home's glass action buttons. */
export const HOME_BUTTON_GLASS = {
    borderColor: 'rgba(255,255,255,.18)',
    blurPx: 16,
    color: '#fff',
    fontWeight: 700,
} as const;

/** Home information-card focus: a single accent edge and a soft glow below it. */
export function homeCardFocusShadow(accent: string): string {
    return `0 0 0 1px ${accent}, 0 16px 40px -12px ${accent}`;
}
