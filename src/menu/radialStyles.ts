import {TOKENS,labelText} from '../styles/tokens';
export const radialStyles=`
.gg-radial-keyboard-host{position:fixed;inset:0;z-index:5;pointer-events:none;color:var(--gg-text,#fff);font-family:"Motiva Sans",Arial,sans-serif;font-size:16px;text-shadow:var(--gg-text-shadow);transition:opacity var(--gg-fast,100ms) linear}
.gg-radial-keyboard-host *{box-sizing:border-box}
.gg-radial-wheel{position:absolute;pointer-events:auto;background:${TOKENS.solid};border:1px solid var(--gg-edge,rgba(255,255,255,.2));border-radius:50%;box-shadow:0 8px 24px rgba(0,0,0,.4);overflow:hidden}
.gg-radial-wheel>svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.gg-radial-sector{fill:rgba(255,255,255,.06);stroke:rgba(255,255,255,.15);stroke-width:.25}
.gg-radial-sector[data-selected=true]{fill:var(--gg-accent,#6753bd);stroke:rgba(255,255,255,.95);stroke-width:.6}
.gg-radial-keyboard-host .gg-radial-key{position:absolute;transform:translate(-50%,-50%);padding:0;min-width:0;width:12%;height:12%;border:0;border-radius:50%;color:inherit;background:transparent;font-family:inherit;font-size:clamp(16px,calc(var(--gg-radial-diameter) * .085),24px);line-height:1;${labelText()};cursor:pointer}
:where(html:not([data-gg-mouse])) .gg-radial-keyboard-host .gg-radial-key:focus-visible{outline:2px solid white;outline-offset:1px}
.gg-radial-centre{position:absolute;left:33%;top:33%;width:34%;height:34%;border:1px solid var(--gg-edge,rgba(255,255,255,.2));border-radius:50%;background:${TOKENS.solid};display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none}
.gg-radial-chosen{font-size:clamp(28px,calc(var(--gg-radial-diameter) * .17),48px);height:1em;line-height:1;${labelText()}}
.gg-radial-centre small{font-size:12px;line-height:1;margin-top:4px;color:var(--gg-text-dim,#ddd)}
.gg-radial-hint{position:absolute;text-align:center;font-size:12px;line-height:16px;white-space:nowrap;${labelText()}}
.gg-radial-actions{position:absolute;bottom:12px;left:22%;right:22%;display:flex;justify-content:center;flex-wrap:wrap;gap:4px 16px;font-size:12px;line-height:16px;${labelText()}}
`;
