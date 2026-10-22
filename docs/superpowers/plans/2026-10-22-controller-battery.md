# Controller Battery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each connected Bluetooth controller's battery (from BlueZ) in Spotlight Home's status pill.

**Architecture:** The Python backend reads BlueZ's object tree with `busctl` and returns `[{name, percent}]` for connected gamepads. `home/statusStore.ts` polls that callable every 60 s while a status bar is subscribed and exposes it next to the system battery. `StatusBar.tsx` renders one item per controller, lowest first, at most two, then `+n`.

**Tech Stack:** Python 3 (Decky backend, `subprocess`, `json`), TypeScript/React (`@decky/api` `callable`), Vitest, pytest.

**Spec:** `docs/superpowers/specs/2026-10-22-controller-battery-design.md` (approved 2026-10-22, with mockup: one item per controller, lowest first, at most two then `+n`). Evidence: `docs/validation/3.5.0-controller-battery.md`.

## Global Constraints

- Source is BlueZ `org.bluez.Battery1.Percentage` only. Never use `ControllerStore.ucBatteryLevel` (placeholder 100).
- Command: `busctl --system --json=short call org.bluez / org.freedesktop.DBus.ObjectManager GetManagedObjects`, timeout 2 s. No new Python dependency.
- Keep a device only if `org.bluez.Device1.Connected` is true, `Icon` starts with `input-gaming`, and `Battery1.Percentage` is present.
- No MAC address, object path or serial in the callable's result or in logs.
- Any backend failure returns `[]`. No reading → nothing shown; never a placeholder percentage. No charging indicator.
- Poll interval `60_000` ms, only while at least one status bar listener is subscribed.
- Low at or below `LOW_BATTERY` (0.2 → 20%), coloured like the system battery (`gh-status-low`).
- Order: lowest percent first, then name. Show at most 2 items; with 3 or more, the second item is followed by `+n` (n = hidden count).
- Placement: in the pill before the system battery item.
- Accessible label per item: `${name}, ${tr('battery', [percent])}`.

## Review Focus

1. A controller disconnecting while Home is open: its item disappears at the next poll, no stale value. (Task 3 test)
2. `busctl` slow or hanging: polls must not pile up; a poll is skipped while one is in flight. (Task 3 test)
3. Odd BlueZ values: percent missing, non-integer, above 100 or negative → device dropped or clamped, never `NaN%`. (Tasks 1 and 2 tests)
4. A device with an empty or missing `Name`: shown with the label `Controller`. (Task 1 test)
5. Plugin unload: the poll timer stops and state clears. (Task 3 test)

---

### Task 1: Backend BlueZ reader

**Files:**
- Create: `py_modules/gameglance/bluetooth.py`
- Modify: `main.py` (import, new `Plugin.get_controller_batteries`)
- Test: `tests/py/test_bluetooth.py`

