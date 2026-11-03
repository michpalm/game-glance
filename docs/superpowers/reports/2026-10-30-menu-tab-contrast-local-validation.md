# Menu selected-tab contrast

2026-10-30, codex/social-chat, afe3a8a plus prior local work. User requests clearer selected tabs because highlight is too dim. Read-only Ally inspection/crop covered only generic menu bar labels (no Social/notification panel data). Live selection was white.14 fill, accent55%/2px inset underline; controller focus had moved into the panel, leaving no white focus ring around the selected tab.

Presented a rendered before/after design (menu-tab-contrast-preview.jpg in this chat's visualization directory): white.24 fill and3px inset underline blending legible accent65% with white35%; inactive labels unchanged. User approved “yes” before implementation.

Implemented a local selectedTab style in menu/styles.ts by overriding the selected shade/edge variables only on selected main menu tabs and Performance categories. Normal option slices and notification bell retain their existing quiet role. Controller white outline remains a distinct focus cue. Selected mouse-hover rules retain the inset edge, which otherwise was overwritten by existing generic hover shadows/main-tab hover-none. No layout or geometry properties changed.

Regression first failed, then passed. Focused43 style/token tests passed; full220 files /2515 tests passed. Typecheck, Rollup build and diff check passed. Browser fixture using actual production styles matches approved.24 fill and3px brighter edge for main and Performance categories; actual clicks/hover verified selected edge persists when hovered and when pointer/focus moves to another control. Independent review found no actionable defects in specificity, scope or focus styling.

Frontend SHA256f33283e3d5e2c4d7106227a4e584ebc3334c4df08b346bd88fa8a8d956ec469a. Not installed. Ally baseline remainsd112b14ee4ed0bd3f0fc622476aea1cfa5893954a694a695e633aca526134c6e. User approval here covered implementation of the design, not device installation. Actual Ally visual acceptance remains pending. No backend/settings changes, navigation or messages, commits, push, PR or release.

## Approved Ally installation

User approved “install”. Menu closed verified before staging and immediately before replacement. Previousd112b14ee4ed0bd3f0fc622476aea1cfa5893954a694a695e633aca526134c6e frontend backed up to `/home/deck/gg-backup-tab-contrast-20261030-oameq4of/index.js` with original checksum. Staged and atomically installedf33283e3d5e2c4d7106227a4e584ebc3334c4df08b346bd88fa8a8d956ec469a. Guarded frontend reload requested successfully; independent postreload checksum matched, plugin loaded and menu closed. No reboot, navigation, backend/settings change or notification action. User visual acceptance pending.
