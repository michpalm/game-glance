import { IDLE_TILE, focusRing, unit as u } from '../styles/tokens';

const FOCUS = ':is(.gpfocus,:focus-visible,:focus)';
const ENTRY = '.gg-settings button.gg-settings-entry.DialogButton';
const MORE = '.gg-settings button.gg-settings-more.DialogButton';
const RESET = 'margin:0;border:none;box-shadow:none;cursor:default;font:inherit;text-transform:none;color:var(--gg-text)';
// A focused button is light with dark text: Steam turns a focused DialogButton's text dark (Media PS5 check).
const LIGHT = 'background:rgba(255,255,255,.92);color:#10141a;text-shadow:none';

/** The Settings home (mock-ups S2c list, S2b panel) on the page kit. Units are the mock-ups' 1920-wide pixels. */
export const settingsStyles = `
/* Lift this page's darker hero art so the shared frosted backdrop stays visible under the common shade. */
.gg-settings .gg-pk-backdrop{filter:var(--gg-art-fill);opacity:.7}
.gg-settings-list{position:absolute;left:${u(96)};top:${u(146)};width:${u(514)};display:flex;flex-direction:column}
.gg-settings-group{display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.13);padding:${u(14)} 0}
.gg-settings-group:first-child{border-top:none;padding-top:0}
.gg-settings-open{animation:gg-settings-open var(--gg-base) ease-out}
@keyframes gg-settings-open{from{opacity:.3;transform:translateY(${u(-8)})}to{opacity:1;transform:none}}
.gg-settings-preview{margin-top:${u(6)};font-size:${u(19)};color:rgba(255,255,255,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gg-settings-entries{display:flex;flex-direction:column;gap:${u(4)};margin-top:${u(10)}}
${ENTRY}{width:100%;min-width:0;display:flex;align-items:center;gap:${u(16)};padding:${u(12)} ${u(20)};${RESET};border-radius:${u(14)};background:transparent;font-size:${u(23)};text-align:left;color:var(--gg-text-dim)}
${ENTRY} svg{flex:none;width:${u(28)};height:${u(28)}}
${ENTRY}${FOCUS}{${focusRing('menu', u)};${LIGHT};font-weight:var(--gg-weight-heading)}
.gg-settings-panel{position:absolute;left:${u(650)};top:${u(146)};width:${u(1174)};height:${u(814)};box-sizing:border-box;padding:${u(38)} ${u(40)};display:flex;flex-direction:column;gap:${u(18)};border-radius:${u(22)};border:${u(1.5)} solid ${IDLE_TILE.edge};background:var(--gg-glass);backdrop-filter:blur(var(--gg-glass-blur))}
.gg-settings-head{display:flex;gap:${u(20)};align-items:flex-start}
.gg-settings-head svg{flex:none;width:${u(48)};height:${u(48)}}
.gg-settings-title{margin:0;font-size:${u(36)};font-weight:var(--gg-weight-heading);line-height:1.2}
.gg-settings-desc{margin:${u(6)} 0 0;font-size:${u(22)};color:var(--gg-text-dim)}
.gg-settings-rows{display:flex;flex-direction:column;margin-top:${u(14)}}
.gg-settings-row{display:flex;justify-content:space-between;gap:${u(24)};padding:${u(16)} 0;border-top:1px solid rgba(255,255,255,.13);font-size:${u(24)}}
.gg-settings-row:first-child{border-top:none}
.gg-settings-row-value{color:var(--gg-text-dim);text-align:right}
.gg-settings-items{display:flex;flex-direction:column;gap:${u(14)};margin-top:${u(10)}}
.gg-settings-item{display:flex;flex-direction:column;gap:${u(4)};padding:${u(16)} ${u(24)};border-radius:${u(16)};border:${u(1.5)} solid ${IDLE_TILE.edge};background:rgba(255,255,255,.05)}
.gg-settings-item-name{font-size:${u(24)};font-weight:var(--gg-weight-heading)}
.gg-settings-item-state{font-size:${u(19)};color:var(--gg-text-dim)}
.gg-settings-item-state[data-ok="true"]{color:var(--gg-ok,#5fd1ae)}
.gg-settings-menu{display:flex;align-items:center;gap:${u(12)};margin-top:${u(10)};padding-top:${u(20)};border-top:1px solid rgba(255,255,255,.13);font-size:${u(20)};color:rgba(255,255,255,.55)}
.gg-settings-menu svg{flex:none;width:${u(26)};height:${u(26)}}
.gg-settings-foot{margin-top:auto}
${MORE}{width:${u(450)};min-width:0;display:flex;align-items:center;justify-content:space-between;padding:${u(16)} ${u(24)};${RESET};border-radius:${u(16)};border:${u(1.5)} solid ${IDLE_TILE.edge};background:var(--gg-glass);font-size:${u(22)};font-weight:var(--gg-weight-heading)}
${MORE} svg{width:${u(26)};height:${u(26)}}
${MORE}${FOCUS}{${focusRing('menu', u)};${LIGHT}}
`;
