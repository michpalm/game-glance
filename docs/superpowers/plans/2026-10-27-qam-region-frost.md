# QAM Region Frost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate live frost beneath the QAM's tab bar, main panel and notification capsule, with responsive navigation and seamless opening and closing on the Ally.

**Architecture:** A generation-aware frontend controller selects bounded owner-document backdrop surfaces on Home or a leased Gamescope effect in-game. A desktop-user worker owns the native connection, shader resources and expiry watchdog; Decky exposes only typed geometry/lifecycle operations. Cold preparation retains glass for the current presentation and can enable frost on a later opening.

**Tech Stack:** TypeScript, React, Decky RPC, Python standard library, system Wayland/X11 libraries, Gamescope ReShade FX, Vitest, pytest and a pinned offline FX compiler.

**Spec:** [Approved design](../specs/2026-10-27-qam-region-frost-design.md).

## Global Constraints

- Frost regions are exactly `bar`, `panel` and `notifications`; status pills are outside this scope.
- Preserve the current 75% glass tint, layout, controller navigation and existing menu enablement preference. Add no cosmetic settings.
- Do not write the global force-composition setting.
- Renew the lease every 250 ms while the QAM is active. Expire it after 1 second without renewal.
- Use no screenshots, recordings or friends/chat content in the runtime implementation. Persist no region telemetry or captures.
- Do not change TDP, game FPS limits, scaling settings, HDR preferences, other shaders or saved user settings to make frosting pass.
- Work only in the `codex/social-chat` checkout. Preserve the inherited opacity and validation changes. Do not change the released 3.6.0 package or publish, push, open a PR or merge.
- Native menus retain their provider, input context, focus graph and geometry lease. A failed frost adapter must not fail the menu.
- Local checks precede device installation; device acceptance remains required after those checks pass.

## Review Focus

- Close while activation is pending: cancellation must invalidate the request before its lease token is known (Tasks 3–5).
- Another shader takes ownership between a state read and cleanup: leave its uniforms, technique and effect untouched (Task 3; device Task 6).
- Fractional scaling, letterboxing or an unknown native scaler: use correct output-space masks or glass; never stretch stale geometry (Tasks 1–2, 6).
- A cached native effect emits no second `effect_ready` event: reuse verified cache readiness without hanging or treating a cold effect as ready (Task 3).
- Home navigation replaces the backdrop root or native BrowserView: remove orphan surfaces and use glass until layer ownership is reverified (Tasks 4–6).

---

## File and interface map

All paths below are relative to `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`.

- `src/menu/frost/types.ts`: wire and adapter contracts; no Steam discovery or DOM work.
- `src/menu/frost/geometry.ts`: measurement, validation and mapping; one coalesced RAF observer.
- `src/menu/frost/context.ts`: read-only owner viewport/game-fit discovery; unknown values remain unsupported.
- `src/menu/frost/backend.ts`: typed RPC transport and active-lease heartbeat.
- `src/menu/frost/home.ts`: three non-interactive backdrop elements in the owner document.
- `src/menu/frost/controller.ts`: presentation generations, readiness and adapter disposal.
- `py_modules/gameglance/frost/contracts.py`: strict request validation and serialized response shapes.
- `py_modules/gameglance/frost/shader.py` and `assets/qam-frost.fx.in`: trusted shader template, allocation planning and atomic staging.
- `py_modules/gameglance/frost/native.py`: narrow ctypes Wayland protocol and X11 property observation.
- `py_modules/gameglance/frost/worker.py`: desktop-session native ownership, request serialization and watchdog.
- `py_modules/gameglance/frost/service.py`: asynchronous Decky-to-worker transport and bounded shutdown.
- Existing coordinator, host, presentation and MenuShell files: lifecycle/geometry wiring only.

### Shared contracts

Define these once in Task 1; Python validation in Task 2 must accept the same JSON representation:

