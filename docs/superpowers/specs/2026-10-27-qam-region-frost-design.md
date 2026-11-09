# QAM region frost integration

Date: 27 October 2026

Status: design approved by the user on 27 October 2026. The three-region in-game visual prototype is also approved; production integration is not yet implemented.

Execution status: implementation now exists locally; integrated device acceptance is pending. Source inspection required refinements to the proposed cache strategy below: retain a bounded zero-mask preparation lease through activation, because disabling can discard the native pipeline; re-arm and verify each preparation instead of inferring cache readiness. Production uniforms use two radius axes (72 bytes) to preserve corners under unequal viewport scaling. Native read-only metadata supplies missing HDR state and capped Auto fitting. See [integration validation](../../validation/qam-region-frost-2026-10-27.md) for evidence and remaining checks. These refinements preserve the approved visual scope and fallback behavior.

## Intended result

Give the QAM live frosting beneath its rounded tab bar, main panel and notification capsule. Keep the gaps, surrounding game and foreground controls sharp. Preserve the current 75% glass tint, layout, controller navigation and existing menu enablement preference. Add no cosmetic settings.

The user confirmed that the fresh three-region mask aligned correctly, then confirmed that the corresponding cropped blur looked correct and controller navigation felt responsive. This establishes the visual direction for one in-game scene and viewport. It does not establish Home rendering, transition timing, general performance or release readiness. Earlier experiments are not evidence for this design.

## Selected approach and alternatives

Use the validated Gamescope custom effect for the game background. It performs separable blur in three cropped, quarter-resolution textures and combines those results with the original game image through three rounded masks. A final full-resolution composition pass remains necessary; this is not a claim that all compositor work is region-limited.

For Home and other Steam UI backgrounds, use three panel-sized CSS backdrop surfaces in the owning Steam document, behind the native QAM BrowserView. They consume the same region geometry and have no independent tint. The foreground QAM continues to provide the tint, border, text and controls. This Home adapter requires device validation before acceptance.

The standard Gamescope blur request is not selected: its actual request schema has mode, radius and fade duration but no region field, and its first blur pass spans the output. A captured-image background is not selected: the requested effect is live, and this design needs no screenshot or image-transfer pipeline.

## Shared geometry contract

The only frost regions in this change are `bar`, `panel` and `notifications`. Status pills are outside this scope.

Read rendered rectangles and corner radii from the actual menu elements. Map their coordinates through the native BrowserView placeholder into the owner's output viewport. Account for the menu transform, viewport scale, DPR and output fitting; do not store prototype coordinates.

Clamp capsule radii to half the smaller rendered dimension. Preserve independent masks so the space above the tab bar and the gap above the panel remain unfiltered. Filter input includes a sampling margin; output is clipped to the exact rounded surface.

Publish a generation-tagged frame containing:

- The three output rectangles and radii, in normalized output coordinates.
- Owner output dimensions and source viewport identity.
- Whether the background is the game or Steam UI.
- The game/output fit mode and dimensions required to map output coordinates into the game's input texture.

Observe all three surfaces, the native placeholder and viewport changes. Coalesce changes to one update per animation frame. Reject non-finite, empty or inconsistent geometry. On invalidation, clear the masks before retaining or rebuilding any resources.

For game fitting, map output points through the displayed game rectangle, including centered letterboxing/cropping. Use the shader's real `BUFFER_WIDTH` and `BUFFER_HEIGHT`; window geometry alone is not authoritative for the sampled texture. Unsupported or ambiguous mappings use glass until valid mapping is available.

## In-game effect

Port the corrected prototype as a packaged shader asset. Region positions, dimensions and radii remain runtime uniforms. Every shader variant must reflect a nonzero uniform buffer. The initial prototype without uniforms exposed an invalid zero-sized buffer in the loader; the offline compiler check must reject this condition before packaging.

Keep the prototype's five-fetch Gaussian weights and quarter-resolution crops as the starting visual recipe. Size targets for the current output/layout context with sufficient sampling margin. The validated 1920 × 1080 example used bar targets of 300 × 36, panel targets of 300 × 191 and notification targets of 33 × 27, with 24 input pixels of padding. These example dimensions are not universal constants.

Changing region positions should update uniforms without compilation. If a size, format or mapping change needs different allocations, clear active masks first and prepare the new context. Until ready, retain glass; never stretch stale frost into a new layout. Blur strength must be mapped into displayed pixels so game render resolution does not silently change the look.

The final pass copies the original game sample outside the three masks. It samples the corresponding blurred crop inside each mask. Steam's foreground UI is composed afterward and is not an input to this game-background effect.

## Backend bridge and ownership

Add a small backend frost service, accessed through Decky RPC. The frontend supplies geometry and context data only. It cannot supply paths, shader source, shell commands or arbitrary effect names.

Use the installed `gamescope_reshade` interface for effect and uniform operations. Stage the packaged shader under an owned, versioned name in Gamescope's user shader directory, using an atomic write and content verification. Do not overwrite an unrelated file. Use the existing desktop user's session environment; do not rely on the Decky process's display environment.

The compositor has one custom-effect slot. If another effect is active, return `unavailable` and keep the QAM's glass. Do not replace, combine or modify that effect in this change.

Acquire and release one session-scoped lease. Snapshot the effect and technique state, and observe changes while held. Unexpected external changes revoke the lease. Clear or restore only state still owned by this service, after confirming the active effect is ours. This is a conservative ownership convention, not an atomic lock against arbitrary third-party clients; exercise actual handoffs during device validation.

Do not write the global force-composition setting. Gamescope's DRM backend selects composition when a custom effect is active (`bNeedsFullComposite |= !g_reshade_effect.empty()`). Verify that native behaviour on the installed compositor. If the effect cannot render without overriding the global setting, leave frosting unavailable on that backend rather than borrowing an uncoordinated global boolean.

