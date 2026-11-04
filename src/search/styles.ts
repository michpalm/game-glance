import {tokenCss,frostSurface,labelText,unit as u,focusRing} from '../styles/tokens';
export const searchStyles=tokenCss('.gg-search-overlay')+`
.gg-search-backdrop{position:fixed;inset:56px 0 0;pointer-events:auto;background:rgba(5,7,12,.58);backdrop-filter:blur(4px)}
.gg-search-overlay{position:fixed;box-sizing:border-box;padding:${u(24)};border:1px solid var(--gg-edge);border-radius:${u(16)};${frostSurface('16px')};color:var(--gg-text);pointer-events:auto;box-shadow:0 16px 35px #0006;font-family:inherit;text-shadow:var(--gg-text-shadow)}
.gg-search-overlay *{box-sizing:border-box}
.gg-search-field{display:flex!important;align-items:center;justify-content:flex-start!important;gap:${u(12)};height:${u(48)}!important;min-height:0!important;width:100%!important;padding:0 ${u(16)}!important;margin:0 0 ${u(16)}!important;background:var(--gg-glass-strong)!important;border:1px solid var(--gg-edge)!important;border-radius:${u(12)}!important;color:var(--gg-text)!important;font-size:${u(20)}!important;font-weight:700!important;box-shadow:none!important;transform:none!important}
.gg-search-field svg{width:${u(20)};height:${u(20)};flex:none}.gg-search-field>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.gg-search-field.gpfocus,.gg-search-field:focus-visible{outline:2px solid white!important;outline-offset:3px!important}
.gg-search-heading{display:flex;align-items:center;justify-content:space-between;gap:${u(16)};height:${u(20)};margin-bottom:${u(8)};font-size:${u(16)};font-weight:700}.gg-search-count{${labelText()};font-size:${u(14)};font-weight:400}
.gg-search-list{overflow:auto;overscroll-behavior:contain;scroll-padding:${u(8)};padding:4px;position:relative;margin:-4px}.gg-search-list-inner{position:relative;width:100%}
.gg-search-row{position:absolute!important;left:0;right:0;display:flex!important;align-items:center;gap:${u(16)};width:100%!important;min-height:0!important;padding:${u(8)} ${u(12)}!important;margin:0!important;border:1px solid transparent!important;border-radius:${u(12)}!important;background:rgba(255,255,255,.03)!important;box-shadow:none!important;transform:none!important;color:var(--gg-text)!important;text-align:left!important}
.gg-search-row.gpfocus,.gg-search-row:focus-visible{${focusRing('menu')};background:var(--gg-glass-strong)!important}
.gg-search-capsule{width:${u(45)};height:${u(61)};border-radius:${u(5)};object-fit:cover;flex:none;background:var(--gg-empty-fill)}
.gg-search-caption{flex:1;min-width:0}.gg-search-title{font-size:${u(19)};font-weight:700;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.gg-search-edition{${labelText()};font-size:${u(14)};margin-top:${u(4)}}
.gg-search-installed{${labelText()};font-size:${u(14)};flex:none;white-space:nowrap}
.gg-search-message{${labelText()};font-size:${u(16)};padding:${u(16)} 0}.gg-search-error{${labelText()};font-size:${u(14)};padding-top:${u(8)}}
@media(prefers-reduced-motion:reduce){.gg-search-overlay,.gg-search-row{animation:none!important;transition:none!important}}
`;