```ts
type RegionId = 'bar' | 'panel' | 'notifications';
type FitMode = 'fit' | 'fill' | 'stretch';
type Region = { x:number; y:number; width:number; height:number; radiusX:number; radiusY:number };
type FrostContext = {
  viewportId:string; background:'game'|'steam'; outputWidth:number; outputHeight:number;
  dpr:number; fit:FitMode; colorMode:'sdr'|'hdr';
};
type FrostFrame = { generation:number; context:FrostContext; regions:Record<RegionId,Region> };
type UnavailableReason = 'unsupported'|'invalid-geometry'|'owned-elsewhere'|'not-ready'|'connection'|'cancelled';
type Prepared = { status:'ready'; key:string } | { status:'unavailable'; reason:UnavailableReason };
type Activated = { status:'active'; token:string } | { status:'unavailable'; reason:UnavailableReason };
interface FrostBridge {
  prepare(requestId:string, frame:FrostFrame):Promise<Prepared>;
  activate(requestId:string, key:string, sequence:number, frame:FrostFrame):Promise<Activated>;
  update(token:string, sequence:number, frame:FrostFrame):Promise<boolean>;
  renew(token:string):Promise<boolean>;
  release(token:string):Promise<void>;
  cancel(requestId:string):Promise<void>;
}
```

Region coordinates/radii are normalized independently by output width/height. `viewportId` is an ephemeral counter, not a title, URL, app name or Steam ID. Real game input dimensions come from shader `BUFFER_WIDTH/HEIGHT`; the frontend must not substitute its window size for them. Unknown fit, output or color context produces no frame. Request IDs combine an ephemeral frontend-session nonce and generation; prepared keys and lease tokens are backend-issued opaque values.

## Task 1: Measured geometry and read-only context

**Files:** Create `src/menu/frost/{types,geometry,context}.ts`; create `tests/menu/frost/{geometry,context}.test.ts`.

**Interfaces:** `measureFrostFrame(input: {generation:number; source:Window; owner:Window; placeholder:HTMLElement; elements:Record<RegionId,HTMLElement>; context:FrostContext}):FrostFrame|null`; `observeFrostFrame(input:Parameters<typeof measureFrostFrame>[0], publish:(frame:FrostFrame|null)=>void):()=>void`; `readFrostContext(owner:Window, viewportId:string):FrostContext|null`.

- [ ] Write failing tests: `maps_transformed_source_through_placeholder` asserts a source rectangle `(100,80,400,200)` in a `1000×500` source, mapped through owner placeholder `(20,10,500,250)` in a `1000×500` owner, becomes `(x=.07,y=.10,width=.20,height=.20)`. `clamps_capsule_in_output_pixels` asserts a 120×40 capsule's radius is at most 20 px on either axis. `invalidates_before_reallocation` asserts resize publishes `null` before a replacement. `coalesces_observers_and_disposes` asserts multiple resize notifications schedule one RAF, and disposal cancels it. Test fractional DPR, independent x/y scaling, missing notification element, NaN, zero dimensions, detached placeholder and unknown fit/color state.
- [ ] Run `pnpm exec vitest run tests/menu/frost/geometry.test.ts tests/menu/frost/context.test.ts`; confirm failures identify missing behavior.
- [ ] Implement the three signatures above. Read rendered bounds and computed radii, map through the placeholder, and validate finite normalized values. Observe all three regions, placeholder and both viewports; invalidate synchronously and coalesce measurement. Use verified native read APIs/store fields for fit and output state; do not guess numeric scaler enums. Remove all listeners on disposal.
- [ ] Rerun the two test files and `pnpm typecheck`; require all checks pass.
- [ ] Commit only Task 1 files: `feat: measure QAM frost regions and context`.

## Task 2: Safe shader generation and packaging

**Files:** Create `py_modules/gameglance/frost/{__init__,contracts,shader}.py`, `py_modules/gameglance/frost/assets/qam-frost.fx.in`, `scripts/frost-check/{check.cpp,build.sh,README.md}`, `scripts/check-frost.py`, `tests/py/test_frost_shader.py`; modify `scripts/package.sh` and `THIRD_PARTY_LICENSES.md` only if attribution requires it.

**Interfaces:** `validate_frame(value: object) -> dict` raises `ValueError`; `build_shader(frame: dict) -> tuple[str, str]` returns trusted FX source and content-derived key; `stage_shader(home: str, source: str, key: str) -> str` returns an owned relative shader name. Shader public uniforms are one `float4 Rect` and one `float Radius` per region (60 bytes with the pinned compiler); zero rectangles disable masks. Fit/output information and allocation sizes belong to the generated context, not unvalidated source text.

