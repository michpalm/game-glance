import { Focusable } from '@decky/ui';

/** "20,663 playing", in the locale's grouping. */
export function playersLabel(count: number, locale: string): string {
    return `${count.toLocaleString(locale)} playing`;
}

/**
 * How many people play the game now: a glass pill with a live dot, beside the store and family pills (Home's `gh-players`,
 * the page's `gg-players`, the open copy's `gh-x-players`). With `chart` (the page, PlayCount installed) it is a button
 * that opens PlayCount's chart; otherwise display only. `data-players-pill` is what styles/playersFit measures.
 */
export function PlayersPill({ count, locale, className, dotClassName, chart = null }: { count: number; locale: string; className: string; dotClassName: string; chart?: (() => void) | null }) {
    const label = playersLabel(count, locale);
    const content = <><span className={dotClassName} aria-hidden="true" />{label}</>;
    if (!chart) return <span className={className} data-players-pill="">{content}</span>;
    return (
        <Focusable className={`${className} ${className}-choice`} focusClassName={`${className}-focus`} noFocusRing data-players-pill=""
            onActivate={chart} onClick={chart} aria-label={`${label}: Open player chart`}>
            {content}
        </Focusable>
    );
}
