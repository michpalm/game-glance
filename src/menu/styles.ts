import { TOKENS, currentUnderline, focusRing, ghost } from '../styles/tokens';

// The approved outer 60vw × 84vh canvas stays unchanged. One local design unit
// retains its tested scale in Steam's separate Home/game overlay viewports.
export const menuStyles = `
.gg-menu-native-host{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:var(--gg-text,#fff);overflow:hidden;transform:translateZ(0)}
.gg-menu{--gg-d:1px;--gg-glass:var(--gg-glass-strong);position:absolute;left:50%;top:7.6923vh;transform:translateX(-50%) scale(var(--gg-menu-scale,.65));transform-origin:top center;width:calc(60vw / var(--gg-menu-scale,.65));height:calc(84vh / var(--gg-menu-scale,.65));margin:0;display:flex;flex-direction:column;font-family:"Motiva Sans",Arial,sans-serif;color:var(--gg-text);font-size:var(--gg-type-body);font-weight:var(--gg-weight-body);line-height:1.3;text-shadow:var(--gg-text-shadow);transition:--gg-accent var(--gg-accent-duration),opacity var(--gg-fast) linear}
.gg-menu *{box-sizing:border-box}
.gg-menu>header{flex:none;display:flex;align-items:center;padding:0 16px 12px;gap:8px}
.gg-menu-caption-actions{display:flex;align-items:center;gap:8px}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton{width:auto;min-width:0;min-height:44px;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--gg-edge-raised);border-radius:var(--gg-r-pill);background:var(--gg-glass);color:var(--gg-text);font:inherit;font-weight:var(--gg-weight-body);line-height:1.3;text-transform:none;text-shadow:var(--gg-text-shadow);box-shadow:none;white-space:normal;transition:background var(--gg-base),box-shadow var(--gg-base),transform var(--gg-base),border-color var(--gg-fast)}
.gg-menu button.gg-menu-action.DialogButton svg{width:20px;height:20px;flex:none}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){${focusRing()}}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:is(:disabled,[aria-disabled=true]){${ghost()};transform:none}
html[data-gg-mouse] .gg-menu button.gg-menu-action.DialogButton:not(:disabled):hover{box-shadow:0 0 0 2px rgba(255,255,255,.45)}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:not(:disabled):active{transform:scale(.98);transition-duration:var(--gg-fast)}
.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel{background:${TOKENS.glass};backdrop-filter:none;border:1px solid var(--gg-edge);border-radius:var(--gg-r-panel)}
.gg-menu .gg-menu-bar{flex:none;display:flex;align-items:stretch;min-height:64px;overflow:hidden}
.gg-menu-tabs{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton{position:relative;flex-shrink:0;min-height:44px;padding:8px;gap:4px;border:0;border-radius:0;background:transparent;color:var(--gg-text-dim);white-space:nowrap;box-shadow:none}
.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton::after{${currentUnderline()};opacity:0;transition:opacity var(--gg-fast),box-shadow var(--gg-base)}
.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton[aria-pressed=true]{color:var(--gg-text)}
.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton[aria-pressed=true]::after{opacity:.55}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton:is(.gpfocus,:focus-visible){outline:none;box-shadow:none;transform:none;background:transparent;color:var(--gg-text)}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton:is(.gpfocus,:focus-visible)::after{opacity:1;box-shadow:0 0 14px 2px var(--gg-accent)}
html[data-gg-mouse] .gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton:hover{box-shadow:none;color:var(--gg-text)}
.gg-menu .gg-menu-shoulder{display:flex;align-items:center;justify-content:center;flex:none;min-width:40px;padding:8px;font-size:var(--gg-type-label);font-weight:var(--gg-weight-heading);color:var(--gg-text-dim)}
.gg-menu .gg-menu-shoulder:first-child{border-right:1px solid var(--gg-edge)}.gg-menu .gg-menu-shoulder:last-child{border-left:1px solid var(--gg-edge)}
.gg-menu .gg-menu-panel{margin-top:12px;padding:24px;flex:1;min-height:0;overflow-x:hidden;overflow-y:auto;scrollbar-width:none}
.gg-menu h2{font-size:var(--gg-type-heading);font-weight:var(--gg-weight-heading);letter-spacing:-.02em;margin:0 0 12px}
.gg-menu h3{font-size:var(--gg-type-label);font-weight:var(--gg-weight-heading);letter-spacing:.16em;text-transform:uppercase;color:var(--gg-text-dim);margin:12px 0 4px}
.gg-menu p{color:var(--gg-text-dim);font:inherit;font-size:var(--gg-type-body);line-height:1.4}
.gg-menu-heading{display:flex;justify-content:space-between;align-items:baseline;gap:16px}.gg-menu-heading>span{color:var(--gg-text-dim);font-size:var(--gg-type-label)}
.gg-menu-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton{min-height:112px;flex-direction:column;gap:12px;border-radius:var(--gg-r-card);border-color:var(--gg-edge);background:var(--gg-glass)}
.gg-menu .gg-menu-grid button.gg-menu-action.DialogButton svg{width:24px;height:24px}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){${focusRing()}}
.gg-menu-secondary{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}
.gg-menu-quick-sliders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gg-menu-quick-sliders>[data-gg-focus="quick:brightness"]{grid-column:1/-1}
.gg-menu .gg-menu-setting{padding:8px;min-height:48px;border-radius:var(--gg-r-card);font-size:var(--gg-type-body);background:transparent;transition:background var(--gg-base),box-shadow var(--gg-base),transform var(--gg-base)}
:where(html:not([data-gg-mouse])) .gg-menu .gg-menu-setting:not(.gg-menu-setting-segments):has(.gpfocus){${focusRing()}}
.gg-menu .gg-menu-setting-disabled{${ghost()}}
.gg-menu .gg-menu-setting .Panel,.gg-menu .gg-social-input .Panel{padding:0;margin:0;border:0;background:transparent;box-shadow:none;font:inherit;min-height:0;transform:none!important;transition:none!important;animation:none!important}
.gg-menu .gg-menu-setting [id$="_Label"]{font:inherit;color:var(--gg-text);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-setting [id$="_Description_Description"]{font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);color:var(--gg-text-dim);line-height:1.4;margin-top:4px}
.gg-menu .gg-menu-setting-label{display:inline-flex;align-items:center;gap:8px;min-width:0}
.gg-menu .gg-menu-setting-label svg{width:20px;height:20px;flex:none;color:var(--gg-text)}
.gg-menu-slider-label{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%}
.gg-menu .gg-menu-slider-label output{font-size:var(--gg-type-value);font-weight:var(--gg-weight-body);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--gg-text)}
.gg-menu .gg-menu-setting .SliderTrack{width:calc(100% - 24px);height:4px;border-radius:var(--gg-r-pill);background:var(--gg-track);box-shadow:var(--gg-track-edge)}
.gg-menu .gg-menu-setting .SliderTrack::before{height:100%;background:var(--gg-accent);border-radius:var(--gg-r-pill)}
.gg-menu .gg-menu-setting .SliderHandle{width:18px;height:18px;top:3px;right:3px;left:auto;bottom:auto;margin:0;border:0;border-radius:var(--gg-r-pill);background:var(--gg-on-accent)}
.gg-menu .gg-menu-setting [role=checkbox]::after{content:none}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child{outline:1px solid var(--gg-edge-active);outline-offset:-1px;background:var(--gg-track);box-shadow:var(--gg-track-edge)}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child::before{background:inherit}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=true]>:first-child{background:var(--gg-accent)}
.gg-menu .gg-menu-setting [role=checkbox]>:last-child{box-sizing:border-box;position:absolute;top:0;left:0;right:auto;bottom:auto;margin:0;width:22px;height:22px;border:0;outline:0;border-radius:var(--gg-r-pill);background:var(--gg-on-accent);box-shadow:none}
.gg-menu-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;grid-auto-rows:minmax(56px,auto)}
.gg-menu-switches>div{min-width:0}.gg-menu-setting-toggle{display:flex;align-items:center}.gg-menu-setting-toggle>.Panel{width:100%;flex:1;min-width:0}
.gg-menu-setting-header{margin-bottom:8px}
.gg-menu-segmented{display:flex;gap:4px;padding:4px;border-radius:var(--gg-r-pill);background:var(--gg-glass);border:1px solid var(--gg-edge)}
.gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton{flex:1;min-width:0;min-height:40px;padding:8px;border-color:transparent;background:transparent}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){background:var(--gg-glass-strong)}
.gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton[aria-pressed=true]{background:var(--gg-accent);color:var(--gg-on-accent)}
.gg-menu .gg-menu-performance-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
.gg-menu .gg-menu-performance-heading{flex:1;min-width:0}.gg-menu .gg-menu-performance-heading h2{margin:0 0 4px}
.gg-menu .gg-menu-performance-power{margin:0;color:var(--gg-text-dim);font-size:var(--gg-type-label)}
.gg-menu .gg-menu-profile-context{flex:0 1 44%;min-width:0}.gg-menu .gg-menu-profile-context .gg-menu-setting{padding-right:0}
.gg-menu-perf-tabs{display:flex;gap:8px;margin-bottom:12px}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton{position:relative;flex:1;min-height:44px;border:0;border-radius:0;background:transparent;color:var(--gg-text-dim);padding:8px 4px}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton::after{${currentUnderline()};opacity:0;transition:opacity var(--gg-fast),box-shadow var(--gg-base)}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton[aria-pressed=true]{color:var(--gg-text)}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton[aria-pressed=true]::after{opacity:.55}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){outline:none;box-shadow:none;background:transparent;transform:none;color:var(--gg-text)}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible)::after{opacity:1;box-shadow:0 0 14px 2px var(--gg-accent)}
.gg-menu .gg-menu-perf-content{padding-top:8px}.gg-menu .gg-menu-performance-profile{padding:12px}.gg-menu .gg-menu-performance-profile h3{margin:0 0 8px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton{min-width:40px;min-height:40px;padding:8px;border-radius:var(--gg-r-pill);border-color:var(--gg-edge)}
.gg-menu .gg-menu-native-icon{display:inline-flex;align-items:center;flex:none}.gg-menu svg[stroke="currentColor"]{stroke-width:2.4}
.gg-menu .gg-menu-error{color:#f6b5b5}
.gg-menu footer{display:flex;justify-content:center;gap:24px;padding:16px;color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body)}
.gg-menu-status-host{transition:opacity var(--gg-fast) linear}
.gg-menu-status-host .gh-status-pill{background:var(--gg-glass-solid)!important;border-color:var(--gg-edge);border-radius:var(--gg-r-pill);backdrop-filter:none!important;font-weight:var(--gg-weight-body)}
.gg-menu-status-host .gh-status-pill *{font-weight:var(--gg-weight-body)}
.gg-menu .gg-menu-panel::-webkit-scrollbar,.gg-menu-tabs::-webkit-scrollbar{display:none}
@media(prefers-reduced-motion:reduce){.gg-menu,.gg-menu *{transition:none!important;animation:none!important}}
`;
