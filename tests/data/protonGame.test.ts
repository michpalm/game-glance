import { describe, expect, it, vi } from 'vitest';
import { createProtonGames, type ProtonGameDeps } from '../../src/data/protonGame';
import type { ProtonResult } from '../../src/data/protondb';

const GOLD: ProtonResult = { status: 'found', tier: 'gold', details: { total: 70, confidence: 'strong', trending: 'platinum', best: 'platinum' } };
const STEAM = { appId: 764790, name: 'The Messenger', isShortcut: false };
const SHORTCUT = { appId: 3912231732, name: 'The Messenger', isShortcut: true };

function deps(match: Map<string, number | null>, over: Partial<ProtonGameDeps> = {}): ProtonGameDeps & { asked: number[] } {
    const asked: number[] = [];
    return {
        asked,
        cachedMatch: async (name) => (match.has(name) ? match.get(name) : undefined),
        find: vi.fn(async (name: string) => { match.set(name, 764790); return 764790; }),
        lookup: async (id) => { asked.push(id); return GOLD; },
        cachedOnly: async (id) => { asked.push(id); return GOLD; },
        prefetch: async (id) => { asked.push(id); return { status: 'found', fetched: true }; },
        ...over,
    };
}

describe('ProtonDB for any game', () => {
    it("asks with a Steam game's own app id, never matching its name", async () => {
        const d = deps(new Map());
        expect(await createProtonGames(d).lookup(STEAM)).toBe(GOLD);
        expect(d.asked).toEqual([764790]);
        expect(d.find).not.toHaveBeenCalled();
    });
    it('asks with a shortcut’s Steam match, as ProtonDB Badges shows it', async () => {
        const d = deps(new Map());
        expect(await createProtonGames(d).lookup(SHORTCUT)).toBe(GOLD);
        expect(d.asked).toEqual([764790]);
    });
    it('reads a shortcut with no Steam game of its name as no rating, and a failed search as unavailable', async () => {
        const miss = deps(new Map([['The Messenger', null]]));
        expect(await createProtonGames(miss).lookup(SHORTCUT)).toEqual({ status: 'none' });
        expect(miss.asked).toEqual([]);
        const down = deps(new Map(), { find: async () => null });
        expect(await createProtonGames(down).lookup(SHORTCUT)).toEqual({ status: 'unavailable' });
    });
    it('never goes online for the cached answer: an unmatched shortcut has none', async () => {
        const d = deps(new Map());
        expect(await createProtonGames(d).cachedOnly(SHORTCUT)).toBeNull();
        expect(d.find).not.toHaveBeenCalled();
        const known = deps(new Map([['The Messenger', 764790]]));
        expect(await createProtonGames(known).cachedOnly(SHORTCUT)).toBe(GOLD);
    });
    it('counts matching a shortcut online as fetched, a remembered match not', async () => {
        const cached = deps(new Map([['The Messenger', 764790]]), { prefetch: async () => ({ status: 'found', fetched: false }) });
        expect(await createProtonGames(cached).prefetch(SHORTCUT)).toEqual({ status: 'found', fetched: false });
        const fresh = deps(new Map(), { prefetch: async () => ({ status: 'found', fetched: false }) });
        expect(await createProtonGames(fresh).prefetch(SHORTCUT)).toEqual({ status: 'found', fetched: true });
        const none = deps(new Map(), { find: vi.fn(async (name: string) => { void name; return null; }) });
        none.cachedMatch = async () => undefined;
        expect(await createProtonGames(none).prefetch(SHORTCUT)).toEqual({ status: 'unavailable', fetched: true });
    });
});