- [ ] Write failing pytest cases asserting: extra path/source/effect fields and oversized/non-finite requests are rejected; region positions/radii do not change the compiled allocation key; a region size/context change does; staging never overwrites an unrelated file or follows an unowned symlink. Add compiler checks asserting positive UBO size, exactly one production technique, seven passes and bounded intermediate textures. Include fit/fill/stretch mapping, fractional output scaling and unequal input/output resolutions.
- [ ] Run `python3 -m pytest tests/py/test_frost_shader.py -q`; confirm expected failures.
- [ ] Port the corrected prototype into the trusted template, removing the debug technique. Preserve Gaussian weights `.2270270270`, `.3162162162` at ±`1.3846153846`, and `.0702702703` at ±`3.2307692308`. Use quarter-resolution crops, a 24-displayed-pixel sampling margin converted into input pixels, and a final pass copying original pixels outside exact rounded masks. Compute fit/fill offsets and sampling from real `BUFFER_WIDTH/HEIGHT`; positions update only uniforms. Verify HDR shader format handling against the installed loader; unsupported color formats return unavailable rather than assuming SDR correctness.
- [ ] Implement atomic content-verified staging beneath the desktop user's Gamescope shader directory, with an owned versioned relative filename. Package the template through the existing Python-module copy. Add a reproducible checker pinned to ReShade `696b14cd6006ae9ca174e6164450619ace043283` and SPIRV-Headers `d790ced752b5bfc06b6988baadef6eb2d16bdf96`; never fetch compiler sources during package installation. Let `scripts/check-frost.py --compiler PATH` generate and reflect the matrix.
- [ ] Run pytest and the offline compiler matrix for 1280×800, 1920×1080 and 1920×1200 outputs, lower-resolution game inputs, every fit mode and supported color formats. Require zero errors, positive UBO and crop allocations limited to each padded region; record unsupported formats explicitly.
- [ ] Commit Task 2 files: `feat: package validated cropped QAM frost shader`.

## Task 3: Native ownership and expiring backend leases

**Files:** Create `py_modules/gameglance/frost/{native,worker,service}.py`, `tests/py/test_frost_{native,leases,service}.py`; modify `main.py`.

**Interfaces:** Expose RPCs `frost_prepare(request_id, frame)`, `frost_activate(request_id, key, sequence, frame)`, `frost_update(token, sequence, frame)`, `frost_renew(token)`, `frost_release(token)`, `frost_cancel(request_id)` matching `FrostBridge`. `FrostService(user_home: str, plugin_dir: str)` supplies corresponding async methods and `async close()`. The injectable native boundary provides `snapshot()`, `set_effect(relative_name)`, `select_technique(index)`, `enable()`, `set_uniform(name, bytes)`, `disable()`, `poll(timeout_seconds)` and `close()`; snapshot includes active effect and technique. It exposes no force-composition writer.

