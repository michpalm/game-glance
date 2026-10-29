# Home control native contract — read-only inspection, 2026-10-29

User explicitly approved a brief read-only Ally inspection. No navigation, input, handler invocation, reload, install or notification acknowledgement was performed. Queries returned structure/geometry/flags/source only, without text, input value, avatar/glyph URLs or user identifiers.

## Search/header finding and approved scope

On the1500×844 main Steam renderer, the top bar is a40CSS-px strip. Its leading region contains an actual `input[type=search]`, `readOnly:false`, `disabled:false`. Its native onChange source updates Steam SearchText and calls another native routine. It is not the launcher assumed in the first plan. Home/Back launchers were not present in the inspected root-Home header. No input value or handler was read/invoked as data/action.

The user chose **Proceed with footer and status focus**, explicitly leaving Search unchanged until its later phase. No input-to-launcher conversion, query/keyboard integration or native top-bar suppression is in phase one.

## Footer structure

`#Footer` is an absolutely positioned, full-width root: measured1500×41.75CSS px at the bottom of the viewport. It contains one flex wrapper (1450px wide,25px side inset). Wrapper children: a prompt group; one empty flex-grow spacer; then two prompt groups. Each prompt group has two children: a glyph holder with an IMG, and a nonempty label holder. Prompt group height~35px. Class strings are hashed and are not discovery keys.

The implementation will require this structural contract and retain all original nodes, image/SVG glyph descendants, labels, event handlers and measurable root. Its only writes are scoped marker attributes/CSS; malformed or absent structures leave today's UI untouched. Alternate synthetic SVG glyphs/localized labels test content independence; they are compatibility cases, not a claim that a second device was inspected.

Evidence JSON is ignored in `.superpowers/sdd/2026-10-29-expanded-home-controls/`: `dom-structure.json`, `control-structure.json`, `search-contract.json`, `footer-contract.json`. Baseline2329 tests passed before implementation. Current read-only approval does not authorise installation or navigating to exercise native actions.
