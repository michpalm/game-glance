export function parseHltbId(input: string): number | null {
    const s = input.trim();
    if (/^\d+$/.test(s)) {
        const n = Number(s);
        return n > 0 ? n : null;
    }
    const match = s.match(/howlongtobeat\.com\/game\/(\d+)/i);
    if (!match) return null;
    const n = Number(match[1]);
    return n > 0 ? n : null;
}

export type OverrideCheck = { id: number } | { error: string };

/** Validates a HowLongToBeat override for a game, catching the common mix-up with the game's Steam app id. */
export function checkOverride(input: string, steamAppId: number): OverrideCheck {
    const id = parseHltbId(input);
    if (id === null) return { error: 'Enter a HowLongToBeat link or game ID.' };
    if (id === steamAppId) {
        return {
            error: "That's the game's Steam ID. Use the number from its HowLongToBeat page link (howlongtobeat.com/game/…).",
        };
    }
    return { id };
}
