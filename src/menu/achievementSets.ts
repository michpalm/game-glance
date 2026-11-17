/**
 * Steam's Achievement Sets for one game, summed up for the in-game Achievements tile (mock-up "Achievement Sets",
 * 2026-11-17). The rules are Steam's own (its achievements page, read on the Deck): a set shows when it has something
 * left to show; an archived achievement counts only once unlocked; a set the player cannot earn (DLC they do not own,
 * an archived set) adds only what they unlocked, so the total is what this player can earn. Pure.
 */
export interface SetSchema { groups: { id: number; name: string; archived: boolean; dlcappid: number; achievements: { internal_key: number; archived: boolean }[] }[] }
export interface SetUser { achievements: Record<number, { unlocked?: boolean } | undefined>; groups: Record<number, { is_achievable?: boolean; is_completed?: boolean } | undefined> }
export interface SetBar {
    id: number; name: string;
    /** Achievements that count in it (its bar's width). */ size: number; unlocked: number;
    /** The base game's set (no DLC). */ base: boolean;
    /** The player can earn it (Steam's is_achievable). */ earnable: boolean; complete: boolean;
}
export interface SetsSummary {
    unlocked: number; total: number;
    /** Sets done, of the sets that count (earnable or done). */ done: number; sets: number;
    bars: SetBar[];
}

/** Steam's id for the base game's set. */
const BASE = 0;

/** Every set Steam would show, summed up; null without usable data. The page uses it even for a game with one set. */
export function allSets(schema: SetSchema | undefined, user: SetUser | undefined): SetsSummary | null {
    if (!schema || !Array.isArray(schema.groups)) return null;
    const got = (key: number) => user?.achievements?.[key]?.unlocked === true;
    const bars: SetBar[] = [];
    let unlocked = 0, total = 0, done = 0, sets = 0;
    for (const g of schema.groups) {
        const list = Array.isArray(g?.achievements) ? g.achievements : [];
        if (!list.some(a => (!g.archived && !a.archived) || got(a.internal_key))) continue;
        const counted = list.filter(a => g.archived || !a.archived || got(a.internal_key));
        const have = counted.filter(a => got(a.internal_key)).length;
        const state = user?.groups?.[g.id];
        const earnable = state?.is_achievable === true;
        const complete = state?.is_completed === true || (counted.length > 0 && have === counted.length);
        unlocked += have;
        total += earnable && !g.archived ? counted.length : have;
        if (earnable || complete) { sets++; if (complete) done++; }
        bars.push({ id: g.id, name: g.name, size: counted.length, unlocked: have, base: !g.dlcappid, earnable, complete });
    }
    return bars.length ? { unlocked, total, done, sets, bars } : null;
}

/** The game's sets for the tile; null for a game without sets (Steam's "has groups": more than the base game's own set). */
export function setsSummary(schema: SetSchema | undefined, user: SetUser | undefined): SetsSummary | null {
    const all = allSets(schema, user);
    return all && (all.bars.length > 1 || all.bars[0].id !== BASE) ? all : null;
}

/** The tile's line: "38 of 52 · 2 of 4 sets done", or just the count when only one set can be earned. */
export function setsLine(s: SetsSummary): string {
    const count = `${s.unlocked} of ${s.total}`;
    return s.sets > 1 ? `${count} · ${s.done} of ${s.sets} sets done` : count;
}
