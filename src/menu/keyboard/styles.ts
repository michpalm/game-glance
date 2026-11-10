import {focusRing,frostSurface,labelText,TOKENS} from '../../styles/tokens';
const KEY=':is(.gg-menu-native-host .gg-menu,.gh-keyboard-surface) .gg-keyboard .gg-keyboard-row button.gg-keyboard-key.DialogButton';
export const keyboardStyles=`
:is(.gg-menu,.gh-keyboard-surface) .gg-keyboard{position:absolute;z-index:2;box-sizing:border-box;width:409px;height:210px;padding:8px 11px 0;display:flex;flex-direction:column;background:${TOKENS.solid};backdrop-filter:none;border:1px solid var(--gg-edge);border-radius:var(--gg-r-panel);transition:box-shadow var(--gg-fast),border-color var(--gg-fast)}
.gh-keyboard-surface .gg-keyboard:not(.gg-keyboard-dragging){${frostSurface('16px')}}
:is(.gg-menu,.gh-keyboard-surface) .gg-keyboard.gg-keyboard-dragging{box-shadow:0 18px 40px -12px rgba(0,0,0,.75);border-color:var(--gg-edge-active)}
.gg-social-friend-list.gg-keyboard-under,.gg-social-timeline.gg-keyboard-under{filter:blur(16px)}
.gg-keyboard-keys{display:flex;flex-direction:column;gap:5px;flex:none}
.gg-keyboard-row{display:flex;gap:5px;width:100%}
${KEY}{position:relative;box-sizing:border-box;flex:0 1 34px;width:auto;min-width:0;height:40px;min-height:0;padding:0;border:0;border-radius:10px;background:rgba(255,255,255,.10);color:var(--gg-text);font-size:17px;line-height:1;text-shadow:var(--gg-text-shadow);white-space:nowrap;transition:none}
${KEY}.gg-keyboard-mod{background:rgba(255,255,255,.20)}
${KEY}.gg-keyboard-wide{flex-basis:53px}
${KEY}.gg-keyboard-side{flex-basis:51px}
${KEY}.gg-keyboard-space{flex:1 1 0}
${KEY}.gg-keyboard-small{font-size:13px}
${KEY}.gg-keyboard-send{background:var(--gg-accent);color:var(--gg-on-accent)}
${KEY}[aria-pressed=true]{background:rgba(255,255,255,.36);box-shadow:var(--gg-selected-edge)}
:where(html:not([data-gg-mouse])) ${KEY}:is(.gpfocus,:focus-visible){${focusRing('menu')}}
:where(html:not([data-gg-mouse])) ${KEY}:is(.gpfocus,:focus-visible):not([aria-pressed=true]):not(.gg-keyboard-send){background:rgba(255,255,255,.28)}
.gg-keyboard-hint{position:absolute;top:3px;right:5px;font-size:10px;font-weight:600;line-height:1;${labelText()}}
.gg-keyboard-strip{height:24px;flex:none;margin-top:auto;display:flex;touch-action:none}
:is(.gg-menu-native-host .gg-menu,.gh-keyboard-surface) .gg-keyboard-strip button.gg-keyboard-move.DialogButton{flex:1;min-height:0;height:24px;padding:0;gap:8px;border:0;border-radius:0 0 var(--gg-r-panel) var(--gg-r-panel);background:transparent;cursor:grab;touch-action:none}
:where(html:not([data-gg-mouse])) :is(.gg-menu-native-host .gg-menu,.gh-keyboard-surface) .gg-keyboard-strip button.gg-keyboard-move.DialogButton:is(.gpfocus,:focus-visible){outline-offset:-2px}
.gg-keyboard-grab{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.45)}
.gg-keyboard-strip svg{width:12px;height:12px;${labelText()}}
.gg-keyboard-strip-label{display:none;align-items:center;gap:4px;font-size:11px;font-weight:600;line-height:14px;${labelText()}}
.gg-keyboard-badge{box-sizing:border-box;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;border:1px solid currentColor;border-radius:50%;font-size:10px;font-weight:700;line-height:1}
:where(html:not([data-gg-mouse])) :is(.gg-menu-native-host .gg-menu,.gh-keyboard-surface) .gg-keyboard-strip button.gg-keyboard-move.DialogButton:is(.gpfocus,:focus-visible) .gg-keyboard-strip-label{display:inline-flex}
.gg-draft{display:block;overflow:hidden;white-space:pre;min-width:0}
.gg-draft>span{white-space:pre;overflow:visible;text-overflow:clip}
.gg-caret{display:inline-block;width:2px;height:1.15em;vertical-align:-0.2em;margin:0 1px;border-radius:1px;background:currentColor;animation:gg-caret-blink 1s steps(1) infinite}
@keyframes gg-caret-blink{50%{opacity:0}}
.gg-draft[data-scrolled]{-webkit-mask-image:linear-gradient(90deg,transparent,#000 28px);mask-image:linear-gradient(90deg,transparent,#000 28px)}
`;
