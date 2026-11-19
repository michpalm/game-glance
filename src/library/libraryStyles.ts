import { PROTON_COLOURS, PROTON_TIERS } from '../logic/protonTier';
import { IDLE_TILE, focusRing, unit as u } from '../styles/tokens';

const COVER = '.gg-library button.gg-library-cover.DialogButton', TILE = '.gg-library button.gg-library-col.DialogButton';
const FOCUS = ':is(.gpfocus,:focus-visible,:focus)';
/** A soft oval of shade behind the logo and facts (Michael, PS5 check 3: the straight-edged box read as a dark square). */
const SHADE = 'radial-gradient(ellipse 66% 82% at 0% 42%,rgba(5,7,10,.78) 0%,rgba(5,7,10,.52) 48%,rgba(5,7,10,0) 80%)';
const FADE = 'linear-gradient(180deg,#000 0%,#000 55%,transparent 100%)';

/**
 * The Library's own layout (mock-up L11) on top of the page kit: the highlighted game's hero across the top with its
 * facts, the tabs, then the covers over the same art blurred (Michael, PS5 checks 2026-11-19: black below was too dark;
 * the hero over the whole page was too much). Units are the mock-up's 1920-wide pixels.
 */
export const libraryStyles = `
.gg-library .gg-pk-backdrop{filter:var(--gg-art-fill);opacity:.7}
.gg-library-floor{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,10,.10) 0%,rgba(5,7,10,.30) 55%,rgba(5,7,10,.50) 100%)}
.gg-library-hero{position:absolute;left:0;right:0;top:0;height:${u(560)};-webkit-mask-image:${FADE};mask-image:${FADE};animation:gg-library-in var(--gg-base) ease-out}
.gg-library-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 25%}
.gg-library-hero-soft .gg-library-hero-img{filter:var(--gg-art-fill);transform:scale(1.1)}
.gg-library-hero-shade{position:absolute;inset:0;background:${SHADE}}
@keyframes gg-library-in{from{opacity:.4}to{opacity:1}}
.gg-library-glance{position:absolute;left:${u(96)};top:${u(136)};width:${u(1100)};z-index:1;text-shadow:0 ${u(1)} ${u(3)} rgba(0,0,0,.95),0 0 ${u(22)} rgba(0,0,0,.8)}
.gg-library-glance .gg-pk-fact-label{color:rgba(255,255,255,.8)}
.gg-library-logo-slot{height:${u(144)};display:flex;align-items:flex-end}
.gg-library-logo{display:block;object-fit:contain;object-position:left bottom;filter:drop-shadow(0 ${u(4)} ${u(24)} rgba(0,0,0,.45))}
.gg-library-logo-dark{filter:drop-shadow(0 0 ${u(2)} rgba(255,255,255,.85)) drop-shadow(0 0 ${u(16)} rgba(255,255,255,.45))}
.gg-library-name{margin:0;display:flex;align-items:flex-end;font-size:${u(44)};font-weight:var(--gg-weight-heading);line-height:1.1}
.gg-library-groups{display:flex;gap:${u(50)};margin-top:${u(30)}}
.gg-library-progress{width:${u(330)};display:flex;flex-direction:column;gap:${u(22)}}
.gg-library-line{display:flex;flex-direction:column;gap:${u(10)}}
.gg-library-line-head{display:flex;justify-content:space-between;align-items:baseline}
.gg-library-facts{display:grid;grid-template-columns:${u(210)} ${u(210)};row-gap:${u(22)}}
.gg-library-tone{display:inline-flex;align-items:center;gap:${u(8)}}
.gg-library-mark{display:inline-flex;font-size:${u(20)};line-height:1}
${PROTON_TIERS.map(t => `.gg-library-tone[data-tone="${t}"] .gg-library-mark{color:${PROTON_COLOURS[t]}}`).join('\n')}
.gg-library-pills{display:flex;gap:${u(8)};margin-top:${u(26)}}
.gg-library-tabs{position:absolute;left:${u(96)};top:${u(552)};width:${u(1728)};display:flex;align-items:center;gap:${u(24)};z-index:1}
.gg-library-tabs .gg-pk-tabs{flex:1;min-width:0}
.gg-library-sort{flex:none;display:inline-flex;align-items:center;gap:${u(10)};font-size:${u(18)};font-weight:var(--gg-weight-heading);color:var(--gg-text-dim)}
.gg-library-glyph{display:inline-flex;align-items:center;justify-content:center;width:${u(26)};height:${u(26)};border-radius:50%;background:rgba(235,238,245,.9);color:#10141a;font-size:${u(14)};text-shadow:none}
.gg-library-grid{position:absolute;left:${u(90)};right:${u(90)};top:${u(604)};bottom:0;overflow-y:auto;padding:6px 6px ${u(120)};scroll-padding-block:6px ${u(120)};scrollbar-width:none}
.gg-library-row{display:flex;gap:${u(14)};margin-bottom:${u(14)}}
.gg-library-spacer{flex:none}
${COVER}{position:relative;flex:none;width:${u(120)};height:${u(180)};min-width:0;margin:0;padding:0;border:none;border-radius:${u(10)};overflow:hidden;background:rgba(255,255,255,.08);box-shadow:none;cursor:default;font:inherit;text-transform:none;color:var(--gg-text)}
${COVER} img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.gg-library-cover-name{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:${u(10)};text-align:center;font-size:${u(16)};font-weight:var(--gg-weight-heading);line-height:1.2}
${COVER}${FOCUS}{${focusRing('menu', u)}}
${TILE}{flex:none;width:${u(420)};height:${u(110)};margin:0;padding:${u(20)} ${u(26)};display:flex;flex-direction:column;justify-content:center;gap:${u(4)};text-align:left;border-radius:${u(18)};border:${u(1.5)} solid ${IDLE_TILE.edge};background:var(--gg-glass);background-image:linear-gradient(${IDLE_TILE.tint},${IDLE_TILE.tint});backdrop-filter:blur(var(--gg-glass-blur));cursor:default;font:inherit;text-transform:none;color:var(--gg-text)}
.gg-library-col-name{font-size:${u(26)};font-weight:var(--gg-weight-heading)}
.gg-library-col-count{font-size:${u(19)};color:var(--gg-text-dim)}
${TILE}${FOCUS}{${focusRing('menu', u)};background:var(--gg-glass-strong)}
`;