The bridge exposes prepare, activate/update, renew and release operations. The backend issues an opaque lease token. Updates carry a monotonically increasing sequence number; stale tokens and sequences cannot re-enable frost. Release is idempotent. Calls are serialized and cancellable, with completion of an old request unable to affect a newer menu session.

Renew the lease every 250 ms while the QAM is active. Expire it after 1 second without renewal. Release on backend unload and connection failure. This bounds residue if the frontend crashes; normal close must release immediately rather than wait for expiry.

Use no screenshots, recordings or friends/chat content in the runtime implementation. Persist no region telemetry or captures. Diagnostics contain capability, timing and error categories only.

## Menu lifecycle and presentation

Own frost from the existing menu coordinator/host lifecycle, not from an independent polling script. Keep the native menu provider, input context, focus graph and geometry lease intact.

Preparation is asynchronous and must not block access to the menu. Warm a game/output shader context with zero masks when it is safe to do so, then disable the effect while retaining its native cache. Verify readiness and cache behavior on the installed compositor. Shader compilation may block the render thread; it cannot be assumed free or hidden merely because the RPC is asynchronous.

On open, prepare the host and geometry together. Activate only the current generation after geometry and effect readiness are confirmed. Keep the existing glass while unready. Do not start a long blur fade or introduce frost after a delayed preparation has completed for an already-visible presentation. Cold or late readiness can make frost available on a later opening.

On close or native handoff, invalidate the generation and clear the active masks before completing host teardown. Dispose the Home surfaces and release the game lease. Late acknowledgements must not restore them. Rapid close/reopen receives a new generation and cannot inherit the old mask or pending close operation.

Release on game/context changes, disablement, plugin unload, invalid geometry and backend failure. Changing between Home and the game first clears the old adapter, then prepares the new one.

There is no proven atomic commit between the native popup and the background renderer. The ordering above is a strategy to validate, not a guarantee of seamless presentation. Device transition acceptance is mandatory; visible blur-only frames, late frosting or residue prevent completion of the integration.

## Home adapter

Create one non-interactive owner-document surface per region, immediately behind the native menu viewport. Give each its actual bounds, radius and backdrop filter. Do not apply the filter to the full-viewport host and then hide it with a mask. The sampled Home image must be in that document's backdrop root.

Keep tint in the existing foreground QAM; avoid doubling opacity. Dispose all Home surfaces on close, handoff and context change. If the owning document or layer ordering cannot be verified, use glass and record the adapter as unvalidated. That fallback does not satisfy the Home acceptance check below.

## Failure behavior and scope

An unavailable bridge, another active shader, failed preparation or invalid mapping must leave a usable QAM with its current glass. Do not change TDP, game FPS limits, scaling settings, HDR preferences, other shaders or saved user settings to make frosting pass.

This work remains on the menu/Social preview branch. It does not change the released 3.6.0 package or authorize a public push, PR, release or merge.

## Implementation boundaries

- `src/menu/frost/geometry.ts`: validated region measurement and coordinate mapping.
- `src/menu/frost/controller.ts`: generations, adapter selection, readiness and cancellation.
- `src/menu/frost/home.ts`: owner-document bounded backdrop surfaces.
- `src/menu/frost/backend.ts`: typed Decky transport and lease heartbeat.
- `src/menu/host.tsx`, `presentation.ts`, `coordinator.ts`, `components/MenuShell.tsx`: lifecycle and element references, without rebuilding navigation.
- `py_modules/gameglance/frost/`: capability checks, native protocol, resource ownership and lease service.
- `main.py`: narrow RPC delegation and backend cleanup.
- A packaged shader asset plus `scripts/package.sh`: verified installation of the runtime effect.

Names are proposed boundaries; implementation planning must pin the exact interfaces and tests before execution.

## Acceptance checks

1. On game and Home backgrounds, all three rounded surfaces are frosted; gaps, outside pixels and foreground text/icons remain sharp. Bell and count remain visible.
2. Controller and touch/mouse navigation preserve current focus and hit targets. Social scrolling, input and the virtual keyboard work without geometry or focus regressions.
3. Slow preparation and bridge failure leave a responsive glass menu. No visible delayed frost arrival, blur-only opening frame, close flash or remaining game patch is accepted.
4. Rapid open/close/reopen, native handoff, game changes, resize, plugin reload and backend failure clear or replace the correct generation. An expired lease cannot reactivate.
5. Existing shader owners retain their state, including changes made while the menu is open. The global force-composition setting is never written by this feature.
6. Validate 16:9 and 16:10, output scaling, game/output resolution differences, letterboxing/cropping and HDR. Unsupported cases fall back correctly and remain explicitly unvalidated rather than being reported as complete.
7. Compare baseline and frost in the same workload with unchanged power/FPS settings. Collect unique UI-frame pacing and input-to-focus-paint timing, plus GPU timing when available. Repeated display presentations alone are not a UI frame-rate benchmark. Report distributions and unsupported metrics; do not call the feature optimized from one subjective check.
8. Require user acceptance of navigation and recorded opening/closing behaviour on the Ally. Keep Social and the Home feed closed for any capture, within the existing capture authorization.

## Verification strategy

Use frontend tests for transforms, capsule clamping, adapter disposal, readiness, stale completions and close/reopen races. Use backend tests with fake native connections for invalid requests, effect ownership, property changes, heartbeat expiry, cancellation and unload. Compile and reflect every packaged shader variant with the pinned offline compiler, asserting positive uniform size and bounded intermediate targets. Typecheck, build and inspect the ZIP's shader/module contents.

These checks precede device installation. Device validation then establishes actual Home layering, game fitting, transitions and performance. Passing local tests cannot substitute for those results.
