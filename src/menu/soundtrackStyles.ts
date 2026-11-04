// The Soundtrack page (layout B, approved on the Ally 2026-11-04): the cover at the left, the track and controls at the right.
export const soundtrackStyles = `
.gg-menu .gg-soundtrack{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;align-items:center;margin-top:16px}
.gg-menu .gg-soundtrack-cover{display:block;width:300px;height:300px;flex:none;border-radius:12px;object-fit:cover;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.gg-menu .gg-soundtrack-empty{display:flex;align-items:center;justify-content:center;background:var(--gg-glass);border:1px solid var(--gg-edge);box-shadow:none}
.gg-menu .gg-soundtrack-empty svg{width:96px;height:96px;color:var(--gg-text-dim)}
.gg-menu .gg-soundtrack-side{display:flex;flex-direction:column;gap:18px;min-width:0}
.gg-menu .gg-soundtrack-titles{display:flex;flex-direction:column;gap:6px;min-width:0}
.gg-menu .gg-soundtrack-track{font-size:30px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
.gg-menu .gg-soundtrack-controls{display:flex;align-items:center;justify-content:center;gap:20px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-soundtrack-button.DialogButton{display:flex;align-items:center;justify-content:center;width:56px;height:56px;min-width:0;min-height:0;padding:0;flex:none;border-radius:50%;border:1px solid var(--gg-edge);background:var(--gg-glass);color:var(--gg-text)}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-soundtrack-button.DialogButton[aria-pressed=false]{color:var(--gg-text-dim)}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-soundtrack-button.DialogButton[aria-pressed=true]{background:var(--gg-selected);color:var(--gg-text)}
.gg-menu .gg-soundtrack-button svg{width:26px;height:26px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-soundtrack-button.gg-soundtrack-play.DialogButton{width:76px;height:76px;border-color:transparent;background:var(--gg-accent);color:var(--gg-on-accent,#fff)}
.gg-menu .gg-soundtrack-play svg{width:34px;height:34px}
.gg-menu .gg-soundtrack-fill svg{fill:currentColor}
`;
