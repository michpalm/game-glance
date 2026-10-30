import {SOURCE_PILL,sourcePillLook} from '../styles/sourcePill';
import {homeHeaderCss} from './homeHeaderDom';
import {focusRing} from '../styles/tokens';
/** The footer part alone (owned native footer groups): Home and the game page render the same rules, so the footer never changes style between them. */
export const homeFooterCss=`[data-gh-footer=true]{background:transparent!important;box-shadow:none!important;border-image:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-color:transparent!important}
[data-gh-footer-wrapper=true]{align-items:center}
[data-gh-footer-side]{${sourcePillLook(n=>`${n}px`)}display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);margin:0;white-space:nowrap}
[data-gh-footer-side]>:first-child{display:flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
[data-gh-footer-side]>:first-child img,[data-gh-footer-side]>:first-child svg{max-height:14px;max-width:16px;width:auto;object-fit:contain;filter:brightness(0) invert(1)}
[data-gh-footer-side]>:last-child{font:inherit;letter-spacing:normal;text-transform:none}
[data-gh-footer-side=end][data-gh-footer-edge=first]{border-top-right-radius:0;border-bottom-right-radius:0;border-right:0;padding-right:10px}
[data-gh-footer-side=end][data-gh-footer-edge=middle]{border-radius:0;border-left:0;border-right:0;padding:0 10px}
[data-gh-footer-side=end][data-gh-footer-edge=last]{border-top-left-radius:0;border-bottom-left-radius:0;border-left:0;padding-left:10px}
`;
/** Only owned native footer groups and explicitly interactive Home cells. */
export const homeControlsCss=`
${homeHeaderCss}
html:has(.gh-keyboard-surface [data-home-search=editing]) [data-gh-footer=true],html:has(.gh-keyboard-surface [data-home-search=editing]) [data-gh-footer=true] *{visibility:hidden!important}
.gh-search-position{position:absolute;pointer-events:auto;height:32px}
.gh-keyboard-surface button.gh-search-control.DialogButton{${sourcePillLook(n=>`${n}px`)}display:flex;align-items:center;gap:8px;box-sizing:border-box;width:100%;height:32px;min-height:0;padding:0 14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;font-family:inherit;text-align:left;transition:width 150ms ease;box-shadow:none}
.gh-search-control svg{width:16px;height:16px;flex:none}
.gh-search-control span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
:where(html:not([data-gg-mouse])) .gh-keyboard-surface button.gh-search-control.DialogButton:is(.gpfocus,:focus-visible){${focusRing('menu')}}
.gh-search-error{display:block;margin-top:8px;color:#fff;text-shadow:0 1px 2px #000;background:rgba(12,16,22,.75);padding:8px;border-radius:8px}
.gh-keyboard-surface .gg-keyboard{pointer-events:auto}
.gh-keyboard-surface .gg-keyboard-row button.DialogButton{display:flex;align-items:center;justify-content:center}

${homeFooterCss}.gh-status .gh-status-control{pointer-events:auto;cursor:default;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:${SOURCE_PILL.height-8}px;min-width:24px;padding:0 2px;border-radius:6px;outline:0}
:where(html:not([data-gg-mouse])) .gh-status .gh-status-control:is(.gpfocus,:focus-visible){${focusRing('menu')}}
.gh-status .gh-status-dot-control{min-width:6px;min-height:6px;width:6px;height:6px;padding:0;border-radius:50%}
.gh-status-dot-control:before{content:"";position:absolute;inset:-9px}
:where(html:not([data-gg-mouse])) .gh-status .gh-status-dot-control:is(.gpfocus,:focus-visible){outline-offset:8px}
html[data-gg-mouse] .gh-status .gh-status-control:hover{background:rgba(255,255,255,.12)}
`;
/** What Home renders: everything while its controls are active, the footer alone while it only holds the footer (the open transition). */
export const homeControlsStyle=(active:boolean,footer:boolean):string|null=>active?homeControlsCss:footer?homeFooterCss:null;
