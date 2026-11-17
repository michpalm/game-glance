import { selectedSlice } from '../styles/tokens';

const H = '.gg-menu-native-host .gg-menu';
/** Mock-up "Achievement Sets": base game blue, other sets gold; rare (<10% of players) glows gold, as Steam's library does. */
const BASE = '#5aa9f0', GOLD = '#e8c26a';
const dim = 'font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)';

/** In game › Achievements (components/AchievementsPage). */
export const achievementsStyles = `
.gg-menu .gg-ach-header{${dim}}
.gg-menu .gg-ach-host,.gg-menu .gg-ach-page{height:100%;min-height:0}
.gg-menu .gg-ach-page{display:flex;flex-direction:column}
.gg-menu .gg-ach{flex:1;min-height:0;display:flex;gap:12px;align-items:stretch;min-width:0}
.gg-menu :is(.gg-ach-sets,.gg-ach-list){overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding:6px;margin:-6px}
.gg-menu :is(.gg-ach-sets,.gg-ach-list)::-webkit-scrollbar{display:none}
.gg-menu :is(.gg-ach-sets,.gg-ach-list)>*{flex:none}
.gg-menu .gg-ach h3{margin:4px 6px 4px;font-size:var(--gg-type-label);font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-ach-sets{flex:0 0 38%;min-width:0;display:flex;flex-direction:column;gap:6px;box-sizing:border-box}
.gg-menu .gg-ach-right{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:6px}
.gg-menu .gg-ach-list-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.gg-menu .gg-ach-list-head .gg-menu-picker-list{left:auto;right:0;min-width:200px}
.gg-menu .gg-ach-list{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;gap:6px}
.gg-menu .gg-ach-note{margin:8px 6px;${dim}}
${H} button.gg-menu-action.gg-ach-set.DialogButton{width:100%;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;padding:10px 12px;text-align:left}
${H} button.gg-menu-action.gg-ach-set.DialogButton[aria-pressed=true]{${selectedSlice()}}
.gg-menu .gg-ach-set-head{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
.gg-menu .gg-ach-set-text{display:flex;flex-direction:column;min-width:0;line-height:1.25}
.gg-menu .gg-ach-set-text strong,.gg-menu .gg-ach-text strong{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-menu .gg-ach-set-text small,.gg-menu .gg-ach-text small,.gg-menu .gg-ach-side small{${dim}}
.gg-menu .gg-ach-count{flex:none;display:inline-flex;align-items:center;gap:6px;font-weight:600;font-variant-numeric:tabular-nums}
.gg-menu .gg-ach-trophy{width:16px;height:16px;color:${GOLD}}
.gg-menu .gg-ach-bar,.gg-menu .gg-ach-progress{display:block;height:6px;border-radius:var(--gg-r-pill);background:var(--gg-edge-raised);overflow:hidden}
.gg-menu .gg-ach-bar>i,.gg-menu .gg-ach-progress>i{display:block;height:100%;border-radius:inherit;background:${GOLD}}
.gg-menu .gg-ach-bar[data-base]>i{background:${BASE}}
.gg-menu .gg-ach-progress{width:70%;height:4px;margin-top:4px}
${H} button.gg-menu-action.gg-ach-item.DialogButton{width:100%;justify-content:flex-start;gap:12px;padding:8px 12px 8px 8px;text-align:left}
${H} button.gg-menu-action.gg-ach-item.gg-ach-rare.DialogButton{border-color:rgba(232,194,106,.7);box-shadow:0 0 16px rgba(232,194,106,.28)}
.gg-menu .gg-ach-icon{flex:none;width:44px;height:44px;border-radius:8px;overflow:hidden;display:grid;place-items:center;background:var(--gg-edge-raised)}
.gg-menu .gg-ach-icon img{width:100%;height:100%;object-fit:cover}
.gg-menu .gg-ach-icon svg{width:22px;height:22px}
.gg-menu .gg-ach-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;line-height:1.25}
.gg-menu .gg-ach-side{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-weight:600;font-variant-numeric:tabular-nums}
.gg-menu .gg-ach-rare .gg-ach-side small{color:${GOLD};font-weight:600}
.gg-menu .gg-ach-actions{flex:none;display:flex;justify-content:flex-end;margin-top:12px}
`;
