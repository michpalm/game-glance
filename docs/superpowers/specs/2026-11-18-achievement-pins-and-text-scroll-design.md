# Achievement pins and scrolling text — short design (2026-11-18)

Two small changes that ship together in the next PS5 build.

## 1. Achievement pins

**Why.** When Michael opens the Achievements page in game, the one or two achievements he is going for should be
right there, one press away, without scrolling or re-sorting.

**What.**
- **Y** on an achievement in the right-hand list pins it; Y on a pinned one unpins it.
- Pins are **per set**: each set (base game, each DLC) has its own pins, **at most two**.
- Pinning a third in a set **replaces the oldest** pin in that set (no refusal, no error).
- Pinned achievements are the **first rows of that set's list**, in pin order, marked with a pin icon, above
  the rest in the order the sort pill picked. They **scroll with the list** (no fixed area): on open they are
  the first thing in view, and while browsing they take no space.
- A pin **drops itself once the achievement is unlocked** (the goal is done).
- Pins are **saved in Game Glance's settings file** (the settings store in `src/data/settings.ts`, through the
  backend), so they survive a Steam restart, a reboot and plugin updates.

**Approaches considered.**
1. Game Glance settings file via the backend: *picked*. Same place as every other setting; durable.
2. The menu's browser storage: simpler, but Steam can clear it and pins would vanish silently.

**Builder's calls.** The stored shape (proposed: `achievementPins: { "<appId>:<setId>": number[] }`, achievement
`internal_key`s, oldest first); the pin icon; a hint for Y (Steam's footer legend if the menu shows one).
Unlocked or vanished keys are dropped when read. The "Unlocked" list never shows pins.

**Non-goals.** Pins on the game page, the In game menu or anywhere outside this page. Pins across sets.

## 2. Scrolling text that doesn't fit

**Why.** Text cut off with "…" on cards hides what matters: an achievement name, the "rarest: …" percentage on
the featured Achievements card, a long game description on the stat card.

**Rules.**
- Text that fits **never moves**.
- **One-line text cut off** (achievement name, "rarest: …" line on the featured card): scrolls only while its
  card is focused, after **1.5 s**: slides at about **30 px/s** to the end, pauses **2 s**, fades back to the
  start, and repeats while focused. Losing focus puts it back at once.
- **Multi-line description** (stat card): when the page has been still for **3 s**, it moves up **one line every
  ~3 s**, then returns to the top after a pause. Any input stops it and returns it to the top.

**Builder's calls.** The exact fade and easing; one shared helper for the one-line case; reduced-motion off-switch
if Game Glance has one.

**Non-goals.** Scrolling text anywhere else (it can be applied later with the same helper).

## Shipping

Built with tests, then sent to the PS5 as one build. Not committed until Michael asks.
