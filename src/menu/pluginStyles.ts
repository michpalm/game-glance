// The Plugins section: plugin rows, Game Glance's cards, crumbs, pickers and the match card, on the menu's tokens.
export const pluginStyles = `
.gg-menu .gg-plugin-crumb-path{display:flex;align-items:center;gap:8px;min-width:0}
.gg-menu .gg-plugin-crumb-path>span{color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body)}
.gg-menu .gg-plugin-crumb-path svg{width:18px;height:18px;flex:none;color:var(--gg-text-dim)}
.gg-menu .gg-plugin-crumb-path h2{margin:0}
.gg-menu .gg-plugin-list,.gg-menu .gg-plugin-rows{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-plugin-row.DialogButton{display:flex;align-items:center;justify-content:flex-start;gap:16px;width:100%;min-height:72px;padding:12px 20px;text-align:left;border-radius:var(--gg-r-card);border:1px solid var(--gg-edge);background:var(--gg-glass)}
.gg-menu .gg-plugin-icon{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,.1)}
.gg-menu .gg-plugin-icon svg{width:24px;height:24px}
.gg-menu .gg-plugin-name{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.gg-menu .gg-plugin-dim{color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);line-height:1.4}
.gg-menu .gg-plugin-end{display:flex;align-items:center;gap:8px;flex:none;color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body)}
.gg-menu .gg-plugin-end svg{width:20px;height:20px}
.gg-menu .gg-menu-grid.gg-plugin-cards{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:12px}
.gg-menu-native-host .gg-menu .gg-menu-grid.gg-plugin-cards button.gg-menu-action.DialogButton{min-height:128px;height:auto;align-items:flex-start;justify-content:flex-start;text-align:left;padding:20px}
.gg-menu .gg-plugin-card-name{display:flex;align-items:center;gap:12px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-plugin-picker.DialogButton{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:56px;padding:8px 12px;text-align:left}
.gg-menu .gg-plugin-value{display:flex;align-items:center;gap:6px;color:var(--gg-text-dim)}
.gg-menu .gg-plugin-note{margin:4px 8px 0;color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);line-height:1.4}
.gg-menu .gg-plugin-card{display:flex;flex-direction:column;gap:12px;padding:16px 20px;border-radius:var(--gg-r-card);border:1px solid var(--gg-edge);background:var(--gg-glass)}
.gg-menu .gg-plugin-card-title{display:flex;flex-direction:column;gap:4px}
.gg-menu .gg-plugin-buttons{display:flex;flex-wrap:wrap;gap:12px}
.gg-menu .gg-plugin-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
`;
