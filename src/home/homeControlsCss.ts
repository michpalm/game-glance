import {SOURCE_PILL,sourcePillLook} from '../styles/sourcePill';
import {focusRing} from '../styles/tokens';
/** Only owned native footer groups and explicitly interactive Home cells. */
export const homeControlsCss=`
[data-gh-footer=true]{background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-color:transparent!important}
[data-gh-footer-wrapper=true]{align-items:center}
[data-gh-footer-side]{${sourcePillLook(n=>`${n}px`)}display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);margin:0;white-space:nowrap}
[data-gh-footer-side]>:first-child{display:flex;align-items:center;height:20px}
[data-gh-footer-side]>:first-child img,[data-gh-footer-side]>:first-child svg{max-height:20px;max-width:28px;width:auto;object-fit:contain}
[data-gh-footer-side]>:last-child{font:inherit;letter-spacing:normal;text-transform:none}
[data-gh-footer-side=end][data-gh-footer-edge=first]{border-top-right-radius:0;border-bottom-right-radius:0;border-right:0;padding-right:10px}
[data-gh-footer-side=end][data-gh-footer-edge=middle]{border-radius:0;border-left:0;border-right:0;padding:0 10px}
[data-gh-footer-side=end][data-gh-footer-edge=last]{border-top-left-radius:0;border-bottom-left-radius:0;border-left:0;padding-left:10px}
.gh-status .gh-status-control{pointer-events:auto;cursor:default;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:${SOURCE_PILL.height-8}px;min-width:24px;padding:0 2px;border-radius:6px;outline:0}
:where(html:not([data-gg-mouse])) .gh-status .gh-status-control:is(.gpfocus,:focus-visible){${focusRing('menu')}}
.gh-status .gh-status-dot-control{min-width:6px;min-height:6px;width:6px;height:6px;padding:0;border-radius:50%}
.gh-status-dot-control:before{content:"";position:absolute;inset:-9px}
:where(html:not([data-gg-mouse])) .gh-status .gh-status-dot-control:is(.gpfocus,:focus-visible){outline-offset:8px}
html[data-gg-mouse] .gh-status .gh-status-control:hover{background:rgba(255,255,255,.12)}
`;
