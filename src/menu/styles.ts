/** Approved visual tokens, with one normalized canvas for Home and in-game.
 * MenuShell derives scale from the native viewport (829 CSS pixels -> .65).
 * Width stays 60vw and height 84vh after transform scaling; no context-dependent breakpoints.
 */
export const menuStyles = `
.gg-menu-native-host{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:#edf0f2;overflow:hidden;transform:translateZ(0)}
.gg-menu{--gg-menu-accent:#1a9fff;position:absolute;left:50%;top:7.6923vh;transform:translateX(-50%) scale(var(--gg-menu-scale,.65));transform-origin:top center;width:calc(60vw / var(--gg-menu-scale,.65));height:calc(84vh / var(--gg-menu-scale,.65));margin:0;display:flex;flex-direction:column;font-family:"Motiva Sans",Arial,sans-serif;color:#edf0f2;font-size:14px}
.gg-menu *{box-sizing:border-box}
.gg-menu header{flex:none;display:flex;justify-content:space-between;align-items:center;padding:0 18px 12px;gap:10px;font-size:.8em;letter-spacing:.12em}
.gg-menu-caption-actions{display:flex;align-items:center;gap:8px}
.gg-menu button.gg-menu-action.DialogButton{width:auto;min-width:0;min-height:44px;border:1px solid #ffffff18;border-radius:12px;background:#ffffff05;color:inherit;box-shadow:none;text-transform:none;font:inherit;font-weight:400;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:9px;white-space:normal;line-height:1.3}
.gg-menu button.gg-menu-action.DialogButton svg{width:1.2em;height:1.2em;flex-shrink:0}
.gg-menu button.gg-menu-action.DialogButton.gpfocus,.gg-menu button.gg-menu-action.DialogButton:focus-visible{outline:1px solid color-mix(in srgb,var(--gg-menu-accent) 43%,transparent);outline-offset:1px;box-shadow:0 0 8px color-mix(in srgb,var(--gg-menu-accent) 10%,transparent);background:color-mix(in srgb,var(--gg-menu-accent) 8%,transparent)}
.gg-menu button.gg-menu-action.DialogButton[aria-pressed=true]{background:color-mix(in srgb,var(--gg-menu-accent) 12%,transparent);color:var(--gg-menu-accent)}
.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel{background:rgba(12,16,22,.30);backdrop-filter:none;border:1px solid #ffffff26;border-radius:26px;box-shadow:inset 0 1px #ffffff09,0 16px 48px #0003}
.gg-menu .gg-menu-bar{flex:none;display:flex;gap:10px;align-items:center;padding:10px 12px}
.gg-menu-tabs{scrollbar-width:none;display:flex;justify-content:center;gap:4px;flex:1;min-width:0}
.gg-menu button.gg-menu-action.gg-menu-tab.DialogButton{font-size:.86em;padding:12px 10px;border-color:transparent;min-height:48px}
.gg-menu-shoulder{border:1px solid #ffffff30;border-radius:8px;padding:8px;font-size:.8em;color:#c3cbd2}
.gg-menu .gg-menu-panel{margin-top:12px;padding:22px;flex:1;min-height:0;max-height:none;overflow-x:hidden;overflow-y:auto;scrollbar-width:none}
.gg-menu h2{font-size:1.2em;font-weight:500;margin:0 0 18px}
.gg-menu p{color:#b8c5cf;font-size:.88em;line-height:1.6}
.gg-menu-heading{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.gg-menu-heading span{font-size:.8em;color:#acbdc9}
.gg-menu-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.gg-menu .gg-menu-grid button.gg-menu-action.DialogButton{min-height:90px}
.gg-menu-secondary{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.gg-menu button.gg-menu-action.gg-menu-back.DialogButton{border:0;background:transparent;color:#b5c8d6;justify-content:flex-start;padding-left:0}
.gg-menu-quick-sliders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gg-menu h3{font-size:.85em;font-weight:500;color:#b8c5cf;margin:18px 0 8px}
.gg-menu-setting .Panel{background:transparent;border-radius:12px}
.gg-menu-setting:has(.gpfocus){border-radius:12px;outline:1px solid color-mix(in srgb,var(--gg-menu-accent) 43%,transparent);outline-offset:2px;box-shadow:0 0 8px color-mix(in srgb,var(--gg-menu-accent) 10%,transparent);background:color-mix(in srgb,var(--gg-menu-accent) 8%,transparent)}
.gg-menu .gg-menu-setting [role=checkbox]::after{content:none}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child::before{background:inherit}
.gg-menu .gg-menu-setting [role=checkbox]>:last-child{box-sizing:border-box;position:absolute;top:0;left:0;right:auto;bottom:auto;margin:0;width:22px;height:22px;border:0;outline:0;box-shadow:0 0 5px #0005}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=true]>:first-child{background:var(--gg-menu-accent)}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=false]>:first-child{background:#ffffff30}
.gg-menu-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gg-menu-switches>div{min-width:0}
.gg-menu footer{flex:none;display:flex;justify-content:center;gap:22px;flex-wrap:wrap;padding:14px;color:#a9b9c5;font-size:.85em}
.gg-menu .gg-menu-error{color:#f6b5b5}
.gg-menu .gg-menu-panel::-webkit-scrollbar,.gg-menu .gg-menu-tabs::-webkit-scrollbar,.gg-menu .gg-menu-bar::-webkit-scrollbar{display:none}
.gg-menu .gg-menu-bar{overflow-x:hidden;scrollbar-width:none}
/* Mockup skin. Native controls retain input/readback ownership; Steam field chrome is scoped out. */
.gg-menu-native-host .gg-menu{font-family:Inter,"Segoe UI",sans-serif;font-size:13px;color:#edf0f2}
.gg-menu-native-host .gg-menu>header{padding:0 16px 12px;font-size:11px;letter-spacing:2px;color:#c2c6cb}
.gg-menu-native-host .gg-menu .gg-menu-caption-actions button.gg-menu-action.DialogButton{min-width:32px;min-height:32px;padding:8px;border:0;background:transparent;color:#c2c6cb;box-shadow:none}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton{font-family:inherit;font-size:13px;line-height:1.3;background:#ffffff0b;border:1px solid #ffffff25;border-radius:12px;color:#edf0f2}
.gg-menu-native-host .gg-menu .gg-menu-bar{padding:10px;gap:8px}
.gg-menu-native-host .gg-menu .gg-menu-tabs{gap:3px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton{min-height:0;padding:12px 7px;gap:5px;border:0;border-radius:13px;background:transparent;color:#abb2ba;font-size:12px;box-shadow:none}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-tab.DialogButton[aria-pressed=true]{background:color-mix(in srgb,var(--gg-menu-accent) 16%,transparent);color:#faf9f7;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gg-menu-accent) 55%,transparent)}
.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton.gpfocus,.gg-menu-native-host .gg-menu button.gg-menu-action.DialogButton:focus-visible{outline:1px solid color-mix(in srgb,var(--gg-menu-accent) 43%,transparent);outline-offset:1px;background:color-mix(in srgb,var(--gg-menu-accent) 8%,transparent);box-shadow:0 0 8px color-mix(in srgb,var(--gg-menu-accent) 10%,transparent)}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton{flex-direction:column;justify-content:center;min-height:112px;padding:13px 14px;gap:14px;border:1px solid #ffffff16;border-radius:16px;background:#ffffff0b}
.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton svg{width:23px;height:23px;color:#c8cdd0}
.gg-menu-native-host .gg-menu h2{font-size:16px;font-weight:500;letter-spacing:-.2px;margin:0 0 22px}
.gg-menu-native-host .gg-menu h3{font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#bfc5ca;margin:18px 0 4px}
.gg-menu-native-host .gg-menu .gg-menu-setting{padding:10px;min-height:48px;border-radius:12px;font-size:13px}
.gg-menu-native-host .gg-menu .gg-menu-setting .Panel{padding:0;margin:0;border:0;border-radius:12px;background:transparent;box-shadow:none;font:inherit;min-height:0}
.gg-menu-native-host .gg-menu .gg-menu-setting [id$="_Label"]{font-family:inherit;font-size:13px;font-weight:400;color:#edf0f2}
.gg-menu-native-host .gg-menu .gg-menu-setting [id$="_Description_Description"]{font-family:inherit;font-size:11px;color:#b8bec5;line-height:1.4;margin-top:4px}
.gg-menu-native-host .gg-menu .gg-menu-slider-label{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%}
.gg-menu-native-host .gg-menu .gg-menu-slider-label output{font:inherit;font-size:12px;color:#c8cdd1;font-variant-numeric:tabular-nums}
.gg-menu-native-host .gg-menu .gg-menu-setting .SliderTrack{height:4px;border-radius:20px;background:#ffffff26}
.gg-menu-native-host .gg-menu .gg-menu-setting .SliderTrack::before{height:100%;background:var(--gg-menu-accent);border-radius:20px}
.gg-menu-native-host .gg-menu .gg-menu-setting .SliderHandle{width:18px;height:18px;top:3px;right:3px;left:auto;bottom:auto;margin:0;border:0;border-radius:50%;background:#fff}
.gg-menu-native-host .gg-menu footer{font-size:12px;gap:20px;padding:17px 4px;color:#b2b9c0}
`;
