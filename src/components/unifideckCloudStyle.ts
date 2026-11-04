import { CLOUD_COLOURS, CLOUD_DOT, CLOUD_GLYPH_URL, type CloudTone } from '../home/cloud';
import { UNIFIDECK_PAGE } from '../styles/themeCss';

/**
 * Unifideck's cloud-save button on its game page row: the first of an installed game's four round buttons (cloud,
 * controller, settings, Uninstall; read on the Ally 2026-11-04, as themeCss orders them). Its label changes with the state
 * and the language, and its icon's markup with the state (a badge wraps it in a span, a plain icon does not), so its
 * place finds it.
 */
export const UNIFIDECK_CLOUD_BUTTON = '.unifideck-icon-btn:first-child:has(~ .unifideck-icon-btn ~ .unifideck-icon-btn ~ .unifideck-icon-btn)';

/**
 * Game Glance's cloud on Unifideck's button and on our own circle for a game that is not installed (.gg-uni-cloud): the
 * solid white cloud of every other cloud circle, with the state's dot at the top right (#64), in place of Unifideck's
 * ring and glyph. Unifideck keeps its button and what A does; only the look changes.
 */
export function unifideckCloudCss(tone: CloudTone): string {
    const both = `${UNIFIDECK_CLOUD_BUTTON},.gg-uni-cloud`;
    // The page's focus rule resets Unifideck buttons' whole background (themeCss): the cloud image outranks it, focused too.
    const page = `${UNIFIDECK_PAGE} ${UNIFIDECK_CLOUD_BUTTON}`;
    return [
        `${both}{position:relative!important;box-shadow:none!important;opacity:1!important;animation:none!important}`,
        `${page},${page}:is(.gpfocus, :focus),.gg-uni-cloud{background-image:${CLOUD_GLYPH_URL}!important;background-position:center!important;background-size:44%!important;background-repeat:no-repeat!important}`,
        `${UNIFIDECK_CLOUD_BUTTON} > *,.gg-uni-cloud > *{visibility:hidden!important}`,
        `${UNIFIDECK_CLOUD_BUTTON}::after,.gg-uni-cloud::after{content:"";position:absolute;top:${CLOUD_DOT.inset}px;right:${CLOUD_DOT.inset}px;width:${CLOUD_DOT.size}px;height:${CLOUD_DOT.size}px;border-radius:50%;background:${CLOUD_COLOURS[tone]};box-shadow:0 0 0 ${CLOUD_DOT.ring}px ${CLOUD_DOT.ringColour};pointer-events:none}`,
    ].join('\n');
}
