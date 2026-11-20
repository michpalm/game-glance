import { IDLE_TILE, focusRing, tokenCss, unit as u } from '../styles/tokens';

/**
 * Steam's DialogButton rules are long class chains; a kit button rule written through this wins over them, so a page
 * using a kit part needs no long selector of its own.
 */
export const pkButton = (part: string) => `.gg-pk button.gg-pk-${part}.DialogButton`;
const FOCUS = ':is(.gpfocus,:focus-visible,:focus)';
const TAB = pkButton('tab');

/**
 * The page kit (spec 2026-11-19-library-page-design §1): the parts every Game Glance page shares, scoped under
 * `.gg-pk`. Units are the mock-ups' 1920-wide pixels (`--gg-d`), as Storage and Downloads.
 */
export const pageKitStyles = tokenCss('.gg-pk') + `
.gg-pk{--gg-d:calc(100vw / 1920);position:absolute;inset:0;overflow:hidden;background:var(--gg-scrim);color:var(--gg-text);font-family:"Motiva Sans",Arial,sans-serif;text-shadow:var(--gg-text-shadow)}
.gg-pk-backdrop{position:absolute;inset:${u(-80)};background-size:cover;background-position:center;filter:var(--gg-art-fill-dim);opacity:.55}
.gg-pk-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,10,.35),rgba(5,7,10,.75))}
.gg-pk-title{position:absolute;left:${u(96)};top:${u(66)};margin:0;font-size:${u(46)};font-weight:var(--gg-weight-heading);line-height:1.2;z-index:2}
.gg-pk-tabs{display:flex;align-items:center;gap:${u(10)};max-width:100%}
.gg-pk-tabs-list{position:relative;flex:1;min-width:0;display:flex;gap:${u(10)};overflow-x:auto;scrollbar-width:none;padding:${u(4)};margin:${u(-4)}}
.gg-pk-bumper{flex:none;display:inline-flex;align-items:center;justify-content:center;width:${u(40)};height:${u(26)};border-radius:${u(8)};background:rgba(255,255,255,.16);font-size:${u(14)};font-weight:var(--gg-weight-heading)}
${TAB}{flex:none;width:auto;min-width:0;margin:0;padding:${u(8)} ${u(14)};border-radius:var(--gg-r-pill);border:none;font:inherit;font-size:${u(19)};font-weight:var(--gg-weight-heading);text-transform:none;white-space:nowrap;cursor:default;color:var(--gg-text);text-shadow:none;background:rgba(255,255,255,.09);box-shadow:none;transition:background var(--gg-fast),color var(--gg-fast)}
${TAB}[aria-selected="true"]{background:rgba(255,255,255,.92);color:#10141a}
${TAB}${FOCUS}{${focusRing('menu', u)}}
.gg-pk-bar{display:block;height:${u(8)};border-radius:var(--gg-r-pill);background:var(--gg-track);overflow:hidden}
.gg-pk-bar-fill{display:block;height:100%;border-radius:inherit;background:var(--gg-accent);transition:width var(--gg-base) linear}
.gg-pk-bar-ok .gg-pk-bar-fill{background:var(--gg-ok,#5fd1ae)}
.gg-pk-pill{display:inline-flex;align-items:center;padding:${u(7)} ${u(14)};border-radius:var(--gg-r-pill);background:rgba(255,255,255,.12);border:1px solid ${IDLE_TILE.edge};font-size:${u(16)};font-weight:var(--gg-weight-heading);white-space:nowrap}
.gg-pk-eyebrow{margin:0;font-size:${u(15)};font-weight:var(--gg-weight-heading);letter-spacing:.06em;text-transform:uppercase;color:var(--gg-text-dim)}
.gg-pk-fact{display:flex;flex-direction:column;gap:${u(4)};min-width:0}
.gg-pk-fact-label{font-size:${u(16)};font-weight:var(--gg-weight-heading);letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.gg-pk-fact-value{font-size:${u(22)};font-weight:var(--gg-weight-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;
