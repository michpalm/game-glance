/** Menu-owned styles only; native roots retain their own lifecycle and input ownership. */
export const menuStyles = `
.gg-menu-native-host{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:#edf0f2;overflow:hidden}
.gg-menu{--gg-menu-accent:#1a9fff;width:min(74.0625vw,1185px);margin:8vh auto 0;font-family:"Motiva Sans",Arial,sans-serif;color:#edf0f2;font-size:clamp(14px,1.25vw,20px)}
.gg-menu *{box-sizing:border-box}
.gg-menu header{display:flex;justify-content:space-between;align-items:center;padding:0 18px 12px;gap:12px;font-size:.8em;letter-spacing:.12em}
.gg-menu-caption-actions{display:flex;align-items:center;gap:8px}
.gg-menu .gg-menu-action{width:auto;min-width:0;min-height:44px;border:1px solid #ffffff18;border-radius:14px;background:#ffffff05;color:inherit;box-shadow:none;text-transform:none;font:inherit;font-weight:400;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:9px;white-space:normal;line-height:1.3}
.gg-menu .gg-menu-action svg{width:1.2em;height:1.2em;flex-shrink:0}
.gg-menu .gg-menu-action.gpfocus,.gg-menu .gg-menu-action:focus-visible{outline:1px solid color-mix(in srgb,var(--gg-menu-accent) 50%,transparent);outline-offset:1px;box-shadow:0 0 18px color-mix(in srgb,var(--gg-menu-accent) 12%,transparent);background:color-mix(in srgb,var(--gg-menu-accent) 10%,#131b22)}
.gg-menu .gg-menu-action[aria-pressed=true]{background:color-mix(in srgb,var(--gg-menu-accent) 12%,transparent);color:var(--gg-menu-accent)}
.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel{background:rgba(12,16,22,.56);backdrop-filter:blur(18px) saturate(120%);border:1px solid #ffffff26;border-radius:22px;box-shadow:inset 0 1px #ffffff09,0 16px 48px #0003}
.gg-menu .gg-menu-bar{display:flex;gap:12px;align-items:center;padding:10px 12px}
.gg-menu-tabs{display:flex;justify-content:center;gap:4px;flex:1;min-width:0}
.gg-menu .gg-menu-tab{font-size:.86em;padding:12px 10px;border-color:transparent;min-height:48px}
.gg-menu-shoulder{border:1px solid #ffffff30;border-radius:8px;padding:8px;font-size:.8em;color:#c3cbd2}
.gg-menu .gg-menu-panel{margin-top:12px;padding:24px 28px;min-height:46vh;max-height:65vh;overflow:auto;scrollbar-width:thin}
.gg-menu h2{font-size:1.2em;font-weight:500;margin:0 0 18px}
.gg-menu p{color:#b8c5cf;font-size:.88em;line-height:1.6}
.gg-menu-heading{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.gg-menu-heading span{font-size:.8em;color:#acbdc9}
.gg-menu-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.gg-menu .gg-menu-grid .gg-menu-action{min-height:90px}
.gg-menu-secondary{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
.gg-menu .gg-menu-back{border:0;background:transparent;color:#b5c8d6;justify-content:flex-start;padding-left:0}
.gg-menu-quick-sliders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 20px}
.gg-menu h3{font-size:.85em;font-weight:500;color:#b8c5cf;margin:18px 0 8px}
.gg-menu-setting .Panel{background:transparent;border-radius:14px}
.gg-menu-setting:has(.gpfocus){border-radius:14px;outline:1px solid color-mix(in srgb,var(--gg-menu-accent) 45%,transparent);outline-offset:2px;background:color-mix(in srgb,var(--gg-menu-accent) 8%,transparent)}
.gg-menu .gg-menu-setting [role=checkbox]::after{content:none}
.gg-menu .gg-menu-setting [role=checkbox]>:first-child::before{background:inherit}
.gg-menu .gg-menu-setting [role=checkbox]>:last-child{box-sizing:border-box;width:22px;height:22px;border:0;outline:0;box-shadow:0 0 5px #0005}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=true]>:first-child{background:var(--gg-menu-accent)}
.gg-menu .gg-menu-setting [role=checkbox][aria-checked=false]>:first-child{background:#ffffff30}
.gg-menu-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.gg-menu-switches>div{min-width:0}
.gg-menu footer{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;padding:14px;color:#a9b9c5;font-size:.85em}
.gg-menu .gg-menu-error{color:#f6b5b5}
@media(max-width:900px){.gg-menu{width:calc(100vw - 32px);margin-top:4vh}.gg-menu-tabs{flex-wrap:wrap}.gg-menu .gg-menu-tab{padding:10px 8px}.gg-menu .gg-menu-panel{max-height:62vh}.gg-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.gg-menu{width:calc(100vw - 16px)}.gg-menu .gg-menu-panel{padding:18px}.gg-menu-switches{grid-template-columns:1fr}.gg-menu-shoulder{display:none}.gg-menu-grid{grid-template-columns:1fr}.gg-menu header{padding-inline:8px}}
`;
