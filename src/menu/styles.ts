import { radialStyles } from './radialStyles';
import { CONTROL_EDGE, IDLE_TILE, SURFACE_RIM, TOKENS, focusRing, ghost, selectedSlice } from '../styles/tokens';

// Active navigation tabs stay legible after focus moves into the panel; other option slices retain their quieter role.
const selectedTab = `${selectedSlice()};--gg-selected:rgba(255,255,255,.24);--gg-selected-edge:inset 0 -3px 0 color-mix(in srgb,var(--gg-accent-text,var(--gg-accent)) 65%,#fff)`;

const menuSurfaceRim = `border:${SURFACE_RIM.border};box-shadow:${SURFACE_RIM.shadow}`;
const idleTileTint = IDLE_TILE.tint;

// The approved outer 60vw × 84vh canvas, drawn smaller by Home's size factor (--gg-menu-size, menuScale.menuSize) around
// the same centre. One local design unit retains its tested scale in Steam's separate Home/game overlay viewports.
export const menuStyles = radialStyles + `
.gg-menu-native-host{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:var(--gg-text,#fff);overflow:hidden;transform:translateZ(0)}
.gg-menu{--gg-menu-detail-edge:${CONTROL_EDGE};--gg-d:1px;--gg-glass:var(--gg-glass-strong);--gg-text-dim:${TOKENS.label};position:absolute;left:50%;top:calc(7.6923vh + 84vh * (1 - var(--gg-menu-size,1)) / 2);transform:translateX(-50%) scale(var(--gg-menu-scale,.65));transform-origin:top center;width:calc(60vw * var(--gg-menu-size,1) / var(--gg-menu-scale,.65));height:calc(84vh * var(--gg-menu-size,1) / var(--gg-menu-scale,.65));margin:0;display:flex;flex-direction:column;font-family:"Motiva Sans",Arial,sans-serif;color:var(--gg-text);font-size:var(--gg-type-body);font-weight:var(--gg-weight-body);line-height:1.3;text-shadow:var(--gg-text-shadow);transition:--gg-accent var(--gg-accent-duration),opacity var(--gg-fast) linear}
.gg-menu *{box-sizing:border-box}
.gg-menu>header{flex:none;display:flex;align-items:center;padding:0 16px 12px;gap:8px}
.gg-menu-caption-actions{display:flex;align-items:center;gap:8px}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton{width:auto;min-width:0;min-height:44px;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--gg-menu-detail-edge);border-radius:var(--gg-r-card);background:var(--gg-glass);color:var(--gg-text);font:inherit;font-weight:var(--gg-weight-body);line-height:1.3;text-transform:none;text-shadow:var(--gg-text-shadow);box-shadow:none;white-space:normal;transition:background var(--gg-base),box-shadow var(--gg-base),transform var(--gg-base),border-color var(--gg-fast)}
.gg-menu button.gg-menu-action.DialogButton svg{width:20px;height:20px;flex:none}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){${focusRing('menu')}}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible):not([aria-pressed=true]){background:var(--gg-glass-strong)}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:is(:disabled,[aria-disabled=true]){${ghost()};transform:none}
html[data-gg-mouse] .gg-menu button.gg-menu-action.DialogButton:not(:disabled):hover{box-shadow:0 0 0 2px rgba(255,255,255,.45)}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:not(:disabled):active{transform:scale(.98);transition-duration:var(--gg-fast)}
.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel{background:${TOKENS.glass};backdrop-filter:none;${menuSurfaceRim};border-radius:var(--gg-r-panel)}
.gg-menu .gg-menu-bar{flex:none;display:flex;align-items:stretch;min-height:64px;overflow:hidden}
.gg-menu-tabs{display:flex;align-items:stretch;justify-content:stretch;gap:0;padding:0;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton{position:relative;flex:1 0 auto;min-height:0;padding:0 12px;gap:4px;border:0;border-radius:0;background:transparent;color:var(--gg-text-idle);white-space:nowrap;box-shadow:none}
.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton[aria-pressed=true]{${selectedTab}}
html[data-gg-mouse] .gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton[aria-pressed=true]:hover{box-shadow:var(--gg-selected-edge);color:var(--gg-text)}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton:is(.gpfocus,:focus-visible){${focusRing('slice')};color:var(--gg-text)}
html[data-gg-mouse] .gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton:hover{box-shadow:none;color:var(--gg-text)}
.gg-menu .gg-menu-shoulder{display:flex;align-items:center;justify-content:center;flex:none;min-width:40px;padding:8px;font-size:var(--gg-type-label);font-weight:var(--gg-weight-heading);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-shoulder:first-child{border-right:1px solid var(--gg-menu-detail-edge)}.gg-menu .gg-menu-shoulder:last-child{border-left:1px solid var(--gg-menu-detail-edge)}
.gg-menu .gg-menu-panel{margin-top:12px;padding:24px;flex:1;min-height:0;overflow-x:hidden;overflow-y:auto;scrollbar-width:none}
.gg-menu h2{font-size:var(--gg-type-heading);font-weight:var(--gg-weight-heading);letter-spacing:-.02em;margin:0 0 12px}
.gg-menu h3{font-size:var(--gg-type-label);font-weight:var(--gg-weight-heading);letter-spacing:.16em;text-transform:uppercase;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);margin:12px 0 4px}
.gg-menu p{color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font:inherit;font-size:var(--gg-type-body);line-height:1.4}
.gg-menu-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:0 0 12px}.gg-menu-heading h2{margin:0}.gg-menu-heading>span{color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label)}
.gg-menu-picker-anchor,.gg-menu-picker-host{position:relative;min-width:0}
.gg-menu-heading>.gg-menu-picker-anchor{margin-right:auto}
.gg-menu .gg-menu-picker{display:flex;align-items:center;gap:8px;min-width:0;box-sizing:border-box;padding:6px 12px;border:1px solid var(--gg-menu-detail-edge);border-radius:12px;background:var(--gg-glass);color:var(--gg-text);font-weight:600;cursor:pointer;transition:background var(--gg-fast),box-shadow var(--gg-fast)}
:where(html:not([data-gg-mouse])) .gg-menu .gg-menu-picker:is(.gpfocus,:focus-visible){${focusRing('menu')};background:var(--gg-glass-strong)}
.gg-menu-picker-label{color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-weight:500;margin-right:auto}
.gg-menu-picker-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-menu-picker-chevron{flex:none;width:.75em;height:.75em;opacity:.8}
.gg-menu-picker-dot{flex:none;width:.6em;height:.6em;border-radius:50%}
.gg-menu-picker-dot[data-dot=ring]{box-sizing:border-box;border:2px solid #9aa4b1;background:transparent}
.gg-menu .gg-menu-picker-list{position:absolute;left:0;top:calc(100% + 6px);z-index:2;min-width:100%;box-sizing:border-box;padding:6px;display:flex;flex-direction:column;gap:2px;border:1px solid var(--gg-menu-detail-edge);border-radius:var(--gg-r-card);background:rgb(24,28,36);box-shadow:0 10px 30px rgba(0,0,0,.55)}
.gg-menu-picker-option{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;color:var(--gg-text);font-weight:600;white-space:normal;cursor:pointer}
.gg-menu-picker-option[data-selected]{background:rgba(255,255,255,.14)}
.gg-menu-picker-option[data-selected]::after{content:'✓';margin-left:auto}
:where(html:not([data-gg-mouse])) .gg-menu .gg-menu-picker-option:is(.gpfocus,:focus-visible){${focusRing('menu')}}
.gg-menu-picker-option-text{display:flex;flex-direction:column;min-width:0}
.gg-menu-picker-sub{font-size:.8em;font-weight:500;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu-device{min-width:0}.gg-menu-device .gg-menu-picker{width:100%}.gg-menu-device .gg-menu-picker-text{margin-left:auto}
.gg-menu .gg-notifications>.gg-menu-heading,.gg-menu .gg-social>.gg-menu-heading{flex:none;margin:0}
.gg-menu-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.gg-menu .gg-menu-grid.gg-menu-grid-navigate{grid-template-columns:repeat(4,minmax(0,1fr))}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton{min-height:112px;height:112px;flex-direction:column;gap:8px;border-radius:var(--gg-r-card);border-color:var(--gg-menu-detail-edge);background:var(--gg-glass)}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton:not(:is(.gpfocus,:focus-visible,:hover,[aria-pressed=true])){
    border-color:${IDLE_TILE.edge};
    background-image:linear-gradient(${idleTileTint},${idleTileTint});
}
.gg-menu .gg-menu-grid button.gg-menu-action.DialogButton svg{width:24px;height:24px}
.gg-menu .gg-ingame{display:flex;flex-direction:column;gap:16px;min-height:100%}
.gg-menu .gg-ingame-hero{position:relative;flex:none;height:176px;margin:-24px -24px 0;border-radius:var(--gg-r-panel) var(--gg-r-panel) 0 0;overflow:hidden;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 24px}
.gg-menu .gg-ingame-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,var(--gg-glass-solid))}
.gg-menu .gg-ingame-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%}
.gg-menu .gg-ingame-logo{position:relative;z-index:1;max-width:45%;max-height:90px;object-fit:contain;object-position:left bottom;filter:drop-shadow(var(--gg-text-shadow))}
.gg-menu .gg-ingame-hero h2{position:relative;z-index:1;margin:0}
.gg-menu .gg-ingame-logo-slot{position:relative;display:block;height:90px}
.gg-menu .gg-ingame-session{position:relative;z-index:1;font-weight:var(--gg-weight-heading);white-space:nowrap}
.gg-menu .gg-ingame-grid{grid-auto-rows:112px}
.gg-menu .gg-ingame-label{display:grid;gap:4px;justify-items:center;width:100%}
.gg-menu .gg-ingame-label small{color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label)}
.gg-menu .gg-ingame-bar{display:block;width:70%;height:6px;border-radius:var(--gg-r-pill);background:var(--gg-edge-raised);overflow:hidden}
.gg-menu .gg-ingame-progress{display:block;height:100%;border-radius:inherit;background:var(--gg-accent)}
.gg-menu .gg-notifications{display:flex;flex-direction:column;gap:16px;min-height:100%}
.gg-menu .gg-notifications-list{display:flex;flex-direction:column;gap:12px}
.gg-menu-native-host .gg-menu .gg-notifications-list button.gg-menu-action.DialogButton{justify-content:flex-start;gap:16px;padding:10px 16px 10px 10px;border-radius:var(--gg-r-card);border-color:var(--gg-menu-detail-edge);text-align:left}
.gg-menu .gg-notification-art{flex:none;width:112px;height:52px;border-radius:var(--gg-r-small);object-fit:cover;display:grid;place-items:center;background:var(--gg-edge)}
.gg-menu .gg-notification-text{flex:1;min-width:0;display:grid;gap:2px}
.gg-menu .gg-notification-text small{color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label);text-transform:uppercase;letter-spacing:.08em}
.gg-menu .gg-notification-unread .gg-notification-text small::before{content:"";display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:50%;background:var(--gg-accent);vertical-align:1px}
.gg-menu .gg-notification-body{color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label);white-space:pre-wrap;overflow-wrap:anywhere}
.gg-menu .gg-notification-text strong{overflow-wrap:anywhere}
.gg-menu .gg-notification-action{flex:none;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label)}
.gg-menu .gg-notifications-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 16px;text-align:center;text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-notifications-empty p{margin:0 0 8px;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-notifications-mark-all-dim.DialogButton>*{opacity:.5}
.gg-menu-secondary{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}
.gg-menu-quick-sliders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gg-menu-quick-sliders>[data-gg-focus="quick:brightness"],.gg-menu-quick-sliders>:only-child{grid-column:1/-1}
.gg-menu .gg-menu-setting{padding:8px;min-height:48px;border-radius:var(--gg-r-card);font-size:var(--gg-type-body);background:transparent;transition:background var(--gg-base),box-shadow var(--gg-base),transform var(--gg-base)}
:where(html:not([data-gg-mouse])) .gg-menu .gg-menu-setting:not(.gg-menu-setting-segments):has(.gpfocus){${focusRing('menu')};background:var(--gg-glass-strong)}
.gg-menu .gg-menu-setting-disabled{${ghost()}}
.gg-menu .gg-menu-setting .Panel:not(.gg-menu-segmented),.gg-menu .gg-social-input .Panel{padding:0;margin:0;border:0;background:transparent;box-shadow:none;font:inherit;min-height:0;transform:none!important;transition:none!important;animation:none!important}
.gg-menu .gg-menu-setting [id$="_Label"]{font:inherit;color:var(--gg-text);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-setting [id$="_Description_Description"]{font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);line-height:1.4;margin-top:4px}
.gg-menu .gg-menu-setting-label{display:inline-flex;align-items:center;gap:8px;min-width:0}
.gg-menu .gg-menu-setting-label svg{width:20px;height:20px;flex:none;color:var(--gg-text)}
.gg-menu-slider-label{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%}
.gg-menu .gg-menu-slider-label output{font-size:var(--gg-type-value);font-weight:var(--gg-weight-body);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--gg-text)}
.gg-menu .gg-menu-setting .SliderTrack{width:calc(100% - 24px);height:4px;border-radius:var(--gg-r-pill);background:var(--gg-track);box-shadow:var(--gg-track-edge)}
.gg-menu .gg-menu-setting .SliderTrack::before{height:100%;background:var(--gg-accent);border-radius:var(--gg-r-pill)}
.gg-menu .gg-menu-setting .SliderHandle{width:18px;height:18px;top:3px;right:3px;left:auto;bottom:auto;margin:0;border:0;border-radius:var(--gg-r-pill);background:var(--gg-on-accent)}
.gg-menu .gg-menu-setting [role=checkbox]::after{content:none}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child{outline:1px solid var(--gg-menu-detail-edge);outline-offset:-1px;background:var(--gg-track);box-shadow:var(--gg-track-edge)}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child::before{background:inherit}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=true]>:first-child{background:var(--gg-accent)}
.gg-menu .gg-menu-setting [role=checkbox]>:last-child{box-sizing:border-box;position:absolute;top:0;left:0;right:auto;bottom:auto;margin:0;width:22px;height:22px;border:0;outline:0;border-radius:var(--gg-r-pill);background:var(--gg-on-accent);box-shadow:none}
.gg-menu-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;grid-auto-rows:minmax(56px,auto)}.gg-menu-quick-sliders+.gg-menu-switches{margin-top:12px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-setting-step.DialogButton{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:56px;padding:8px;border:0;border-radius:var(--gg-r-card);background:transparent;text-align:left}
.gg-menu .gg-menu-setting-step-text{display:flex;flex-direction:column;min-width:0;line-height:1.3}
.gg-menu .gg-menu-setting-step-state{font-size:var(--gg-type-label);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-menu .gg-menu-wifi{display:flex;flex-direction:column;gap:4px}
.gg-menu .gg-menu-wifi-heading{margin:12px 8px 4px;font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-wifi-note{margin:8px;font-size:var(--gg-type-label);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-wifi-network.DialogButton{width:100%;min-height:52px;justify-content:flex-start;gap:12px;padding:8px 12px;border:0;background:transparent;text-align:left}
.gg-menu .gg-menu-wifi-mark{width:20px;height:20px;flex:none;color:var(--gg-accent-text)}
.gg-menu .gg-menu-wifi-text{display:flex;flex-direction:column;flex:1;min-width:0;line-height:1.3}
.gg-menu .gg-menu-wifi-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-menu .gg-menu-wifi-status{font-size:var(--gg-type-label);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-wifi-lock{width:16px;height:16px;flex:none;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-wifi-bars{display:inline-flex;align-items:flex-end;gap:2px;height:14px;flex:none}
.gg-menu .gg-menu-wifi-bars>span{width:3px;border-radius:1px;background:var(--gg-track)}
.gg-menu .gg-menu-wifi-bars>span:nth-child(1){height:25%}.gg-menu .gg-menu-wifi-bars>span:nth-child(2){height:50%}.gg-menu .gg-menu-wifi-bars>span:nth-child(3){height:75%}.gg-menu .gg-menu-wifi-bars>span:nth-child(4){height:100%}
.gg-menu .gg-menu-wifi-bars>span[data-lit]{background:var(--gg-text)}
.gg-menu .gg-menu-row-dim{opacity:.55}
.gg-menu .gg-menu-wifi-chevron{width:20px;height:20px;flex:none;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-wifi-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 8px}
.gg-menu .gg-menu-wifi-facts>div{display:flex;flex-direction:column;gap:2px;min-width:0;padding:10px 12px;border-radius:var(--gg-r-card);background:var(--gg-glass)}
.gg-menu .gg-menu-wifi-facts small{font-size:var(--gg-type-label);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-wifi-facts span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-wifi-step.DialogButton{width:100%;min-height:44px;justify-content:flex-start;gap:12px;padding:8px 12px;border:0;background:transparent;text-align:left}
.gg-menu .gg-menu-wifi-password{display:flex;flex-direction:column;gap:12px}
.gg-menu .gg-menu-wifi-password-title{margin:0 8px;color:var(--gg-text);text-shadow:var(--gg-text-shadow)}
.gg-menu .gg-menu-wifi-password-row{display:flex;gap:8px;align-items:stretch}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-wifi-password-field.DialogButton{flex:1;min-width:0;justify-content:flex-start;text-align:left;letter-spacing:.08em;white-space:nowrap;overflow:hidden}
.gg-menu .gg-menu-wifi-password-placeholder{letter-spacing:0;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
.gg-menu-switches>div{min-width:0}.gg-menu-setting-toggle{display:flex;align-items:center}.gg-menu-setting-toggle>.Panel{width:100%;flex:1;min-width:0}
.gg-menu-setting-header{margin:0 0 8px;font-size:var(--gg-type-body);font-weight:var(--gg-weight-body);letter-spacing:0;text-transform:none;color:var(--gg-text);text-shadow:var(--gg-text-shadow)}
.gg-menu-segmented{display:flex;gap:0;padding:0;overflow:hidden;border-radius:var(--gg-r-card);background:var(--gg-glass);border:1px solid var(--gg-menu-detail-edge)}
.gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton{flex:1;min-width:0;min-height:44px;padding:8px;border:0;border-radius:0;background:transparent}
.gg-menu-native-host .gg-menu :is(.gg-menu-segmented,.gg-menu-perf-tabs) button.gg-menu-action.DialogButton+button{border-inline-start:1px solid var(--gg-menu-detail-edge)}
:where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu :is(.gg-menu-segmented,.gg-menu-perf-tabs) button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){${focusRing('slice')}}
.gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton[aria-pressed=true]{${selectedSlice()}}
.gg-menu .gg-menu-performance-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
.gg-menu .gg-menu-performance-heading{flex:1;min-width:0}.gg-menu .gg-menu-performance-heading h2{margin:0 0 4px}
.gg-menu .gg-menu-performance-power{margin:0;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label)}
.gg-menu .gg-menu-profile-context{flex:0 1 44%;min-width:0}.gg-menu .gg-menu-profile-context .gg-menu-setting{padding-right:0}
.gg-menu-perf-tabs{display:flex;gap:0;padding:0;margin-bottom:16px;overflow:hidden;border-radius:var(--gg-r-card);background:var(--gg-glass);border:1px solid var(--gg-menu-detail-edge)}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton{position:relative;flex:1;min-height:44px;border:0;border-radius:0;background:transparent;color:var(--gg-text-idle);padding:8px 4px}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton[aria-pressed=true]{${selectedTab}}
html[data-gg-mouse] .gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton[aria-pressed=true]:hover{box-shadow:var(--gg-selected-edge);color:var(--gg-text)}
.gg-menu-native-host .gg-menu :is(.gg-menu-segmented,.gg-menu-perf-tabs) button.gg-menu-action.DialogButton:first-child{border-radius:calc(var(--gg-r-card) - 1px) 0 0 calc(var(--gg-r-card) - 1px)}
.gg-menu-native-host .gg-menu :is(.gg-menu-segmented,.gg-menu-perf-tabs) button.gg-menu-action.DialogButton:last-child{border-radius:0 calc(var(--gg-r-card) - 1px) calc(var(--gg-r-card) - 1px) 0}
.gg-menu .gg-menu-perf-content{padding-top:8px}.gg-menu .gg-menu-performance-profile{padding:0}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton{width:80px;min-width:80px;height:40px;min-height:40px;flex:none;padding:8px;border-radius:var(--gg-r-card);${menuSurfaceRim};background:${TOKENS.glass}}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton svg{transition:transform var(--gg-fast) ease}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton .gg-menu-notification-count:empty+svg{transform:translateX(-20px)}
.gg-menu-notification-count{display:block;width:32px;min-width:32px;height:20px;line-height:20px;flex:none;text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton[aria-pressed=true]{${selectedSlice()}}
.gg-menu .gg-menu-native-icon{display:inline-flex;align-items:center;flex:none}.gg-menu svg[stroke="currentColor"]{stroke-width:2.4}
.gg-menu .gg-menu-pending::after{content:"";display:inline-block;width:.8em;height:.8em;margin-left:.5em;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;vertical-align:-.1em;animation:gg-menu-spin .8s linear infinite}
@keyframes gg-menu-spin{to{transform:rotate(360deg)}}
.gg-menu .gg-menu-error{color:#f6b5b5}
.gg-menu footer{display:flex;justify-content:center;gap:24px;padding:16px;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body)}
.gg-menu-status-host{transition:opacity var(--gg-fast) linear}
.gg-menu-status-host.gg-menu-status-home{visibility:hidden!important}
.gg-menu-status-host .gh-status-pill{backdrop-filter:none!important}
.gg-menu .gg-menu-panel::-webkit-scrollbar,.gg-menu-tabs::-webkit-scrollbar{display:none}
@media(prefers-reduced-motion:reduce){.gg-menu,.gg-menu *,.gg-menu *::after{transition:none!important;animation:none!important}}
`;
