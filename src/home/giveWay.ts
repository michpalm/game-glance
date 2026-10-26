/**
 * What of Home gives way to its default growth (home/scale defaultGrowth, docs/superpowers/specs/2026-10-23-ui-scale-design.md,
 * #55): Home is drawn a little larger than authored, so its logical canvas is a little shorter, and the stack moves up
 * by the room missing, taken from the air above the title. Nothing else gives way: the growth is sized so the air is
 * enough. Pure.
 *
 * The stack's layout numbers are homeCss FEED_SHEET's (a test keeps them equal): importing homeCss here would close an
 * import cycle through themeCss and scale.
 */

const TABS_TOP = 700;
const TAB_HEIGHT = 8 + 10 + 13 * 1.2;
const TAB_CLEARANCE = 18;
const LEGEND_RESERVE = 46;

/** Logical px the air above the title can give (118 -> 66, just under Steam's top bar). */
export const GIVE_WAY = { air: 52 } as const;

/** Where the stack ends today: the tab strip's bottom plus its clearance above the legend reserve. */
export const STACK_BOTTOM = TABS_TOP + TAB_HEIGHT + TAB_CLEARANCE;

/** The layout numbers above, for the test that keeps them equal to homeCss's. */
export const STACK_NUMBERS = { tabsTop: TABS_TOP, tabHeight: TAB_HEIGHT, tabClearance: TAB_CLEARANCE, legendReserve: LEGEND_RESERVE } as const;

export interface GiveWay {
    /** Logical px the whole stack moves up, out of the air above the title. */
    need: number;
}

/** Logical px a canvas `logicalHeight` tall lacks for the stack with a legend `legendReserve` tall; 0 with room to spare or a broken height. */
export function roomMissing(logicalHeight: number, legendReserve: number): number {
    if (!Number.isFinite(logicalHeight)) return 0;
    const legend = Number.isFinite(legendReserve) ? legendReserve : LEGEND_RESERVE;
    return Math.max(0, Math.ceil(STACK_BOTTOM + legend - logicalHeight));
}

/** The give-way for `need` px missing: taken from the air, at most GIVE_WAY.air (stackShift answers a taller legend). */
export function giveWay(need: number): GiveWay {
    return { need: Number.isFinite(need) ? Math.min(GIVE_WAY.air, Math.max(0, need)) : 0 };
}
