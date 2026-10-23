import { PAGE_LAYOUT } from '../styles/themeCss';
import { TITLE_ONE_LINE_SIZES } from './giveWay';
import { homeStack, TITLE_BLOCK } from './homeCss';
import { legendReserve } from './legend';
import { homeCanvas } from './scale';

/**
 * Whether the title's slot is down to one line (home/giveWay step 2) for a Big Picture window `width` x `height` CSS px
 * at pixel ratio `dpr` with Steam's legend `legendCss` CSS px tall (legend.findLegendHeight; null: not found). Home and
 * the restyled game page both ask this, so the open transition hands a title or logo over at the same size (#55). Pure.
 */
export function titleOneLine(width: number, height: number, dpr: number | undefined, legendCss: number | null | undefined): boolean {
    const canvas = homeCanvas(width, height, dpr);
    return homeStack(canvas.logicalHeight, legendReserve(legendCss, canvas.scale), false).give.titleLines === 1;
}

/** The restyled page's one-line title steps in CSS px for its unit `d`: Home's steps (giveWay) at the page's title ratio (64 / 58). */
export function pageTitleSizes(d: number): number[] {
    const ratio = PAGE_LAYOUT.titleBlock.title / TITLE_BLOCK.titleSize;
    return TITLE_ONE_LINE_SIZES.map((size) => size * ratio * d);
}
