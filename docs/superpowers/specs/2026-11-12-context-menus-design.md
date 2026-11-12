# Steam's context menus in the Game Glance look — design

Date: 2026-11-12. Status: **revision 2**, built and Ally-checked (see Device findings).
Mock-up (Michael's Bazzite folder), painted on real Ally frames: `game-menu-options.html` (A "Restyled", B "Game card").

## Revision note

Revision 1 built B as "a card around Steam's own menu": Steam's rows kept as they are. On the Ally (2026-11-12) Michael
found it too far from the mock-up: no Favorite checkbox, Add to and Remove from still separate, no icons, and a black
background. The B question had been answered without a painted frame of that option. Revision 2 makes B the mock-up's B.
A (every other context menu) and the hook carry over; A's layers are corrected from the device.

## Goal

Steam's context menus look like Game Glance's own menu instead of Steam's flat dark box with a white bar (A), and the
game menu becomes Game Glance's game card from the mock-up (B).

## Decisions (Michael, 2026-11-12)

| Question | Answer |
|---|---|
| Scope | The context menus and their submenus. Properties… still opens Steam's Properties page, unchanged. |
| Direction | A for every context menu (restyled in place), plus B for the game menu. |
| When | With the existing **Restyle Steam Settings** toggle (needs the Game Glance menu on). |
| Where B applies | Everywhere Steam opens the game menu: Home's gear, the game page's gear, Library, anything else. |
| B | **The mock-up's B**: Game Glance's own panel. Art with the name on it; Favorite as a checkbox; one Collections page of checkboxes; icons; submenus open in place with a back header; no Cancel (B closes). Every action is still Steam's own. |

## What Steam builds (probed on the Ally, 2026-11-12, read-only)

**Layers (gamepad mode).** `FullModalOverlay` (dim) > `ModalOverlayContent ModalOverlayBackground` (Steam's own dim:
85% black, 3 px blur) and `ModalOverlayContent active` > … > `BasicUIContextMenu` (= class key `BasicContextMenuModal`: a
**full-screen layer**, not the box) > `BasicContextMenuHeader` (the title) and `BasicContextMenuContainer` (the box,
`max-width: 70%`) > `contextMenuContents` (the list, 280 px) > rows. A submenu is a second list inside the same container.
Rows: `contextMenuItem`; disabled = plain class `disabled` + attribute `disabled`; the row whose submenu is open = key
`active`; separators `ContextMenuSeparator`.

**The hook.** Every context menu goes through the manager class's `CreateContextMenuInstance(element, target, x, y,
options)`, which stores the element (`new HP(this, element, …)`); submenus go through it too.

**The game menu.** `AppActionsMenu` (`uU`) is a function `He(props)` that renders `<Rt navigator instance {...props}/>`:
`Rt` is a class whose `render` returns one `MenuRoot` (`U.tz`, label = the game's name) whose children are, in order:
1. the primary action (omitted for us: `omitPrimaryAction`), 2. `additionalActions`, 3. Remove from Favorites, 4. Add to
Favorites (`U.kt` items; `collectionStore.BIsFavorite`, `SetAppsAsFavorite(apps, bool)`), 5. Add to › and 6. Remove from ›
(`U.Vs` submenus; from `GetCollectionManagementActions`: `collectionStore.userCollections` without system/partner ones,
`AsDragDropCollection().AddApps/RemoveApps(apps)`, keys `add-to-<id>`, `remove-from-<id>`, `add-all-to-new`), 7. family
items, 8. Manage › (`BuildManageSubmenu`; keys `Uninstall`, `AddDesktopShortcut`, `BackupFiles`, `RemoveShortcut`, …),
9. Developer › (keys `ClearProton`, `ClearSelectedControllerConfig`), 10. separator + Properties….

## A: every context menu restyled

One stylesheet in the Game Glance tokens, into Big Picture's document:

| Part | Look |
|---|---|
| Steam's full-screen layer (`BasicUIContextMenu`) | Clear (no background). |
| Steam's own dim (`ModalOverlayBackground`) | Cleared; ours replaces it. |
| Dim (the overlay) | `rgba(5,7,10,.38)` + 6 px blur, so the screen behind stays readable. |
| Box (`BasicContextMenuContainer`) | `.40` glass + 16 px blur, 1 px `rgba(255,255,255,.12)` edge, 16 px corners, 8 px padding. |
| Row | 12 px corners, 90% white labels with the label shadow. |
| Focused row | Soft fill `rgba(255,255,255,.12)` + 2 px white inset ring (`focusRing('slice')`). |
| Open parent (`active`) | Quiet fill `rgba(255,255,255,.08)`. |
| Disabled | 45% opacity (`.disabled`, `[disabled]`). |
| Separator | 1 px at 10% white, inset 14 px. |
| Title | White, 700. |

Every length is canvas px × `--gg-ctx-u` (Home's canvas scale). A part whose class is missing keeps Steam's look. A has no
icons: other menus' rows are not known in advance, and matching their text breaks in other languages.

## B: the game menu, Game Glance's panel

**Hook.** The same `CreateContextMenuInstance` patch replaces the `AppActionsMenu` element with `<GameMenuPanel
appMenu={the original element}/>`, only in a window that carries A's stylesheet.

**Steam's items, our layout.** `GameMenuPanel` renders `He(props)` inline (it is a function component; its hooks run in our
render) to get Steam's `<Rt …/>`, and asks `Rt` for its tree through an `afterPatch` on `Rt.prototype.render`, installed
once and only reshaping trees rendered inside the panel (a marker prop). The reshape reads the `MenuRoot`'s children by
the shape listed above, checked by type and key; **if the shape does not match, the panel shows Steam's own menu with A's
look** (never a broken menu). From the tree it takes:

- **Favorite**: one row with a checkbox, on when `collectionStore.BIsFavorite(appid)`; selecting it calls Steam's own
  Remove/Add to Favorites item's `onSelected` (so Steam's action runs), and the checkbox flips.
- **Collections ›**: one row, its end text the collections the game is in (the first, "+N" if more). It opens the
  Collections page in place: every user collection from Add to's items as a checkbox row (on when it is in Remove from's
  items), selecting one runs that Steam item's `onSelected` (`AddApps`/`RemoveApps`), and **New collection…** (Steam's
  `add-all-to-new` item) at the foot.
- **Manage ›** and **Developer ›**: rows that open their page in place, listing Steam's own items from those submenus.
- **Family items** (when Steam has them), **Change Artwork…** where Steam shows it, and **Properties…**: Steam's own items,
  kept in Steam's order.
- **No Cancel**: B closes, as the hint says.

**Look.** As the mock-up: a `.40` glass card 1.5× Steam's width (540 of a 1920 frame, in `--gg-ctx-u`); the art (library
hero, else capsule) 150 tall across the top with a fade, the eyebrow (Home's wording: "Last played · Today", "No play
time") and the name over the art's foot; rows 58 tall with a 22 px icon (Favorite star, Collections folder, Manage wrench,
Developer code, Change Artwork image, Properties gear; Steam's other items without one); checkboxes 24 px, 7 px corners,
white when on; end texts at 55%; a separator before Change Artwork. A page has a back header (‹, the game as eyebrow, the
page's name) in place of the art.

**Navigation.** The panel is one focus group inside Steam's menu. A on a page row opens the page; B on a page goes back to
the main list (focus returns to the row that opened it); B on the main list closes the menu (Steam's). Our rows call
Steam's `onSelected` with the row's own activate event (some of Steam's actions find their window from the event, e.g. New
collection…). An action row then closes the menu through the menu instance Steam passes to `Rt` (`instance`), as Steam's
own item does; Favorite and collection checkboxes keep the menu open (the row re-renders from the store).

## Failure handling

Anything missing means Steam's menu with A's look, never a menu that fails to open: the manager class, `AppActionsMenu`,
`Rt` or the tree shape not found; an element without an `overview`; art that fails (the header shows the name without art);
an error inside the patch or the reshape (the original goes through). The patches are installed once and removed with the
toggle or on unload.

## Testing

- **Reshape (pure):** a fixture tree in Steam's shape → Favorite on/off, Collections with in/out and the end text, Manage and
  Developer pages, Properties, family items kept; a tree that does not match → null (Steam's menu).
- **Panel:** main list and each page from a reshaped model; back returns focus; selecting a checkbox runs Steam's
  `onSelected` and keeps the panel open.
- **Hook, A's CSS, toggle copy:** as revision 1, plus the layers above.
- **On the Ally (handheld and docked):** the game menu from Home's gear, the game page and Library; Favorite on and off;
  Collections add and remove and New collection…; Manage and Developer pages and back; B closes; other menus keep A's look;
  Restyle off and on.

## Device findings (Ally, 2026-11-12)

Every hand check passed: Favorite and collection checkboxes keep the menu open and flip; Collections, Manage and
Developer pages open in place and B goes back with focus on the row that opened them; B on the main list closes;
Properties… opens Steam's page; other menus keep A's look. What the build had to learn on the way:

- **`Rt` is a MobX observer:** only its first render goes through the prototype, later ones through a sealed reactive
  `render` it defines on the instance. The panel's render patch wraps that definition, so later renders (a checkbox
  flipping) are reshaped too.
- **SteamGridDB** patches the same render and adds an 11th child (Change Artwork…), and its own afterPatch reads Steam's
  tree: the reshape accepts 10 or more children, keeps the extras after Developer (an image icon for artwork), and the
  first render is reshaped only after the whole patch chain ran.
- **B on a page:** Steam's MenuRoot runs its `onCancel` and then always hides the menu, so a page's rows sit in a focus
  group of their own that catches B, goes back and stops it there.
- **Developer in place:** Steam's Developer entry is a plain function component building its own submenu from hooks;
  the panel calls it inline in its own render and lists its items on a page. If its shape ever changes, the panel keeps
  Steam's own submenu (cascading to the side); if Steam shows none, the row is left out.
- **Cancel** (Steam's own last row in gamepad mode) is hidden by CSS; B closes as before.
- **The dim** behind every context menu is shared with the Game Glance menu (`MENU_DIM`, spec
  `2026-11-12-menu-dim-design.md`).

## Out of scope

- Steam's Properties page.
- Context menus in the in-game overlay unless they are the same windows (checked on the device).
- Play time in the eyebrow (the mock-up's "42.6 h"): Home's wording is used.