**Interfaces:**
- Produces: `parse_controllers(managed: dict) -> list[dict]` (pure; input is the `data[0]` object of busctl's JSON), `read_controllers(run=subprocess.run) -> list[dict]`, and backend callable `get_controller_batteries` returning `[{"name": str, "percent": int}]`.

- [ ] **Step 1: Write the failing tests** with a sanitized fixture shaped like busctl's `--json=short` output (`{"type": ..., "data": ...}` per property; paths like `/org/bluez/hci0/dev_X`):

```python
def test_keeps_connected_gamepads_with_a_battery():
    assert parse_controllers(FIXTURE) == [{"name": "8BitDo Ultimate 2C Wireless", "percent": 17}]

def test_drops_disconnected_mice_and_controllers_without_battery():
    # FIXTURE also holds: a disconnected gamepad with Battery1, a connected mouse (input-mouse) with Battery1,
    # a connected gamepad without Battery1 — none appear.
    names = [c["name"] for c in parse_controllers(FIXTURE)]
    assert names == ["8BitDo Ultimate 2C Wireless"]

def test_missing_name_is_controller():
    assert parse_controllers(nameless_fixture())[0]["name"] == "Controller"

def test_percent_out_of_range_is_clamped_and_non_numbers_dropped():
    assert [c["percent"] for c in parse_controllers(odd_percent_fixture())] == [0, 100]  # -5 and 140 clamped; "x" dropped

def test_result_has_no_addresses():
    assert all(set(c) == {"name", "percent"} for c in parse_controllers(FIXTURE))

def test_command_failure_timeout_or_bad_json_is_empty():
    assert read_controllers(run=raising(FileNotFoundError)) == []
    assert read_controllers(run=raising(subprocess.TimeoutExpired("busctl", 2))) == []
    assert read_controllers(run=returning(stdout="not json", returncode=0)) == []
    assert read_controllers(run=returning(stdout="", returncode=1)) == []
```

- [ ] **Step 2: Run:** `../game-glance-2.1/.venv/bin/pytest -q tests/py/test_bluetooth.py` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `parse_controllers` and `read_controllers` in `py_modules/gameglance/bluetooth.py`. `read_controllers` calls `run(["busctl", "--system", "--json=short", "call", "org.bluez", "/", "org.freedesktop.DBus.ObjectManager", "GetManagedObjects"], capture_output=True, text=True, timeout=2)`, parses `json.loads(stdout)["data"][0]`, and catches every exception into `[]`. Sorting is the frontend's job.

- [ ] **Step 4: Add** `async def get_controller_batteries(self)` to `Plugin` in `main.py`, following `get_lutris_playtime`'s try/except/`decky.logger.exception` pattern, returning `read_controllers()` or `[]`. Log no device data.

- [ ] **Step 5: Run:** `../game-glance-2.1/.venv/bin/pytest -q` — Expected: all pass.

- [ ] **Step 6: Commit** `feat: read Bluetooth controller batteries from BlueZ`.

### Task 2: Pure view logic

**Files:**
- Modify: `src/home/statusItems.ts`
- Test: `tests/home/statusItems.test.ts`

**Interfaces:**
- Produces: `interface ControllerBatteryView { name: string; percent: number; low: boolean }`, `readControllerBatteries(raw: unknown): ControllerBatteryView[]` (validates, rounds and clamps 0–100, drops bad entries, sorts lowest percent then name), `controllerItems(list: ControllerBatteryView[], max = 2): { shown: ControllerBatteryView[]; more: number }`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('sorts lowest first, then by name, and marks low at 20 but not 21', () => {
    expect(readControllerBatteries([{ name: 'B', percent: 21 }, { name: 'A', percent: 20 }, { name: 'C', percent: 20 }]))
        .toEqual([{ name: 'A', percent: 20, low: true }, { name: 'C', percent: 20, low: true }, { name: 'B', percent: 21, low: false }]);
});
it('drops entries without a numeric percent and anything that is not a list', () => {
    expect(readControllerBatteries([{ name: 'A', percent: 'x' }, null, { percent: 50 }])).toEqual([{ name: 'Controller', percent: 50, low: false }]);
    expect(readControllerBatteries(null)).toEqual([]);
});
it('shows at most two and counts the rest', () => {
    const list = readControllerBatteries([{ name: 'A', percent: 10 }, { name: 'B', percent: 50 }, { name: 'C', percent: 90 }]);
    expect(controllerItems(list)).toEqual({ shown: list.slice(0, 2), more: 1 });
    expect(controllerItems(list.slice(0, 1))).toEqual({ shown: list.slice(0, 1), more: 0 });
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/home/statusItems.test.ts` — Expected: FAIL (not exported).
- [ ] **Step 3: Implement** both functions in `statusItems.ts`, reusing `LOW_BATTERY` (`percent <= LOW_BATTERY * 100`).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat: controller battery view logic`.

### Task 3: Shared store polling

**Files:**
- Modify: `src/home/statusStore.ts`
- Test: `tests/home/statusStore.test.ts`

**Interfaces:**
- Consumes: `readControllerBatteries` (Task 2); backend callable `get_controller_batteries` (Task 1) via `callable<[], unknown>('get_controller_batteries')` from `@decky/api`, mocked in tests the way `tests/data` mocks `callable`.
- Produces: `StatusState.controllers: ControllerBatteryView[]` (initially `[]`), `export const CONTROLLER_POLL_MS = 60_000`.

- [ ] **Step 1: Write the failing tests** (fake timers):
  - `reads once when the first listener subscribes, then every CONTROLLER_POLL_MS` — callable called 1×, then 2× after advancing 60 000 ms.
  - `stops polling when the last listener unsubscribes` — no further calls after unsubscribe + 120 000 ms.
  - `does not start a poll while one is in flight` — callable returns a never-settling promise; advancing 180 000 ms keeps the count at 1.
  - `drops a disconnected controller on the next poll` — first `[{name:'A',percent:17}]`, then `[]`; `statusState().controllers` ends `[]`.
  - `notifies only when the list changes` — same result twice → listener called once.
  - `stopStatus clears controllers and the timer` — after `stopStatus()`, `controllers` is `[]` and no calls follow.
- [ ] **Step 2: Run:** `npx vitest run tests/home/statusStore.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement:** start the timer in `subscribeStatus` when `listeners.size` goes 0 → 1, clear it when it returns to 0 and in `stopStatus`. An in-flight flag skips overlapping polls. Include `controllers` in `refresh()`'s equality check (compare length and each `name`/`percent`). Wrap the call in the existing `guard`; a rejection keeps the last list.
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat: poll controller batteries while a status bar is shown`.

### Task 4: Status pill rendering

**Files:**
- Modify: `src/home/StatusBar.tsx`, `src/home/homeCss.ts` (only if `+n` needs a rule)
- Test: `tests/home/StatusBar.test.tsx` (create if absent; follow existing component tests' render helper)

**Interfaces:**
- Consumes: `statusState().controllers`, `controllerItems` (Task 2).

- [ ] **Step 1: Write the failing tests:**
  - With `controllers: [{name:'8BitDo', percent:17, low:true}]`: one item before the system battery item, text `17%`, class `gh-status-low`, `aria-label` `8BitDo, Battery 17%`.
  - With three controllers: two items, then an element with text `+1`.
  - With `controllers: []`: no controller item.
- [ ] **Step 2: Run:** `npx vitest run tests/home/StatusBar.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** a `GamepadIcon` (24×24 viewBox, `stroke="currentColor"` `strokeWidth={2}`, same style as `WifiIcon`: rounded body with two grips, a d-pad cross and two buttons) and render each shown controller as `<span className={`gh-status-item${c.low ? ' gh-status-low' : ''}`} aria-label=...><GamepadIcon />{c.percent}%</span>` before the battery item, then `+{more}` in a plain `gh-status-item` when `more > 0`.
- [ ] **Step 4: Run** the same command, then `npx vitest run && npx tsc --noEmit && npm run -s build` — Expected: all pass.
- [ ] **Step 5: Commit** `feat: controller battery in the status pill`.

### Task 5: Device check and docs

**Files:**
- Modify: `docs/device-checklist.md` (3.5.0 section: new row "Controller battery"), `docs/features.md` (status bar entry, labelled in development), `docs/validation/3.5.0-controller-battery.md` (results).

- [ ] **Step 1:** Install the dev build on the Ally only with the user's go-ahead for that install (back up the installed plugin first, as on 2026-10-22).
- [ ] **Step 2:** With the 8BitDo connected over Bluetooth, check the pill matches Steam's Bluetooth settings percent within one poll; turn the controller off and check the item disappears within 60 s; reconnect and check it returns. The built-in controller must never appear.
- [ ] **Step 3:** Record results in the three docs, then run `git diff --check`.
- [ ] **Step 4: Commit** `docs: controller battery device results`.
