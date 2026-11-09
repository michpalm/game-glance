# Notification count and live menu frost

2026-10-30, codex/social-chat at afe3a8a with earlier uncommitted transition repairs retained. User accepted installed39dbaa6be4fd265cfd7f8efdd89d2b8829161d010599ddf1472cb2b67a89a97e before reporting this separate menu issue.

Clearing unread notifications removes the bell count span, shrinking the button and moving its icon. The notification region's exact width feeds frostAllocation, mirrored by backend shader geometry; a new tile allocation releases the active effect and prepares a replacement. A live count change therefore unnecessarily restarts frost. The local browser reproduces bell width as the allocation trigger; its bar/panel geometry is otherwise stable.

Repair is limited to MenuShell, menuStyles and a CSS regression: reserve an always-mounted32px count slot inside an80x40 design-unit button. Fixed20px count line height and tabular numerals; icon remains stationary with no count. Visible counts cap at99+, with full exact count retained in the button's accessible label; decorative children are aria-hidden. No frost shader/backend/lifecycle modifications. Other kinds of region/window resizing remain outside this bounded repair.

Validation: regression fails before repair, passes after. Focused menu style/frost controller54 tests passed. Full220 files /2513 tests passed; typecheck, Rollup build and diff check passed. Independent review found no actionable defect.

Production menu CSS/token browser fixture at829 and1500 CSSpx widths, counts0,1,9,10,99,100,9999,0: original bell widths vary26–56.9 CSSpx and produce5 allocations; corrected button is52 CSSpx at.65 menu scale, identical icon/bar/panel/bell bounds in all states,1 allocation using actual frostAllocation. Empty count slot remains in layout. Fixture uses a plain button with native component classes, not mounted Steam DialogButton; actual Ally count-clear/frost continuity still needs approved installation and user trial. No live notifications, private names/content or notification read state were inspected/changed.

Frontend SHA25617c6506f11d888d141c693498ef80dc291a2b48276e44730b993828d2a2259da. Not installed. No reboot required for this frontend-only candidate. No commits, push, PR or release. Preserve existing Ally build and back it up before any approved installation, with menu closed.

## Approved Ally installation

User approved “install it”. Menu closed verified before staging and immediately before replacement. Previous39dbaa6be4fd265cfd7f8efdd89d2b8829161d010599ddf1472cb2b67a89a97e frontend backed up to `/home/deck/gg-backup-notification-layout-20261030-v8yvhvck/index.js`, with original checksum. Staged build validated, atomic replacement verified, guarded frontend reload requested successfully. Independent postreload checksum17c6506f11d888d141c693498ef80dc291a2b48276e44730b993828d2a2259da matched; plugin loaded and menu closed. No restart, navigation, backend/settings change or notification read/clear action. User acceptance of clearing notifications with continuous frost remains pending.

## Empty-bell centering follow-up

User finds the reserved-width bell visually odd and requests icon centered with no count, moving beside the count when notifications appear. Two CSS rules center the icon with translateX(-20px) when its persistent preceding count slot is empty, and transition only the icon transform using the existing --gg-fast motion token. The80x40 outer button,32px slot and frost masks remain unchanged. Count0 renders an empty span (no whitespace), matching :empty. No notification actions or backend changes.

Regression observed failing before, green after; focused55 tests passed. Full220 files /2514 tests passed; typecheck, production build and diff check passed. Browser production-CSS fixture at829/1500 widths, counts0,1,9,10,99,100,9999,0: corrected bell width52 CSSpx at.65 scale throughout, icon center offset0 when empty and13 CSSpx beside a count, stable bar/panel/bell rectangles and1 frost allocation. Fixture uses a native-styled plain button; actual Ally DialogButton motion remains to be accepted after approved installation.

CandidateSHA25677ee74806f2e81274882ee4e5ede2f0463b47847200e54d864cebdc963c20abd. Not installed; baseline17c6506f11d888d141c693498ef80dc291a2b48276e44730b993828d2a2259da remains on Ally. No commits, push, PR or release.

### Centered bell installed with explicit approval

User approved “install it”. Menu closed verified before staging and immediately before replacement. Previous17c6506f11d888d141c693498ef80dc291a2b48276e44730b993828d2a2259da frontend backed up to `/home/deck/gg-backup-centered-bell-20261030-2k2ocbsy/index.js` with original checksum. Stage and atomic replacement verified as77ee74806f2e81274882ee4e5ede2f0463b47847200e54d864cebdc963c20abd. Guarded frontend reload requested successfully; independent postreload checksum matched, plugin loaded, menu closed. No reboot, navigation, backend/settings change or notification action. User acceptance pending.

## Count alignment follow-up

User has one notification visible and asks to center its number in the remaining space as the count grows. Read-only CEF inspected only the bell across renderer targets and captured a tightly cropped control; value1 was right-aligned in its20.7984 CSSpx slot, with text6.7592px wide leaving14.0393px on the left. No notification contents/actions or read state were accessed.

One CSS value changes the existing count slot from text-align:right to center. Empty bell centering, icon motion, fixed control/slot dimensions and frost allocation are unchanged. Regression observed red before, green after; focused55 style/controller tests passed; typecheck, Rollup build and diff check passed. Production-CSS browser check at829/1500 widths and counts0,1,9,10,99,100,9999,0: count text centered within .003 CSSpx, fixed outer geometry and1 frost allocation, empty icon centered/populated icon beside count as before. No full-suite rerun for this single alignment value. Actual Ally visual acceptance remains pending.

CandidateSHA256d112b14ee4ed0bd3f0fc622476aea1cfa5893954a694a695e633aca526134c6e. Not installed; installed baseline77ee74806f2e81274882ee4e5ede2f0463b47847200e54d864cebdc963c20abd. No backend/settings changes, commits, push, PR or release.

### Centered count installed with explicit approval

User approved “install”. Menu closed checked before staging and immediately before replacement. Previous77ee74806f2e81274882ee4e5ede2f0463b47847200e54d864cebdc963c20abd frontend backed up to `/home/deck/gg-backup-centered-count-20261030-48c3eega/index.js`, with original checksum. Staged and atomically installedd112b14ee4ed0bd3f0fc622476aea1cfa5893954a694a695e633aca526134c6e; guarded frontend reload requested successfully. Independent postreload checksum matched; plugin loaded, menu closed. No reboot, navigation, backend/settings change or notification action. User visual acceptance pending.
