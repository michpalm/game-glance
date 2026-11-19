import { IDLE_TILE, focusRing, unit as u } from '../styles/tokens';

const FOCUS = ':is(.gpfocus,:focus-visible,:focus)';
const TILE = '.gg-media button.gg-media-tile.DialogButton';
const ACTION = '.gg-media button.gg-media-action.DialogButton';
const PLAIN = '.gg-media button.gg-media-plain.DialogButton';
const FULL_SHOT = '.gg-media button.gg-media-full-shot.DialogButton';
const BTN_RESET = 'margin:0;padding:0;border:none;box-shadow:none;cursor:default;font:inherit;text-transform:none;color:var(--gg-text)';

/**
 * Game Glance's Media (mock-ups M1 gallery, M3b viewer, M4 full screen) on the page kit. Units are the mock-ups'
 * 1920-wide pixels.
 */
export const mediaStyles = `
.gg-media .gg-pk-backdrop{filter:var(--gg-art-fill);opacity:.45}
.gg-media-tabs{position:absolute;left:${u(96)};top:${u(150)};width:${u(1728)};z-index:1}
.gg-media-grid{position:absolute;left:${u(90)};right:${u(90)};top:${u(212)};bottom:0;overflow-y:auto;padding:6px 6px ${u(120)};scroll-padding-block:6px ${u(120)};scrollbar-width:none}
.gg-media-day{margin:${u(18)} 0 ${u(12)}}
.gg-media-row{display:flex;gap:${u(20)};margin-bottom:${u(20)}}
${TILE}{position:relative;flex:none;width:${u(330)};height:${u(186)};min-width:0;${BTN_RESET};border-radius:${u(12)};overflow:hidden;background:rgba(255,255,255,.08)}
${TILE} img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
${TILE}${FOCUS}{${focusRing('menu', u)}}
.gg-media-tile-name{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:${u(12)};text-align:center;font-size:${u(18)};font-weight:var(--gg-weight-heading)}
.gg-media-clip{position:absolute;left:${u(12)};bottom:${u(10)};display:inline-flex;align-items:center;gap:${u(8)};padding:${u(4)} ${u(10)};border-radius:var(--gg-r-pill);background:rgba(5,7,10,.72);font-size:${u(16)};font-weight:var(--gg-weight-heading)}
.gg-media-badge{position:absolute;right:${u(10)};top:${u(10)};padding:${u(3)} ${u(10)};border-radius:var(--gg-r-pill);background:rgba(5,7,10,.72);font-size:${u(14)}}
.gg-media-empty{position:absolute;left:${u(96)};top:${u(260)};display:flex;flex-direction:column;align-items:flex-start;gap:${u(20)};font-size:${u(26)};color:var(--gg-text-dim)}
${PLAIN}{width:auto;min-width:0;padding:${u(12)} ${u(22)};${BTN_RESET.replace('padding:0;', '')};border-radius:var(--gg-r-pill);background:var(--gg-glass);font-size:${u(19)};font-weight:var(--gg-weight-heading)}
${PLAIN}${FOCUS}{${focusRing('menu', u)};background:rgba(255,255,255,.92);color:#10141a;text-shadow:none}
.gg-media-view-shot{position:absolute;left:${u(96)};top:${u(150)};width:${u(1280)};height:${u(720)};border-radius:${u(14)};overflow:hidden;background:#000}
.gg-media-view-shot img{width:100%;height:100%;object-fit:contain}
.gg-media-panel{position:absolute;left:${u(1404)};top:${u(150)};width:${u(420)};height:${u(720)};box-sizing:border-box;padding:${u(30)};display:flex;flex-direction:column;gap:${u(14)};border-radius:${u(18)};border:${u(1.5)} solid ${IDLE_TILE.edge};background:var(--gg-glass);backdrop-filter:blur(var(--gg-glass-blur))}
.gg-media-panel-name{margin:0;font-size:${u(32)};font-weight:var(--gg-weight-heading);line-height:1.15;overflow-wrap:anywhere}
.gg-media-panel-line{font-size:${u(18)};color:var(--gg-text-dim)}
.gg-media-uploaded{align-self:flex-start;padding:${u(4)} ${u(12)};border-radius:var(--gg-r-pill);background:rgba(95,209,174,.2);font-size:${u(16)}}
.gg-media-actions{margin-top:auto;display:flex;flex-direction:column;gap:${u(10)}}
${ACTION}{width:100%;min-width:0;display:flex;align-items:center;gap:${u(14)};padding:${u(12)} ${u(16)};${BTN_RESET.replace('padding:0;', '')};border-radius:${u(12)};background:rgba(255,255,255,.08);font-size:${u(19)};font-weight:var(--gg-weight-heading);text-align:left}
${ACTION}${FOCUS}{${focusRing('menu', u)};background:rgba(255,255,255,.92);color:#10141a;text-shadow:none}
.gg-media-strip-row{position:absolute;left:${u(96)};top:${u(900)};display:flex;gap:${u(14)}}
.gg-media-film{flex:none;width:${u(170)};height:${u(96)};border-radius:${u(8)};overflow:hidden;opacity:.6;background:rgba(255,255,255,.08)}
.gg-media-film img{width:100%;height:100%;object-fit:cover}
.gg-media-film-current{opacity:1;box-shadow:0 0 0 ${u(3)} var(--gg-text)}
.gg-media.gg-media-full{background:#000}
.gg-media.gg-media-full .gg-pk-title{display:none}
${FULL_SHOT}{position:absolute;inset:0;width:100%;height:100%;${BTN_RESET};border-radius:0;background:#000}
${FULL_SHOT} img{width:100%;height:100%;object-fit:contain}
.gg-media-strip{position:absolute;left:0;right:0;top:0;display:flex;gap:${u(24)};align-items:baseline;padding:${u(28)} ${u(96)} ${u(48)};background:linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,0));font-size:${u(20)};transition:opacity var(--gg-base);pointer-events:none}
.gg-media-strip[data-visible="false"]{opacity:0}
.gg-media-strip-name{font-weight:var(--gg-weight-heading)}
.gg-media-strip-count{margin-left:auto;color:var(--gg-text-dim)}
.gg-media-toast{position:absolute;left:50%;bottom:${u(110)};transform:translateX(-50%);padding:${u(12)} ${u(24)};border-radius:var(--gg-r-pill);background:rgba(5,7,10,.88);font-size:${u(19)};z-index:3}
`;
