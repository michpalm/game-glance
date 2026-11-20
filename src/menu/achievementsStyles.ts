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
/* The 6px padding keeps focus rings in view; no top margin, so both columns' first cards start 6px under their header. */
.gg-menu :is(.gg-ach-sets,.gg-ach-list){overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding:6px;margin:0 -6px -6px}
.gg-menu :is(.gg-ach-sets,.gg-ach-list)::-webkit-scrollbar{display:none}
.gg-menu :is(.gg-ach-sets,.gg-ach-list)>*{flex:none}
.gg-menu .gg-ach h3{margin:0;font-size:var(--gg-type-label);font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-ach-left{flex:0 0 38%;min-width:0;min-height:0;display:flex;flex-direction:column;gap:6px}
/* Both columns' header rows are the sort pill's height; the titles sit on its centre line and on the cards' left edge, as the crumb does. */
.gg-menu .gg-ach-head{flex:none;display:flex;align-items:center;min-height:36px;min-width:0}
.gg-menu .gg-ach-head h3{margin:0;line-height:36px}
.gg-menu .gg-ach-sets{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;gap:6px;box-sizing:border-box}
.gg-menu .gg-ach-right{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:6px}
.gg-menu .gg-ach-list-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.gg-menu .gg-ach-list-head{flex-wrap:wrap;align-items:flex-start}
.gg-menu .gg-ach-list-head h3{flex:1;align-self:flex-start}
/* The sort list floats under its pill, right-aligned with it, over the list: nothing on the page moves. The list behind
   it dims, so the open list never reads as mixed in with the achievements. */
.gg-menu .gg-ach-list-head .gg-menu-picker-list{left:auto;right:0;min-width:200px;z-index:5}
.gg-menu .gg-ach-list{transition:opacity var(--gg-fast)}
.gg-menu .gg-ach-right:has(.gg-menu-picker-list) .gg-ach-list{opacity:.35}
.gg-menu .gg-ach-list{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;gap:6px;margin-top:0}
/* Rows scrolling away fade out at the edge that has more (AchievementsPage markEdges), instead of a hard cut. */
.gg-menu :is(.gg-ach-sets,.gg-ach-list)[data-more-above]{-webkit-mask-image:linear-gradient(to bottom,transparent,#000 22px);mask-image:linear-gradient(to bottom,transparent,#000 22px)}
.gg-menu :is(.gg-ach-sets,.gg-ach-list)[data-more-below]{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 22px),transparent)}
.gg-menu :is(.gg-ach-sets,.gg-ach-list)[data-more-above][data-more-below]{-webkit-mask-image:linear-gradient(to bottom,transparent,#000 22px,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(to bottom,transparent,#000 22px,#000 calc(100% - 22px),transparent)}
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
/* A pinned achievement (Y): a small pin before its name. */
.gg-menu .gg-ach-pin{width:14px;height:14px;margin-right:6px;vertical-align:-1px;color:var(--gg-text-dim)}
.gg-menu .gg-ach-actions{flex:none;display:flex}
.gg-menu .gg-ach-left-actions{margin-top:4px}
${H} .gg-ach-left-actions button.gg-menu-action.gg-ach-steam.DialogButton{width:100%}
`;
