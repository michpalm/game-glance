# Game info slots: three stats and a featured card

Date: 2026-11-10 · Branch: fix/menu-contrast-play-handoff (after be5ce6c) · Status: awaiting review

Mock-ups, painted on the Deck's live game page (Mini Motorways, real data):
`featured-card-mockups.png`, `protondb-full-page-mockups.png`, `protondb-clean-page-mockups.png`.

## Goal

Let the user choose which facts about a game Game Glance shows, and in what order, on Home and on the game page.
Today the set is fixed: Play time, Space required (uninstalled games), Achievements and HowLongToBeat, with
HowLongToBeat drawn in detail in its own card on the page's Full look. ProtonDB (be5ce6c) is a fifth fact.

Success: the user picks three stats and one featured stat; every look shows them without overflowing on the Deck
(854 × 534 CSS px), and the open transition still flies each Home chip to its own place on the page.

## The five stats

| Id | Shown when | Value |
|---|---|---|
| `played` | always (a game new to the library: "Added to library" instead, as today) | hours |
| `size` | a Steam game not installed with a known size, or a Unifideck game's size (as today) | bytes |
| `achievements` | the game has achievements | achieved / total, with a bar |
| `protondb` | a Steam game ProtonDB has rated | the rating, in its colour, with the atom mark |
| `hltb` | always ("—" without a match, as today) | Main hours, with a bar |

## The setting

```ts
type StatId = 'played' | 'size' | 'achievements' | 'protondb' | 'hltb';
type FeaturedId = Exclude<StatId, 'size'>;
interface GameInfoSlots {
    stats: [StatId | null, StatId | null, StatId | null]; // in display order; null = None
    featured: FeaturedId | null;                          // null = None
}
```

- **Default:** `stats: ['played', 'size', 'achievements'], featured: 'hltb'`, which is exactly today's Home and page.
  ProtonDB is shown only to people who pick it (off by default, as decided for be5ce6c).
- **One stat, one place:** picking a stat that another slot holds swaps the two slots' contents. Every change leaves
  the setting valid; nothing is ever shown twice.
- **Space required cannot be featured.** It disappears for installed games, so the featured card would be empty
  most of the time. Its picker for the featured slot leaves it out.
- **Reading a stored value:** field by field; an unknown id, a duplicate or a malformed value falls back to that
  slot's default (and a duplicate created that way is resolved by keeping the first occurrence and emptying later
  ones). Unknown fields a newer version wrote are kept on save, as `feedTabs` does.
- **Replaces `homeChips`** from be5ce6c. That commit is not released, so no migration: the `homeChips` field, its
  setter and the ProtonDB switch rows are removed. "ProtonDB is on" now means "ProtonDB is in a slot".
- **ProtonDB is asked only when it is in a slot** (stat or featured). Otherwise no request is made, as today.

## Where each look puts them

An empty slot (None, or a stat that does not apply to this game) is left out and the rest close up, with no gap.

**Home (Spotlight Home's chips):** the three stats in slot order, then the featured stat, as one row of at most
four chips. The featured chip is a plain chip on Home, always last.

**Clean look (the page's bottom row):** the same four, same order, as columns. Four fit beside the Play pill and
buttons on the Deck; five did not (they cover the controller and gear buttons), which is why there are four slots.

**Full look:**
- The info card holds the three stats (above the description), in slot order.
- The right-hand card is the featured card, drawn in detail (next section).
- **Featured None:** the right-hand card is gone and the info card spans the whole row.
- **Featured stat not applicable** (no achievements, no ProtonDB rating): the card stays, with its title and one
  line saying why ("No achievements", "No ProtonDB rating yet"), so the layout does not jump between games.
- HowLongToBeat not in any slot means no HowLongToBeat card and no lookup on the page (the background pre-load
  setting still fetches, as it is a separate option).

## The featured cards

Same card shell, size, label style and caption style as today's HowLongToBeat card. A title, then one row, then a
bar or nothing, then one caption line.

- **HowLongToBeat:** unchanged (Main in the accent, + Extras, 100%, bar, "x h left in main story").
- **ProtonDB:** Rating (atom mark + tier name in the tier's colour), Reports (count), Confidence. Caption:
  "Trending {tier} · best reported {tier}". From the same summary request as the chip; the cached result grows
  `total`, `confidence`, `trendingTier`, `bestReportedTier` (an older cache entry without them is used for the chip
  and refreshed for the card).
- **Achievements:** the most recently unlocked achievement's icon, "Latest · {when}" and its name; the bar
  (achieved / total); caption "{n} of {total} unlocked · rarest: {name} ({x}% have it)". From Steam's details for
  the game (`achievements.vecHighlight` + `vecAchievedHidden`, de-duplicated by `strID`; `rtUnlocked`, `flAchieved`
  for rarity, `strImage`). No achievements unlocked yet: no icon row, caption "{total} to unlock".
- **Play time:** Total (in the accent), Past 2 weeks, Last played. Caption, picked by rule: "All of it in the past
  two weeks" when the two match, "None in the past two weeks" when that is 0, else nothing. From the app overview
  (`minutes_playtime_forever`, `minutes_playtime_last_two_weeks`, `rt_last_time_played`) with the playtime merge
  Home already uses for launchers.

All four are the same height as today's card; text that would not fit ends in an ellipsis.

## The open transition

The rule stays one to one: each Home chip moves to the place that shows the same stat on the page.

- Chips map to page places by stat id, as today, so the user's order needs no special handling: Home and the page
  use the same order.
- The featured chip maps to the featured card's headline value (HowLongToBeat's Main today), with the accent copy
  where that value is in the accent (HowLongToBeat, Play time). Its glass grows into the featured card's shell.
- Featured None: the info card's target box is the full-row card (openTargets computes it from the same layout
  rule the page uses).
- A featured card's other parts (extra columns, bar, caption) fade in, as HowLongToBeat's do today.

## Settings

A **Game info** section in the **Game page** category of both settings surfaces (it applies to Home's chips too,
and the page exists with or without Spotlight Home):

- **Stat 1**, **Stat 2**, **Stat 3**: each opens a picker of the five stats and None.
- **Featured**: a picker of HowLongToBeat, ProtonDB, Achievements, Play time and None.
- One line under the section: "Shown on Home and the game page. ProtonDB sends the game's Steam app id to
  ProtonDB."

In our menu the pickers open a list view like the Games row picker; in Decky's panel they are drop-downs. The
category summary line reads the featured stat, e.g. "Full look · HowLongToBeat featured".

## Testing

- Slots: defaults; reading junk, unknown ids and duplicates; the swap rule; Space required never featured;
  unknown fields kept on save.
- Which chips Home shows for given slots and game facts (closing up, featured last, at most four).
- Page stats for both looks from the slots, including featured None (full-row info card).
- Each featured card's content from fixture data, including its empty states.
- ProtonDB lookup: not called unless in a slot; the richer cached result; old cache entries.
- Transition targets: featured card per stat, full-row info card, chip order follows slots.
- On the Deck and the Ally: each featured stat, featured None, and the open transition into each.

## Not in this change

- What pressing a featured card does: HowLongToBeat's card keeps whatever it does today; the new cards do nothing
  until that is designed.
- Steam's own page (Game Glance's page off).
- New data sources beyond ProtonDB's existing request.
