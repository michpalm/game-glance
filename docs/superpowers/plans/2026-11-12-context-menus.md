# Context menus in the Game Glance look — Implementation Plan (revision 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep A (every Steam context menu restyled) and replace revision 1's card with the mock-up's B: Game Glance's own game-menu panel built from Steam's own items.

**Architecture:** The `CreateContextMenuInstance` patch swaps Steam's `AppActionsMenu` element for `GameMenuPanel` (same props). `GameMenuPanel` calls `AppActionsMenu` inline to get Steam's `<Rt …/>` and renders it with a marker prop; a one-time `afterPatch` on `Rt.prototype.render` turns a marked render's tree into a model (`reshapeGameMenu`) and returns `GameMenuView` instead. `Rt` is a MobX observer, so the view re-renders when favorites or collections change. Rows are Steam's own `MenuItem` (`kt`) inside Steam's own `MenuRoot` (`tz`), so focus, sounds and closing stay Steam's.

**Tech Stack:** TypeScript, React (Steam's), @decky/ui (`beforePatch`, `afterPatch`), vitest + linkedom.

**Spec:** `docs/superpowers/specs/2026-11-12-context-menus-design.md` (revision 2)

## State at the start

Revision 1's Tasks 1, 2, 4 and 5 are done and uncommitted (ledger `.superpowers/sdd/2026-11-12-context-menus/progress.md`): `menuClasses`, `menuCss` (with the device-corrected layers: clear `BasicUIContextMenu`, box on `BasicContextMenuContainer`, `ModalOverlayBackground` cleared, `active`, `.disabled`), `applyMenuStyle`/`menuStyled`, `gate`, `keepTrying`, `ContextMenusHost`, `menuPatch` (`wrapGameMenu`, `installGameMenuPatchOn`, `findMenuManager`), the toggle copy. Revision 1's Task 3 (`GameMenuCard`) is replaced here; `cardModel` stays for the eyebrow.

## Global Constraints

- Steam's game menu (probed 2026-11-12): `AppActionsMenu(props)` = `He(props)` returns `<Rt navigator instance {...props}/>`. `Rt.prototype.render` returns `<tz label={name}>` with children in this order: `[0]` primary (false for us), `[1]` `additionalActions`, `[2]` Remove from Favorites `kt` | false, `[3]` Add to Favorites `kt` | false, `[4]` Add to `Vs` | false (children: `kt` keyed `add-to-<id>` with `disabled` when already in, `K5` `add-all-to-new-separator`, `kt` `add-all-to-new`), `[5]` Remove from `Vs` | false (`kt` keyed `remove-from-<id>`), `[6]` family element, `[7]` Manage `Vs` | false, `[8]` Developer element (builds its own `Vs`), `[9]` Fragment(`K5`, Properties `kt`) | false.
- Steam's `kt` (MenuItem): `onSelected(e)` then `instance.ForceHide()` unless `bInteractableItem` (then only `onClick` runs); props `disabled`, `selected`, `preferredFocus`, `className` pass to its Focusable. `tz` (MenuRoot) takes `onCancel`.
- A shape that does not match (types, keys, array length 10) → `reshapeGameMenu` returns null → Steam's menu with A's look.
- Look (canvas px × `var(--gg-ctx-u, 1)`): panel 540 wide; art 150 tall, cover, fade `linear-gradient(transparent 30%, rgba(8,10,14,.85))`, eyebrow 13 (700, .2em, uppercase, 75%) and name 25 (700) over its foot, 24 from the sides; rows 58 tall, 21 type, 16 gap, 20 side padding, icon 22 at 90%; checkbox 24, 7 corners, 2 px `rgba(255,255,255,.55)` edge, on = white fill with a dark tick; end text 55%; separator before Change Artwork / Properties; page header: ‹ at 70%, eyebrow (the game) and the page name 24 (700).
- Icons (inline SVG, stroke 2, the mock-up's paths): Favorite star, Collections folder, Manage wrench, Developer code, Properties gear, New collection plus. Steam's other items: no icon.
- **Ruling (spec deviation): Developer stays Steam's own submenu (cascades), with our icon** — its items are built inside Steam's own component, so the panel cannot list them; it keeps A's look. Michael to confirm on the device.
- CEF probes read-only. Commit only on Michael's word; identity `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A Steam update changes the tree (an extra child, a moved slot): the reshape must return null and Steam's menu must open, not a half panel.
2. A game in no collection, in every collection, with no user collections at all, or not favorite / favorite.
3. B on a page goes back (not closing the menu); B on the main list closes; focus lands on the row that opened the page.
4. A checkbox press keeps the menu open and the box flips when the store changes; an action press (Uninstall, Properties) closes it.
5. Several menus in a row (Home's gear, then Library): the render patch is installed once and only marked renders are reshaped.

---

### Task 1: The reshape (pure)

**Files:** Create `src/contextMenus/reshape.ts`; Test `tests/contextMenus/reshape.test.ts`

**Interfaces — Produces:**
```ts
type Item = ReactElement;                     // a Steam kt element
type Collection = { id: string; name: string; inIt: boolean; add: Item; remove: Item | null };
type GameMenuModel = {
  name: string;
  favorite: { on: boolean; item: Item } | null;
  collections: { list: Collection[]; newCollection: Item | null } | null;
  manage: { label: ReactNode; items: ReactNode[] } | null;
  rest: ReactNode[];                           // [1] additionalActions, [6] family, [8] developer, in order, as Steam's
  properties: Item | null;
  types: { kt: unknown; K5: unknown };         // Steam's components, for our rows
};
reshapeGameMenu(root: unknown): GameMenuModel | null
```

- [ ] **Step 1: Failing tests** with a fixture builder `steamTree({fav, collections:[{id,name,in}], manage, props})` making elements of fake `tz`, `kt`, `Vs`, `K5` in the exact order of Global Constraints:
  - favorite: `[2]` present → `{on:true, item: that kt}`; `[3]` present → `on:false`.
  - collections: Add to's `add-to-<id>` items become `list` (name = the item's children), `inIt` true when `remove-from-<id>` exists (its item in `remove`); `newCollection` = `add-all-to-new`; no Add to `Vs` → `collections: null`.
  - manage: `[7]` → `{label, items: its children}`; false → null.
  - rest: `[1]`, `[6]`, `[8]` kept in order (falsy ones dropped); properties = `[9]`'s `kt`.
  - shape guard: root not an element, children length ≠ 10, `[4]` not a `Vs` with a `kt` keyed `add-all-to-new`, or `[9]` without a `kt` → `null`; never throws (a getter that throws → null).
- [ ] **Step 2:** `npx vitest run tests/contextMenus/reshape.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `reshapeGameMenu`: `Vs` and `kt` are recognised by shape (`Vs` = element with `label` and array `children`; `kt` = the type of `[9]`'s last child, then required for all items), not by identity.
- [ ] **Step 4:** Same command → PASS.

### Task 2: The render patch and the panel's entry

**Files:** Create `src/contextMenus/GameMenuPanel.tsx`; Modify `src/contextMenus/menuPatch.ts` (`wrapGameMenu` → `swapGameMenu`), `src/contextMenus/ContextMenusHost.tsx`; Test `tests/contextMenus/menuPatch.test.ts`, `tests/contextMenus/panelPatch.test.ts`

**Interfaces — Consumes:** Task 1's `reshapeGameMenu`. **Produces:** `swapGameMenu(element, appActionsMenu, Panel): unknown` (same element props, type `Panel`, only for `appActionsMenu` with a positive `overview.appid`); `PANEL_MARK = '__ggPanel'`; `installPanelRenderPatchOn(Rt): () => void` (idempotent; `afterPatch(Rt.prototype,'render', …)`: when `this.props[PANEL_MARK]` and the reshape is non-null → `<GameMenuView model={…} instance={this.props.instance} overview={this.props.overview}/>`, else Steam's tree); `GameMenuPanel(props)`: `const inner = appActionsMenu(props)` (hooks run inline), installs the render patch on `inner.type` once, returns `cloneElement(inner, { [PANEL_MARK]: true })`; on any throw → `createElement(appActionsMenu, props)`.

- [ ] **Step 1: Failing tests:** `swapGameMenu` as revision 1's `wrapGameMenu` cases (pass-through for others, `appid` 0, null, missing component), the swapped element keeps every prop; `installPanelRenderPatchOn` with a fake class `Rt { render(){ return steamTree(...) } }`: marked instance → a `GameMenuView` element with the model; unmarked → Steam's tree (`toBe`); reshape null → Steam's tree; installing twice patches once; the remover restores.
- [ ] **Step 2:** `npx vitest run tests/contextMenus` → FAIL.
- [ ] **Step 3: Implement**; the host's patch install passes `GameMenuPanel` (revision 1's `GameMenuCard` is deleted with its tests and CSS).
- [ ] **Step 4:** Same command → PASS.

### Task 3: The view

**Files:** Create `src/contextMenus/GameMenuView.tsx`, `src/contextMenus/icons.tsx`, `src/contextMenus/viewRows.ts`; Modify `src/contextMenus/menuCss.ts`; Test `tests/contextMenus/viewRows.test.ts`, `tests/contextMenus/menuCss.test.ts`

**Interfaces — Produces:** `viewRows(model, page: 'main'|'collections'|'manage'): Row[]` (pure), `Row = { key: string; kind: 'check'|'page'|'steam'|'separator'; label?: ReactNode; icon?: IconName; end?: string; on?: boolean; run?: Item; page?: 'collections'|'manage'; element?: ReactNode }`; `collectionsEnd(list): string` (`''`, the first in-name, or `"<first> +N"`).

- [ ] **Step 1: Failing tests (`viewRows`):** main = Favorite (check, star, on), Collections (page, folder, end from `collectionsEnd`), Manage (page, wrench), `rest` as steam rows (Developer gets the code icon: the last `rest` entry from `[8]`), separator, Properties (steam, gear); missing parts are left out; collections page = one check row per collection (`on = inIt`) + separator + New collection (steam, plus); manage page = Steam's items as steam rows. `collectionsEnd`: none → `''`, one → its name, three → `"Backlog +2"`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implement** `GameMenuView`: `<tz onCancel={page==='main' ? undefined : back}>` with the header (art from `resolveArt`, eyebrow from `cardModel`, name; on a page the back header) and the rows. A check row = `<kt bInteractableItem onClick={e => (on ? item.remove : item.add).props.onSelected(e)}>` (Favorite: the favorite item's `onSelected`); a page row = `<kt bInteractableItem onClick={() => open(page)}>`; a steam row = Steam's own element as given (Properties and Manage's items close the menu themselves). Opening a page remembers the row; going back sets `preferredFocus` on it. CSS rules for `.gg-gm-*` classes per Global Constraints' look, scoped under `.FullModalOverlay:has(.BasicUIContextMenu)`, plus the title hide when `.gg-gm` is present.
- [ ] **Step 4:** PASS; `npx tsc --noEmit -p .` clean.

### Task 4: Build, install, check on the Ally

- [ ] **Step 1:** `npx vitest run` all pass; `tsc` clean; `npm run build` exit 0.
- [ ] **Step 2:** Install (backup, scp, `importPlugin`). Read-only: the open game menu has `.gg-gm`; other menus do not.
- [ ] **Step 3: With Michael:** the game menu from Home's gear, the game page and Library; Favorite on/off (menu stays open); Collections add/remove (stays open), New collection…; Manage page and B back (focus on Manage); Developer cascade (confirm the ruling); Properties; B closes on the main list; a collection's and a friend's menu keep A's look; Restyle off and on; handheld and docked.
- [ ] **Step 4:** Ledger; commit only on Michael's word.