- [ ] Write failing fake-clock/native tests for foreign effect rejection, ownership loss during prepare/update/release, cancellation before activation acknowledgement, stale sequence/token rejection, idempotent release, expiry at 1 second, renewal at 250 ms, worker stdin EOF and backend unload. Test that a cold context requires readiness, a previously verified cached context does not require another ready event, and a different context cannot borrow that readiness. Assert no native mutation on malformed RPC and no cleanup mutation after ownership is lost.
- [ ] Run `python3 -m pytest tests/py/test_frost_native.py tests/py/test_frost_leases.py tests/py/test_frost_service.py -q`; confirm failures.
- [ ] Implement `native.py` using the installed version-1 `gamescope_reshade` protocol and system libraries. Discover the desktop session environment using the account owning `decky.DECKY_USER_HOME`, sanitize Decky's library environment using the existing `subprocess_env` behavior, and fail closed when session/ABI/capability cannot be verified. Observe effect/technique properties; distinguish requests sent from actual readiness. Keep native callbacks and blocking polling in the worker.
- [ ] Implement serialized worker commands and the independent 1-second watchdog. Spawn system Python with a fixed module entry point, explicit packaged module path and desktop UID/GID; no shell. Bound JSON lines to 16 KiB and validate all fields before native access. Bound prepared records to 8 with a 30-second TTL. Keep cancelled request tombstones for the worker session; restart the worker safely after 4096 requests, with owned cleanup, rather than discarding cancellation history. Warm with zero masks and technique 0, disable afterward, and cache only confirmed readiness. Recheck ownership before every mutation/restore; clear and disable only the owned effect. Preserve the previous empty-slot technique value only while ownership still matches. Remove staged files only when their owned name and content hash still match; never remove a file another process replaced.
- [ ] Add `FrostService` delegation to Plugin startup/unload and the six narrow RPCs. EOF triggers worker cleanup; close awaits a bounded graceful shutdown before termination. Transport failure returns unavailable and stops renewal. Diagnostics contain category/timing only.
- [ ] Run all Task 3 tests plus `python3 -m pytest tests/py -q`. Require passing tests and inspection confirming no force-composition write exists in the new module.
- [ ] Commit Task 3 files: `feat: manage native QAM frost with expiring leases`.

## Task 4: Home surfaces and generation-aware frontend control

**Files:** Create `src/menu/frost/{backend,home,controller}.ts`, `tests/menu/frost/{backend,home,controller}.test.ts`.

**Interfaces:** `createFrostBridge():FrostBridge`; `createHomeFrost(owner:Document, placeholder:HTMLElement):{apply(frame:FrostFrame):boolean; clear():void; dispose():void}`; `createFrostController({bridge, home, clock}):{begin(generation:number):void; frame(frame:FrostFrame|null):void; presented(generation:number):void; end(generation:number):Promise<void>; dispose():Promise<void>}`. `home` supplies the current verified owner adapter or null; `clock` supplies monotonic timing, intervals and cancellation for tests. The controller owns heartbeat and sequence increments; the transport owns no independent renewal loop.

- [ ] Write failing tests: three bounded Home elements match geometry/radii and have no pointer events or extra tint; no full-viewport filter exists; DOM replacement clears old surfaces. Test late prepare after `presented` leaves glass for that opening, late activation after cancellation is released, stale end cannot clear a newer generation, invalid geometry clears first, resize changes preparation key, and false renewal disables active ownership. Fake-clock test: renewal every 250 ms exists only while active.
- [ ] Run `pnpm exec vitest run tests/menu/frost`; confirm expected failures.
- [ ] Implement typed Decky transport, the Home adapter and controller signatures. Insert surfaces immediately behind the verified native placeholder within the same backdrop root; if ordering/root is ambiguous return false. Match displayed blur strength to the validated game recipe during device acceptance. Freeze each presentation's choice at its visibility boundary: use ready frost or glass; never turn a slow prepare completion into a late visible blur. A later opening can use the prepared cache. Switching adapters clears the previous adapter first. Cancel request IDs even when no lease token has arrived, and release late tokens without mutating the current generation.
- [ ] Rerun frost tests and `pnpm typecheck`; require passing checks.
- [ ] Commit Task 4 files: `feat: control bounded Home and game QAM frost`.

## Task 5: Integrate existing menu presentation and teardown

**Files:** Modify `src/menu/{startMenu,coordinator,presentation}.ts`, `src/menu/host.tsx`, `src/menu/steam/runtime.ts`, `src/menu/components/MenuShell.tsx`; extend `tests/menu/{coordinator,presentation}.test.ts` and add `tests/menu/frost/integration.test.ts`.

**Interfaces:** Extend `HostAttachment` with optional `setFrostSession(session:{generation:number; enabled:boolean}|null):void` and `clearFrost(generation:number):Promise<void>`. Existing host methods retain their signatures. The coordinator passes its existing generation and enables frost only for custom-open `quick-access`. The host owns measurement/controller lifetime and marks `presented` at the existing presentation visibility gate.

