import { HOME_BUTTON_GLASS } from '../styles/homeGlass';

/** Approved visual tokens, with one normalized canvas for Home and in-game.
 * MenuShell derives scale from the native viewport (829 CSS pixels -> .65).
 * Width stays 60vw and height 84vh after transform scaling; no context-dependent breakpoints.
 */
export const menuStyles = `
.gg-menu-native-host{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:#edf0f2;overflow:hidden;transform:translateZ(0)}
.gg-menu{--gg-menu-accent:#1a9fff;--gg-menu-focus-fill:14%;--gg-menu-focus-outline:55%;--gg-menu-focus-surface:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04)),color-mix(in srgb,var(--gg-menu-accent) 8%,rgba(14,19,27,.62));--gg-menu-selected-surface:linear-gradient(180deg,rgba(255,255,255,.07),transparent),rgba(10,14,20,.4);--gg-menu-focus-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 4px 18px -6px color-mix(in srgb,var(--gg-menu-accent) 28%,transparent),0 3px 10px #0002;--gg-menu-control-radius:12px;--gg-menu-button-border:rgba(255,255,255,.3);--gg-menu-selected-edge:rgba(255,255,255,.24);position:absolute;left:50%;top:7.6923vh;transform:translateX(-50%) scale(var(--gg-menu-scale,.65));transform-origin:top center;width:calc(60vw / var(--gg-menu-scale,.65));height:calc(84vh / var(--gg-menu-scale,.65));margin:0;display:flex;flex-direction:column;font-family:"Motiva Sans",Arial,sans-serif;color:#edf0f2;font-size:14px}
.gg-menu *{box-sizing:border-box}
.gg-menu header{flex:none;display:flex;justify-content:flex-end;align-items:center;padding:0 18px 12px;gap:10px;font-size:.8em;letter-spacing:.12em}
.gg-menu-caption-actions{display:flex;align-items:center;gap:8px}
.gg-menu button.gg-menu-action.DialogButton{width:auto;min-width:0;min-height:44px;border:1px solid #ffffff18;border-radius:12px;background:#ffffff05;color:inherit;box-shadow:none;text-transform:none;font:inherit;font-weight:400;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:9px;white-space:normal;line-height:1.3}
.gg-menu button.gg-menu-action.DialogButton svg{width:1.2em;height:1.2em;flex-shrink:0}
.gg-menu button.gg-menu-action.DialogButton.gpfocus,.gg-menu button.gg-menu-action.DialogButton:focus-visible{outline:none;box-shadow:var(--gg-menu-focus-shadow);background:var(--gg-menu-focus-surface)}
.gg-menu button.gg-menu-action.DialogButton[aria-pressed=true]{background:color-mix(in srgb,var(--gg-menu-accent) 12%,transparent);color:var(--gg-menu-accent)}
.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel{background:${HOME_BUTTON_GLASS.background};backdrop-filter:none;border:1px solid ${HOME_BUTTON_GLASS.borderColor};border-radius:26px;box-shadow:inset 0 1px #ffffff09}
.gg-menu .gg-menu-bar{flex:none;display:flex;gap:10px;align-items:center;padding:10px 12px}
.gg-menu-tabs{scrollbar-width:none;display:flex;justify-content:center;gap:4px;flex:1;min-width:0}
.gg-menu button.gg-menu-action.gg-menu-tab.DialogButton{font-size:.86em;padding:12px 10px;border-color:transparent;min-height:48px}
.gg-menu-shoulder{flex:none;white-space:nowrap;border:1px solid #ffffff25;border-radius:8px;background:#ffffff06;padding:6px 7px;font-size:11px;line-height:1.3;color:#d5dce3}
.gg-menu .gg-menu-panel{margin-top:12px;padding:22px;flex:1;min-height:0;max-height:none;overflow-x:hidden;overflow-y:auto;scrollbar-width:none}
.gg-menu h2{font-size:1.2em;font-weight:500;margin:0 0 18px}
.gg-menu p{color:#d5dce3;font-size:.88em;line-height:1.6}
.gg-menu-heading{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.gg-menu-heading span{font-size:.8em;color:#d5dce3}
.gg-menu-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.gg-menu .gg-menu-grid button.gg-menu-action.DialogButton{min-height:90px}
.gg-menu-secondary{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.gg-menu button.gg-menu-action.gg-menu-back.DialogButton{border:0;background:transparent;color:#d5dce3;justify-content:flex-start;padding-left:0}
.gg-menu-quick-sliders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gg-menu-quick-sliders>[data-gg-focus="quick:brightness"]{grid-column:1/-1}
.gg-menu h3{font-size:.85em;font-weight:500;color:#b8c5cf;margin:18px 0 8px}
.gg-menu-setting .Panel{background:transparent;border-radius:12px}
.gg-menu-setting:has(.gpfocus){border-radius:var(--gg-menu-control-radius);outline:none;box-shadow:var(--gg-menu-focus-shadow);background:var(--gg-menu-focus-surface)}
.gg-menu .gg-menu-setting [role=checkbox]::after{content:none}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child::before{background:inherit}
.gg-menu .gg-menu-setting [role=checkbox]>:last-child{box-sizing:border-box;position:absolute;top:0;left:0;right:auto;bottom:auto;margin:0;width:22px;height:22px;border:0;outline:0;box-shadow:0 0 5px #0005}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child{outline:1px solid rgba(255,255,255,.42);outline-offset:-1px;box-shadow:0 1px 3px #0004}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=true]>:first-child{background:color-mix(in srgb,var(--gg-menu-accent) 82%,#fff)}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=false]>:first-child{background:rgba(9,13,19,.62)}
.gg-menu-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gg-menu-switches>div{min-width:0}
.gg-menu footer{flex:none;display:flex;justify-content:center;gap:22px;flex-wrap:wrap;padding:14px;color:#a9b9c5;font-size:.85em}
.gg-menu .gg-menu-error{color:#f6b5b5}
.gg-menu .gg-menu-panel::-webkit-scrollbar,.gg-menu .gg-menu-tabs::-webkit-scrollbar,.gg-menu .gg-menu-bar::-webkit-scrollbar{display:none}
.gg-menu .gg-menu-bar{overflow-x:hidden;scrollbar-width:none}
/* Mockup skin. Native controls retain input/readback ownership; Steam field chrome is scoped out.
 * Home's shared glass material uses scoped owner-document frosting over Steam pages,
 * and native compositor blur in-game. The area outside the menu stays clear. */
.gg-menu-native-host .gg-menu{font-family:"Motiva Sans",Arial,sans-serif;font-size:13px;line-height:1.3;font-weight:700;color:#fff;text-shadow:0 1px 2px #0009}
.gg-menu-native-host .gg-menu>header{justify-content:flex-start;padding:0 16px 12px;font-size:11px;letter-spacing:2px;font-weight:500;color:#edf0f2}
.gg-menu-native-host .gg-menu .gg-menu-caption-actions button.gg-menu-action.DialogButton{min-width:32px;min-height:32px;padding:8px;border:0;background:transparent;color:#edf0f2;box-shadow:none}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton{font-family:inherit;font-size:13px;font-weight:${HOME_BUTTON_GLASS.fontWeight};line-height:1.3;background:${HOME_BUTTON_GLASS.background};border:1px solid var(--gg-menu-button-border);border-radius:12px;color:${HOME_BUTTON_GLASS.color}}
.gg-menu-native-host .gg-menu .gg-menu-bar{padding:10px;gap:8px}
.gg-menu-native-host .gg-menu .gg-menu-tabs{gap:3px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton{min-height:0;padding:12px 7px;gap:5px;border:0;border-radius:13px;background:transparent;color:#fff;font-size:13px;text-shadow:0 1px 2px #0009;box-shadow:none}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton svg{width:18px;height:18px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton[aria-pressed=true]{background:var(--gg-menu-selected-surface);color:#faf9f7;box-shadow:inset 0 1px 0 #ffffff14}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton.gpfocus,.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:focus-visible{outline:none;background:var(--gg-menu-focus-surface);box-shadow:var(--gg-menu-focus-shadow)}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton{flex-direction:column;justify-content:center;min-height:112px;padding:13px 14px;gap:14px;border:1px solid var(--gg-menu-button-border);border-radius:16px;background:${HOME_BUTTON_GLASS.background}}
/* Use Home information-card focus, including when the resting grid glass is more specific. */
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton.gpfocus,.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton:focus-visible{background:var(--gg-menu-focus-surface);border-color:rgba(255,255,255,.36);outline:none;box-shadow:var(--gg-menu-focus-shadow)}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton svg{width:23px;height:23px;color:#fff}
.gg-menu-native-host .gg-menu h2{font-size:16px;font-weight:700;letter-spacing:-.2px;margin:0 0 18px}
.gg-menu-native-host .gg-menu h3{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#fff;margin:14px 0 4px}
.gg-menu-native-host .gg-menu .gg-menu-setting{padding:10px;min-height:48px;border-radius:12px;font-size:13px}
/* Steam fields carry identity3D transforms and focus animations. Under this scaled
 * menu, toggle repaints temporarily change every field's text raster scale. Keep
 * field text in the stable parent plane; native thumb movement remains untouched. */
.gg-menu-native-host .gg-menu .gg-menu-setting .Panel{padding:0;margin:0;border:0;border-radius:12px;background:transparent;box-shadow:none;font:inherit;min-height:0;transform:none!important;transition:none!important;animation:none!important}
.gg-menu-native-host .gg-menu .gg-menu-setting [id$="_Label"]{font-family:inherit;font-size:13px;line-height:1.3;font-weight:700;color:#fff;text-shadow:0 1px 2px #0009}
.gg-menu-native-host .gg-menu .gg-menu-setting [id$="_Description_Description"]{font-family:inherit;font-size:11px;color:#d5dce3;line-height:1.4;margin-top:4px}
.gg-menu-native-host .gg-menu .gg-menu-slider-label{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%}
.gg-menu-native-host .gg-menu .gg-menu-slider-label output{font:inherit;font-size:12px;color:#fff;font-variant-numeric:tabular-nums}
.gg-menu-native-host .gg-menu .gg-menu-setting .SliderTrack{width:calc(100% - 24px);height:4px;border-radius:20px;background:#ffffff26}
.gg-menu-native-host .gg-menu .gg-menu-setting .SliderTrack::before{height:100%;background:var(--gg-menu-accent);border-radius:20px}
.gg-menu-native-host .gg-menu .gg-menu-setting .SliderHandle{width:18px;height:18px;top:3px;right:3px;left:auto;bottom:auto;margin:0;border:0;border-radius:50%;background:#fff}
.gg-menu-native-host .gg-menu footer{font-size:12px;font-weight:500;gap:20px;padding:17px 4px;color:#d5dce3}
.gg-menu-native-host .gg-menu>header,.gg-menu-native-host .gg-menu footer{text-shadow:0 1px 2px #000c}
.gg-menu-native-host .gg-menu .gg-menu-caption-actions button.gg-menu-action.gg-menu-notifications.DialogButton{min-width:40px;min-height:40px;padding:10px;border:1px solid var(--gg-menu-button-border);border-radius:26px;background:${HOME_BUTTON_GLASS.background};color:#f4f6f8;box-shadow:inset 0 1px #ffffff09}
.gg-menu-native-host .gg-menu .gg-menu-caption-actions button.gg-menu-action.gg-menu-notifications.DialogButton.gpfocus{outline:none;background:var(--gg-menu-focus-surface);box-shadow:var(--gg-menu-focus-shadow)}
/* Full-height shoulder endcaps and one centred height for direct toggles. */
.gg-menu-native-host .gg-menu .gg-menu-bar{padding:0;gap:0;align-items:stretch}
.gg-menu-native-host .gg-menu .gg-menu-tabs{padding:10px 8px;align-items:center}
.gg-menu-native-host .gg-menu .gg-menu-shoulder{display:flex;align-items:center;justify-content:center;align-self:stretch;min-width:64px;padding:10px;border:0;border-radius:0;background:#ffffff06}
.gg-menu-native-host .gg-menu .gg-menu-shoulder:first-child{border-right:1px solid #ffffff25}
.gg-menu-native-host .gg-menu .gg-menu-shoulder:last-child{border-left:1px solid #ffffff25}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton[aria-pressed=true].gpfocus,.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton[aria-pressed=true]:focus-visible{background:var(--gg-menu-focus-surface);box-shadow:var(--gg-menu-focus-shadow)}
.gg-menu-native-host .gg-menu .gg-menu-setting-label{display:inline-flex;align-items:center;gap:9px;min-width:0}
.gg-menu-native-host .gg-menu .gg-menu-setting-label svg{width:18px;height:18px;flex:none;color:#fff}
/* Vector strokes remain SVG geometry; avoid blur/drop-shadow filters on icons. */
.gg-menu-native-host .gg-menu svg[stroke="currentColor"]{stroke-width:2.4}
.gg-menu-native-host .gg-menu .gg-menu-shoulder{color:#fff;font-weight:700;font-size:12px}
.gg-menu-native-host .gg-menu .gg-menu-switches{grid-auto-rows:56px}
.gg-menu-native-host .gg-menu .gg-menu-setting-toggle{height:56px;display:flex;align-items:center}
.gg-menu-native-host .gg-menu .gg-menu-setting-toggle>.Panel{width:100%;flex:1;min-width:0}

.gg-menu-native-host .gg-menu .gg-menu-native-icon{display:inline-flex;align-items:center;flex:none}

/* Performance uses the same native controls, glass and focus treatment as Quick settings. */
.gg-menu-native-host .gg-menu .gg-menu-performance-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
.gg-menu-native-host .gg-menu .gg-menu-performance-heading{flex:1;min-width:0}
.gg-menu-native-host .gg-menu .gg-menu-performance-heading h2{margin:0 0 4px}
.gg-menu-native-host .gg-menu .gg-menu-perf-content{padding-top:8px}
.gg-menu-native-host .gg-menu .gg-menu-performance-profile{padding:10px}
.gg-menu-native-host .gg-menu .gg-menu-performance .gg-menu-profile-context .gg-menu-setting{height:40px;min-height:40px}
.gg-menu-native-host .gg-menu .gg-menu-performance .gg-menu-switches{grid-auto-rows:48px}
.gg-menu-native-host .gg-menu .gg-menu-performance .gg-menu-switches .gg-menu-setting-toggle{height:48px;min-height:48px}
.gg-menu-native-host .gg-menu .gg-menu-performance-power{margin:0;color:#fff;font-size:12px}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs{display:flex;gap:6px;margin-bottom:8px}
/* Steam's pressed state overrides corners and typography. Pin geometry through touch activation. */
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton{border-radius:12px!important;font-size:13px!important;line-height:1.3!important;height:36px;flex:1;min-height:36px;padding:8px 10px;background:transparent;text-shadow:0 1px 2px #0009}
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton[aria-pressed=true],.gg-menu-native-host .gg-menu .gg-menu-profile-pill button.gg-menu-action.DialogButton[aria-pressed=true]{background:var(--gg-menu-selected-surface);border-color:var(--gg-menu-selected-edge);color:#fff;box-shadow:inset 0 1px 0 #ffffff14}
.gg-menu-native-host .gg-menu .gg-menu-performance-profile h3{margin:0 0 8px}
.gg-menu-native-host .gg-menu .gg-menu-profile-pill{display:flex;padding:4px;gap:4px;border-radius:999px;background:${HOME_BUTTON_GLASS.background};border:1px solid var(--gg-menu-button-border)}
.gg-menu-native-host .gg-menu .gg-menu-profile-pill button.gg-menu-action.DialogButton{flex:1;border-radius:999px;min-height:36px;padding:8px 12px;background:transparent;border-color:transparent;text-shadow:0 1px 2px #0009}
/* A selected section is persistent context; controller focus is the brighter glass surface. */
.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible),.gg-menu-native-host .gg-menu .gg-menu-profile-pill button.gg-menu-action.DialogButton:is(.gpfocus,:focus-visible){background:var(--gg-menu-focus-surface);border-color:rgba(255,255,255,.36);box-shadow:var(--gg-menu-focus-shadow)}
.gg-menu-native-host .gg-menu .gg-menu-profile-context{flex:0 1 44%;min-width:0}
.gg-menu-native-host .gg-menu .gg-menu-performance-header .gg-menu-profile-context .gg-menu-setting{padding-right:0}
.gg-menu-native-host .gg-menu .gg-menu-performance .gg-menu-setting-disabled{opacity:.6}
`;
