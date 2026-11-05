import {TOKENS,tokenCss,frostFilter} from '../styles/tokens';
export const nativeSettingsStyles=tokenCss('[data-gg-settings="container"],[data-gg-settings="popup"]')+`
[data-gg-settings="container"]{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;isolation:isolate;background:var(--gg-settings-base,#0c1016)!important;color:var(--gg-text)!important;text-shadow:var(--gg-text-shadow);--gg-d:1px}
[data-gg-settings-backdrop]{position:fixed;inset:-48px;z-index:-1;pointer-events:none;background-position:center;background-size:cover;filter:${frostFilter('16px')} saturate(.8) brightness(.8)}
[data-gg-settings-backdrop="fallback"]{filter:${frostFilter('42px')} saturate(.7) brightness(.7)}
[data-gg-settings="container"]>.DialogContent_InnerWidth{width:100%!important;height:100%!important;padding:0!important;margin:0!important;background:transparent!important}
[data-gg-settings="layout"]{position:fixed!important;left:var(--gg-settings-left)!important;top:var(--gg-settings-top)!important;width:var(--gg-settings-width)!important;height:var(--gg-settings-height)!important;display:flex!important;min-height:0!important;background:${TOKENS.glass}!important;border:1px solid var(--gg-edge);border-radius:16px;overflow:hidden!important;box-sizing:border-box!important;backdrop-filter:blur(16px)}
[data-gg-settings="nav"]{width:var(--gg-settings-sidebar)!important;min-width:var(--gg-settings-sidebar)!important;max-width:var(--gg-settings-sidebar)!important;flex:0 0 var(--gg-settings-sidebar)!important;height:100%!important;min-height:0!important;padding:48px 0 0!important;margin:0!important;overflow-y:hidden!important;background:rgba(12,16,22,.22)!important;border-right:1px solid var(--gg-edge);box-sizing:border-box!important;scroll-padding:8px}
[data-gg-settings="nav"]>div{height:100%!important;min-height:0!important;overflow-y:auto!important;scroll-padding:8px;padding:8px 7px!important;margin:0!important;width:100%!important;box-sizing:border-box!important}
[data-gg-settings="nav"] [role="tab"]{min-height:44px!important;height:auto!important;box-sizing:border-box!important;padding:9px 10px!important;margin:0!important;border:0!important;border-radius:9px!important;background:transparent!important;color:var(--gg-text-idle)!important;font-size:15px!important;line-height:22px!important;transform:none!important}
[data-gg-settings="nav"] [role="tab"]>div{font-size:15px!important;line-height:22px!important;gap:10px!important;padding:0!important;white-space:normal!important}
[data-gg-settings="nav"] [role="tab"] svg{width:18px!important;height:18px!important;margin-right:0!important;flex:none}
[data-gg-settings="nav"] [role="tab"][aria-selected="true"]{background:var(--gg-selected)!important;color:var(--gg-text)!important;box-shadow:var(--gg-selected-edge)!important}
[data-gg-settings="nav"] [role="separator"]{margin:4px 12px!important}
[data-gg-settings="pane"]{position:relative!important;inset:auto!important;transform:none!important;flex:1!important;min-width:0!important;width:auto!important;height:100%!important;overflow:hidden!important;background:transparent!important}
[data-gg-settings="page-host"]{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;min-width:0!important;display:flex!important;flex-direction:column!important;flex:1!important;overflow:hidden!important;background:transparent!important}
[data-gg-settings="page"]{position:relative!important;inset:auto!important;transform:none!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important;color:var(--gg-text)!important}
[data-gg-settings="page"]>.DialogContent_InnerWidth{width:100%!important;height:100%!important;min-height:0!important;overflow-y:auto!important;box-sizing:border-box!important;padding:10px 16px 16px!important;scroll-padding:8px;background:transparent!important}
[data-gg-settings="page"] .DialogHeader{font-size:23px!important;line-height:28px!important;min-height:28px!important;margin:0 0 9px!important;padding:0!important;color:var(--gg-text)!important;letter-spacing:-.5px!important}
[data-gg-settings="page"] .DialogBody{padding:0!important;margin:0!important}
[data-gg-settings="page"] .DialogSettingsSection{padding:0!important;margin:0 0 9px!important;gap:0!important;border:0!important}
[data-gg-settings="page"] .SettingsDialogSubHeader{font-size:11px!important;line-height:16px!important;letter-spacing:1.7px!important;text-transform:uppercase;font-weight:800!important;color:var(--gg-text-dim)!important;min-height:16px!important;height:auto!important;margin:0 0 6px!important;padding:0!important}
[data-gg-settings-row]{min-height:44px!important;height:auto!important;box-sizing:border-box!important;margin:0 0 6px!important;padding:4px 12px!important;border:0!important;border-radius:9px!important;background:${TOKENS.glass}!important;display:flex!important;align-items:center!important;gap:12px!important;transform:none!important;font-size:16px!important;color:var(--gg-text)!important}
[data-gg-settings-row]>div{margin:0!important;padding:0!important;min-height:0!important;font-size:16px!important}
[data-gg-settings-row]:not([data-gg-settings-row="slider"])>div:first-child{flex:1!important;width:auto!important;min-width:0!important}
[data-gg-settings-row="field"]>div:last-child:not(:first-child){flex:0 1 60%!important;min-width:0!important}
[data-gg-settings-row] [id$="_Label"]{font-size:16px!important;line-height:20px!important;color:var(--gg-text)!important;white-space:normal!important}
[data-gg-settings-row] [id$="_Description_Description"]{font-size:13px!important;line-height:1.4!important;color:var(--gg-text-dim)!important;white-space:normal!important}
[data-gg-settings="page"] .DialogButton{border-radius:8px!important;background:${TOKENS.strong}!important;color:var(--gg-text)!important;box-shadow:inset 0 0 0 1px var(--gg-edge)!important}
[data-gg-settings-row] .DialogButton{min-height:36px!important;height:auto!important;margin:0!important;padding:6px 8px!important;border:0!important;background:transparent!important;box-shadow:none!important;font-size:14px!important}
[data-gg-settings-row="slider"]>div{width:100%!important;flex:1!important}
[data-gg-settings-row="slider"] .SliderControlPanelGroup{padding:0!important;margin:0!important;min-height:24px!important}
[data-gg-settings-row="slider"] svg{width:20px!important;height:20px!important}
[data-gg-settings="page"] .SliderTrack{height:4px!important;border-radius:999px!important;background:var(--gg-track)!important;box-shadow:var(--gg-track-edge)}
[data-gg-settings="page"] .SliderTrack::before{background:var(--gg-accent)!important;border-radius:999px!important}
[data-gg-settings="page"] .SliderHandle{background:var(--gg-on-accent)!important}
[data-gg-settings-row="toggle"]>[role="checkbox"]{flex:0 0 auto!important;margin-left:auto!important}
[data-gg-settings="page"] [role="checkbox"][aria-checked="true"]>:first-child,[data-gg-settings="page"] [role="checkbox"][aria-checked="true"]>:first-child::before{background:var(--gg-accent)!important}
[data-gg-settings-row]:has(.gpfocus),[data-gg-settings-row].gpfocus,[data-gg-settings="nav"] [role="tab"].gpfocus{outline:2px solid #fff!important;outline-offset:2px;background:${TOKENS.strong}!important;transform:none!important}
[data-gg-settings-row] .DialogButton.gpfocus{outline:none!important;box-shadow:none!important}
[data-gg-settings="page"] .DialogButton.gpfocus:not([data-gg-settings-row] .DialogButton){outline:2px solid #fff!important;outline-offset:2px}
[data-gg-settings="page"] [aria-disabled="true"],[data-gg-settings="page"] :disabled{opacity:.45}
[data-gg-settings="popup"][role="listbox"],[data-gg-settings="popup"] .DialogContent{background:rgba(12,16,22,.95)!important;border-radius:16px!important;box-shadow:inset 0 0 0 1px var(--gg-edge)!important;color:var(--gg-text)!important;text-shadow:var(--gg-text-shadow)}
[data-gg-settings="popup"] .contextMenuItem{background:transparent!important;color:var(--gg-text-idle)!important}
[data-gg-settings="popup"] .contextMenuItem.gpfocus{background:var(--gg-selected)!important;color:var(--gg-text)!important;outline:2px solid #fff!important;outline-offset:-3px;border-radius:12px}
[data-gg-settings-title]{position:fixed;z-index:2;left:var(--gg-settings-left);top:calc(var(--gg-settings-top) + 1px);width:var(--gg-settings-sidebar);height:48px;box-sizing:border-box;padding:10px 16px;font-size:21px;line-height:28px;font-weight:700;color:var(--gg-text);pointer-events:none}
[data-gg-settings="pane"]>[data-gg-settings="page-host"]{position:absolute!important;inset:0!important}
[data-gg-settings-surface]{min-height:44px!important;height:auto!important;box-sizing:border-box!important;margin:0 0 6px!important;padding:10px 12px!important;border:0!important;border-radius:9px!important;background:${TOKENS.glass}!important;color:var(--gg-text)!important;transform:none!important}
[data-gg-settings-row]{padding:4px 12px!important}
[data-gg-settings="page"] [id$="_Label"]{font-size:16px!important;line-height:21px!important;color:var(--gg-text)!important;white-space:normal!important}
[data-gg-settings="page"] [id$="_Description_Description"],[data-gg-settings="page"] .DialogBody p{font-size:13px!important;line-height:1.4!important;color:var(--gg-text-dim)!important;white-space:normal!important}
[data-gg-settings-row="toggle"]>div:last-child:not(:first-child){flex:0 0 auto!important;margin-left:auto!important}
[data-gg-settings="page"] [role="combobox"]{text-align:right!important;max-width:100%!important}
[data-gg-settings="page"] [role="combobox"]>div{display:flex!important;justify-content:flex-end!important;align-items:center!important;width:100%!important;gap:10px}
[data-gg-settings="page"] .DialogDropDown_CurrentDisplay{flex:1!important;text-align:right!important;min-width:0!important;white-space:normal!important}
[data-gg-settings="page"] [role="combobox"] svg{flex:none!important;margin-left:0!important}
[data-gg-settings="page"] [role="tablist"]{gap:6px!important;flex-wrap:wrap}
[data-gg-settings="page"] [role="tab"]{border-radius:9px!important;background:${TOKENS.glass}!important;color:var(--gg-text-idle)!important;min-height:36px!important}
[data-gg-settings="page"] [role="tab"][aria-selected="true"],[data-gg-settings="page"] [role="radio"][aria-checked="true"]{background:var(--gg-selected)!important;color:var(--gg-text)!important;box-shadow:var(--gg-selected-edge)!important}
[data-gg-settings="page"] [role="radio"]:not(:empty){border-radius:9px!important;background:${TOKENS.glass}!important;color:var(--gg-text-idle)!important}
[data-gg-settings="page"] input:not([type="checkbox"]):not([type="radio"]),[data-gg-settings="page"] textarea,[data-gg-settings="page"] select{box-sizing:border-box!important;max-width:100%!important;min-height:36px!important;border-radius:8px!important;background:${TOKENS.strong}!important;color:var(--gg-text)!important;border:1px solid var(--gg-edge)!important;padding:6px 10px!important}
[data-gg-settings="page"] [role="tab"].gpfocus,[data-gg-settings="page"] [role="radio"].gpfocus,[data-gg-settings="page"] input.gpfocus{outline:2px solid #fff!important;outline-offset:2px;transform:none!important}
[data-gg-settings="popup"] [role="option"],[data-gg-settings="popup"] .contextMenuItem{text-align:right!important;justify-content:flex-end!important;color:var(--gg-text-idle)!important;border-radius:8px!important}
[data-gg-settings="popup"] [role="option"].gpfocus{background:var(--gg-selected)!important;color:var(--gg-text)!important;outline:2px solid white!important;outline-offset:-3px}

`;
