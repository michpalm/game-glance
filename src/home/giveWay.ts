/**
 * What of Home gives way when Steam's display scale leaves too little room (docs/superpowers/specs/2026-10-23-ui-scale-design.md,
 * #55). Home grows with Steam's scale (home/scale.ts), so a larger scale gives it a shorter logical canvas; the stack
 * then moves up by the room missing, in this order: the air above the title, the title's second line, the gaps in the
 * title block, then the stats chips. The games row, the action row and the tab strip never give way. Pure.
 *
 * The stack's layout numbers are homeCss FEED_SHEET's (a test keeps them equal): importing homeCss here would close an
 * import cycle through themeCss and scale.
 */

const TABS_TOP = 700;
const TAB_HEIGHT = 8 + 10 + 13 * 1.2;
const TAB_CLEARANCE = 18;
const LEGEND_RESERVE = 46;

/** Logical px each step frees: the air above the title (118 -> 66), one title line, the title block's gaps, the chip row and its gap. */
export const GIVE_WAY = { air: 52, titleLine: 58, gaps: 25, chips: 87 } as const;
export const GIVE_WAY_TOTAL = GIVE_WAY.air + GIVE_WAY.titleLine + GIVE_WAY.gaps + GIVE_WAY.chips;

/** Where the stack ends today: the tab strip's bottom plus its clearance above the legend reserve. */
export const STACK_BOTTOM = TABS_TOP + TAB_HEIGHT + TAB_CLEARANCE;
/** The shortest canvas the stack fits with every step taken: Home stops growing there. */
export const MIN_LOGICAL_HEIGHT = Math.ceil(STACK_BOTTOM + LEGEND_RESERVE - GIVE_WAY_TOTAL);

/** The layout numbers above, for the test that keeps them equal to homeCss's. */
export const STACK_NUMBERS = { tabsTop: TABS_TOP, tabHeight: TAB_HEIGHT, tabClearance: TAB_CLEARANCE, legendReserve: LEGEND_RESERVE } as const;

export interface GiveWay {
    /** Logical px the whole stack moves up. */
    need: number;
    titleLines: 1 | 2;
    gapsTight: boolean;
    chipsHidden: boolean;
}

/** Logical px a canvas `logicalHeight` tall lacks for the stack with a legend `legendReserve` tall; 0 with room to spare or a broken height. */
export function roomMissing(logicalHeight: number, legendReserve: number): number {
    if (!Number.isFinite(logicalHeight)) return 0;
    const legend = Number.isFinite(legendReserve) ? legendReserve : LEGEND_RESERVE;
    return Math.max(0, Math.ceil(STACK_BOTTOM + legend - logicalHeight));
}

/**
 * The steps for `need` px missing (clamped to 0..GIVE_WAY_TOTAL): the air takes the first 52; past it each later step
 * switches on whole as soon as the room before it is not enough. What the title block frees beyond `need` returns as
 * air above the title (its top is 118 - need + titleGive).
 */
export function giveWay(need: number): GiveWay {
    const n = Number.isFinite(need) ? Math.min(GIVE_WAY_TOTAL, Math.max(0, need)) : 0;
    const g = GIVE_WAY;
    return {
        need: n,
        titleLines: n > g.air ? 1 : 2,
        gapsTight: n > g.air + g.titleLine,
        chipsHidden: n > g.air + g.titleLine + g.gaps,
    };
}

/** Logical px the title block frees inside itself for these steps. */
export function titleGive(g: GiveWay): number {
    return (2 - g.titleLines) * GIVE_WAY.titleLine + (g.gapsTight ? GIVE_WAY.gaps : 0) + (g.chipsHidden ? GIVE_WAY.chips : 0);
}