- [ ] Write failing integration tests for open/close/reopen, close during pending present/activation, native handoff, unexpected native close, game context change, disabled menu, host failure and plugin disposal. Assert `clearFrost(oldGeneration)` is invoked before host teardown, all pending requests are cancelled, late completion cannot affect the new generation, and a broken adapter still permits normal menu opening. Assert native main menu and status pills receive no frost surfaces.
- [ ] Run `pnpm exec vitest run tests/menu/coordinator.test.ts tests/menu/presentation.test.ts tests/menu/frost/integration.test.ts`; confirm failures.
- [ ] Wire actual MenuShell region elements through scoped data attributes, without changing its focus graph. Start measurement only with verified source/owner/placeholder documents. Feed context changes through the host; clear the old adapter before rebuilding. Invoke immediate Home clear and backend cancellation before normal close/handoff teardown; allow at most 100 ms for release acknowledgement without hanging navigation. Test the timeout using fake time. If acknowledgement is lost, cease renewal and retain glass; the backend watchdog remains the final crash bound. Preserve existing generation checks around conceal so an old close cannot hide a reopened menu.
- [ ] Rerun menu tests, `pnpm typecheck`, full `pnpm test` and `pnpm build`; require all passing. Confirm inherited Social scrolling/focus/header behavior and 75% styles are unchanged by the wiring.
- [ ] Commit only integration files: `feat: bind QAM frost to menu presentation lifecycle`.

## Task 6: Package verification and Ally acceptance

**Files:** Extend `docs/validation/qam-vdl.md` with a dated frost section, preserving existing entries; create `docs/validation/qam-region-frost-2026-10-27.md` for the matrix, timings, limitations and rollback information.

- [ ] Run all frontend/Python checks and the pinned compiler matrix after the last change. Run `bash scripts/package.sh`; inspect ZIP for the FX template, all frost Python modules, correct frontend and no captures/cache/debug-only shaders. Record exact artifact SHA and Git revision.
- [ ] Verify the Ally is updating normally and identify its current preview build. Back up installed plugin files and fingerprint settings without printing their contents. Install the locally verified preview under the existing device-install authorization; do not publish it. Record restore commands before activation.
- [ ] Validate native effect preparation and cached reopening with the global force-composition value untouched. Verify masks/foreground in-game first; then verify the separate Home backdrop root. A fallback is a usable result but does not pass the corresponding frost acceptance check.
- [ ] Exercise rapid open/close, native handoff, context switch, resize, plugin reload, interrupted RPC and a controlled competing effect. Confirm both ownership handoff directions preserve the other owner's state. Check 16:9, 16:10, output scaling, fit/fill/stretch, lower game render resolution and HDR; record unsupported cases explicitly. Change only temporary test context with user consent where needed and restore it afterward; never alter performance settings to improve results.
- [ ] Compare glass and frost in the same workload: unique UI-frame intervals and input-to-focus-paint distributions; native GPU timing if available. Do not infer UI FPS from repeated display presents. Record compilation latency separately from warm opening latency and note unavailable measurements.
- [ ] Record opening/closing only while Quick settings is visible with Social and Home feed closed, under existing capture authorization. Inspect for blur-only frames, delayed blur, edge artifacts, close flash and residue. Obtain the user's navigation/transition acceptance; regressions require another implementation iteration, not a completion claim.
- [ ] Run one fresh whole-change code review using the selected execution workflow, resolve findings, and repeat only checks affected by changes. Commit validation documentation after removing private identifiers/captures from tracked material. Report remaining device gaps plainly; do not call the feature release-ready while acceptance remains open.

## Self-review coverage

Geometry and fit: Tasks 1–2. Cropped shader and positive UBO: Task 2. Native ownership, cancellation, expiry and unload: Task 3. Home bounded surfaces, late readiness and fallback: Task 4. Menu presentation, focus preservation and generation teardown: Task 5. Actual layering, transitions, native cache behavior, HDR/scaling and measured performance: Task 6. The design's acceptance checks 1–8 are represented; successful local tests alone satisfy none of the outstanding device claims.

## Execution handoff

Recommend **Native / inline** execution: these six tasks share geometry, lease and presentation interfaces, and keeping one implementer through the integration reduces interface drift. Perform one fresh independent review at the end. **Subagent-driven** execution is also available, with a fresh implementer/reviewer per task and a final whole-change review.

Implementation starts after the user reviews this plan and selects the execution method.
