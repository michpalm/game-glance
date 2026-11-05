# Native Settings VDL — handheld-first direction

Status: proposed production design following an approved visual direction and temporary Audio trial. The production integration described here has not been approved or implemented.

## Intent and evidence

Michael prefers the A/B hybrid: preserve familiar native Settings organization, apply the Game Glance VDL to the entire settings shell and sidebar, and improve use of handheld space. Hand assignment/radial work is separate. Following the Ally trial, Michael said the approach looks better and identified footer clearance, actual background visibility through frost, complete Settings coverage and highlighting as remaining requirements.

The disposable Audio trial preserved native control nodes and bindings. It showed a roughly 164px sidebar on an 828×466 CSS viewport and five everyday setting rows at approximately 44px. Native A opening of a device picker, B cancellation and focus return were checked without changing audio settings. This does not establish full Settings coverage or physical-controller acceptance. The trial uses a captured game-page image; it is not production live-background frost. Screenshots and trial materials live in this chat's `settings-handheld` visualization directory.

## Design

Use one shared Settings presentation layer with shallow control styling. Steam continues to own categories, page content, values, permissions, enabled states, actions, loading/error states, focus nodes and scroll behavior. Native content is the source of truth; do not maintain a replacement category list or duplicate settings model. Retain every applicable native option, including device-specific and account-dependent content. Completeness means accessible through scrolling and controller navigation, not fitting every option on screen simultaneously.

Use nearly all available handheld space, with modest outer margins and a narrower category sidebar. Keep normal body text around the proven native/preview scale rather than scaling a desktop composition down. Approximately 44px is the starting minimum setting-row target on the inspected handheld CSS viewport, not a fixed height: long labels, descriptions, localization and complex controls must expand naturally. Do not globally force every Settings row into the Audio template. At larger viewports, the same content can use a centered maximum-width panel.

Measure the visible status/header and footer regions. Derive content and scroll safe areas from those bounds, including both bottom-corner hint cards. Focused controls must be fully visible above the footer after Steam scrolls them into view. Recompute for viewport/UI-scale changes and native/custom chrome ownership changes; do not assume a fixed 32px footer is sufficient. Sidebar and content scroll independently and preserve Steam's focus traversal.

Use translucent VDL surfaces over the real underlying context. Obtain the live backdrop/artwork from the existing artwork/frost ownership mechanisms where available, and ensure opaque native ancestor surfaces do not block it. A screenshot of a previous page is not an acceptable production source. Keep artwork visible but calm, with sufficient surface density for bright art. A plain VDL surface is the fallback when the backdrop/frost capability is unavailable. Measure performance separately on-device; the Audio prototype does not establish production frost cost.

Maintain distinct navigation selection and controller focus. The selected category retains a restrained selection treatment after focus enters the page. The current interactive target receives one clear white focus treatment. Avoid simultaneous nested row/button rings, obscured native checked state, hover-only affordances or changes to activation semantics. Dropdowns, dialogs and other portals get styling only when positively associated with this Settings owner; unrelated menus remain outside its scope. Preserve focus return after dismissal.

## Compatibility and lifecycle

Scope all styling and decoration to a verified native Settings shell and its owned portals. Prefer readable native classes, roles and capability checks; these remain internal dependencies, not Valve compatibility guarantees. Put discovery and compatibility assumptions in one boundary so page styling does not accumulate independent native lookups.

When the expected structure is unavailable, leave that page native and usable. Native navigation, all categories and all applicable controls must remain available even if styling cannot be applied. A page with a special layout may receive shared colors/type/focus styling while retaining its native geometry.

Mount through an appropriate existing main-window lifecycle after inspecting its ownership and route behavior. Route changes, plugin unload and disabling the presentation must remove styles, attributes, decorative layers, portal ownership and subscriptions. Replace the trial's 350ms poll and session-global state with a disposable production lifecycle. Do not ship the End preview banner or captured-background asset.

No backend action/API replacement is required by this design. No native settings values should be written merely to mount or test the presentation. Production activation/default behavior and the exact backdrop/lifecycle integration need review against the existing menu/chrome settings before implementation; visual approval alone does not settle those integration choices.

## Acceptance criteria

1. Header/status and both footer hint cards never overlap content, focused rows or sidebar entries at handheld size and supported UI scales.
2. Every native category and applicable setting remains present and reachable by controller and touch. Verify scroll reachability of the first and last entries, not only DOM counts.
3. Live underlying context is visible through the frost; brightness extremes remain readable, and an unavailable backdrop degrades to a usable surface.
4. Native controller activation, slider adjustment, dropdown/dialog cancellation, focus return, and sidebar/content transitions remain functional. Device-setting writes need deliberate controlled validation, not accidental edits during navigation tests.
5. Selected category, focused row, focused nested control, disabled state and checked state remain unambiguous.
6. Long labels, multiline descriptions, loading/error content and dynamically appearing options do not clip or disappear.
7. Audit the complete native Settings category inventory and inspect representative dense, dynamic, nested and modal pages. Audio-only success is insufficient. Unsupported structures must retain a usable native fallback.
8. Verify on Ally at its actual CSS viewport, a Steam Deck viewport and a larger display; establish physical-controller/touch acceptance and on-device frost performance separately.
9. Unload/disable/route-away cleanup restores native presentation and leaves settings values unchanged.

## Next review

Review this production scope and resolve activation/backdrop ownership against the existing code before an implementation plan. The current live session remains a disposable Audio-only trial, not an installed Settings overhaul.
