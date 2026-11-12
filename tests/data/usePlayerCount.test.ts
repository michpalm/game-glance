import { beforeEach, describe, expect, it, vi } from 'vitest';
import { peekPlayers, playersKnown, refreshPlayers, resetPlayersMemo, seedPlayers } from '../../src/data/usePlayerCount';
import type { PlayerCount } from '../../src/data/playerCount';

function fakeLookup(cached: PlayerCount | null, fresh: PlayerCount | null) {
    let disk = cached;
    return {
        cachedOnly: vi.fn(async () => disk),
        prefetch: vi.fn(async () => { disk = fresh ?? disk; return { status: (fresh ?? { status: 'unavailable' }).status, fetched: true }; }),
    };
}

beforeEach(() => resetPlayersMemo());

describe('players memo', () => {
    it('keeps found counts by app id, 0 included, and nothing else', () => {
        expect(seedPlayers(10, { status: 'found', count: 0 })).toBe(true);
        expect(peekPlayers(10)).toBe(0);
        expect(seedPlayers(11, { status: 'none' })).toBe(false);
        expect(seedPlayers(12, { status: 'unavailable' })).toBe(false);
        expect(peekPlayers(11)).toBeNull();
        expect(playersKnown(10)).toBe(true);
        expect(playersKnown(11)).toBe(false);
    });
});

describe('refreshPlayers', () => {
    it('shows the cached count first, then the fresh one, telling the hook each time it changes', async () => {
        const lookup = fakeLookup({ status: 'found', count: 100 }, { status: 'found', count: 120 });
        const seen: (number | null)[] = [];
        await refreshPlayers(10, 60_000, lookup, () => seen.push(peekPlayers(10)), () => true);
        expect(seen).toEqual([100, 120]);
        expect(lookup.prefetch).toHaveBeenCalledWith(10, 60_000);
    });
    it('does not tell the hook when nothing changed, and keeps the count when Steam fails', async () => {
        seedPlayers(10, { status: 'found', count: 100 });
        const onChange = vi.fn();
        await refreshPlayers(10, 60_000, fakeLookup({ status: 'found', count: 100 }, null), onChange, () => true);
        expect(onChange).not.toHaveBeenCalled();
        expect(peekPlayers(10)).toBe(100);
    });
    it("a late answer for the previous game lands in that game's slot, never the new one's", async () => {
        let resolve!: () => void;
        const slow = { cachedOnly: vi.fn(async () => null), prefetch: vi.fn(() => new Promise<{ status: 'found'; fetched: boolean }>((r) => { resolve = () => r({ status: 'found', fetched: true }); })) };
        let current = 10;
        const pending = refreshPlayers(10, 60_000, { ...slow, cachedOnly: vi.fn(async () => (current === 10 && !resolve ? null : { status: 'found' as const, count: 999 })) }, vi.fn(), () => current === 10);
        current = 20;
        seedPlayers(20, { status: 'found', count: 5 });
        await Promise.resolve();
        resolve();
        await pending;
        expect(peekPlayers(20)).toBe(5);
    });
});
