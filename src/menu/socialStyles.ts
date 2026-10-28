import { focusRing, selectedSlice } from '../styles/tokens';

/** Social shares menu tokens and controls; these rules describe only its layout and content. */
export const socialStyles = `
.gg-social{display:flex;flex-direction:column;height:100%;min-height:0;gap:16px;font-size:var(--gg-type-body);font-weight:var(--gg-weight-body);line-height:1.35}
.gg-social-split{display:grid;grid-template-columns:minmax(190px,4fr) minmax(0,6fr);gap:16px;flex:1;min-height:0}
.gg-social-friends{display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0;border-right:1px solid var(--gg-edge);padding-right:12px}
.gg-social-list-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-size:var(--gg-type-label)}
.gg-social-list-heading>span:first-child{text-transform:uppercase;letter-spacing:.16em;font-weight:var(--gg-weight-heading)}
.gg-social-friend-list{overflow-y:auto;min-height:0;scrollbar-width:none;display:flex;flex-direction:column;gap:8px;padding:8px}
.gg-social-friend-list::-webkit-scrollbar,.gg-social-timeline::-webkit-scrollbar{display:none}
.gg-menu-native-host .gg-menu .gg-social button.gg-social-friend.DialogButton{position:relative;display:flex;justify-content:flex-start;width:100%;gap:8px;min-height:64px;padding:12px;border-radius:var(--gg-r-card);border-color:var(--gg-edge);text-align:left}
.gg-menu-native-host .gg-menu .gg-social button.gg-social-friend.DialogButton[aria-pressed=true]{${selectedSlice()}}
.gg-social-avatar{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--gg-r-pill);border:2px solid;overflow:hidden;flex:none;background:var(--gg-glass)}
.gg-social-avatar img{width:100%;height:100%;object-fit:cover}.gg-social-avatar svg{width:20px;height:20px}
.gg-social-identity{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.gg-social-identity strong{font-size:var(--gg-type-body);font-weight:var(--gg-weight-body);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gg-social-identity small{font-size:var(--gg-type-label);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal}
.gg-social-conversation{min-height:0;min-width:0;display:flex;flex-direction:column;gap:12px}
.gg-social-chat-heading{display:flex;gap:12px;align-items:center;padding:0 0 12px;border-bottom:1px solid var(--gg-edge);flex:none}
.gg-social-back-slot{flex:none}.gg-social-back-slot[inert]{visibility:hidden}
.gg-social-timeline{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:4px 8px 8px;overscroll-behavior:contain}
:where(html:not([data-gg-mouse])) .gg-social-timeline:focus-visible{outline:2px solid rgba(255,255,255,.9);outline-offset:-2px;border-radius:var(--gg-r-card)}
.gg-social-message{max-width:90%;display:flex;align-items:flex-start;flex-direction:column;gap:4px}.gg-social-own{align-self:flex-end;align-items:flex-end}
.gg-social-bubble{padding:8px 12px;border:1px solid var(--gg-edge);border-radius:var(--gg-r-card);background:var(--gg-glass);white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;min-width:0;max-width:100%}
.gg-social-own .gg-social-bubble{background:var(--gg-accent);color:var(--gg-on-accent)}
.gg-social-message>small{font-size:var(--gg-type-label);color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow);font-variant-numeric:tabular-nums}
.gg-social-compose{display:flex;gap:12px;align-items:center;flex:none;padding:4px}
.gg-social-input{flex:1;min-width:0;border-radius:var(--gg-r-card);border:1px solid var(--gg-edge-raised);background:var(--gg-glass);padding:4px 8px;transition:box-shadow var(--gg-base),background var(--gg-base)}
:where(html:not([data-gg-mouse])) .gg-social-input:is(:focus-within,:has(.gpfocus)){${focusRing('menu')};background:var(--gg-glass-strong)}
.gg-social-input input{font:inherit!important;color:var(--gg-text)!important;background:transparent!important;box-shadow:none!important;border:0!important;width:100%;min-width:0}
.gg-menu-native-host .gg-menu .gg-social button.gg-social-send.DialogButton{background:var(--gg-accent);color:var(--gg-on-accent);flex:none}
.gg-menu .gg-social p{font-size:var(--gg-type-body);margin:0;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}.gg-menu .gg-social p.gg-social-error{font-size:var(--gg-type-body);color:#f6b5b5;flex:none}
.gg-social-preview{display:flex;flex:1;min-height:0;overflow:hidden;flex-direction:column;justify-content:flex-end;gap:8px;padding:8px 4px}
.gg-social-empty{padding:12px 0}.gg-social-preview p{max-width:30em}
.gg-menu-native-host .gg-menu .gg-social button.gg-social-friend.DialogButton:not([aria-pressed=true]){background:transparent;border-color:transparent}
.gg-social-preview .gg-social-empty{align-self:center;margin:auto 0}
.gg-menu-native-host .gg-menu .gg-social button.gg-social-write.DialogButton{flex:1;justify-content:flex-start;color:var(--gg-text-dim);text-shadow:var(--gg-text-shadow)}
`;
