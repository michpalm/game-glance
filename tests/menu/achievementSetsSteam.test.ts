import { describe, expect, it, vi } from 'vitest';
import { createAchievementSets, type SetsSteam } from '../../src/menu/steam/achievementSets';

const schema = { groups: [{ id: 0, name: '', archived: false, dlcappid: 0, achievements: [] }] };
const user = { achievements: {}, groups: {} };

function steam(cache: Map<string, unknown> = new Map(), change: Partial<SetsSteam> = {}): SetsSteam & { cache: Map<string, unknown> } {
    const client = {
        getQueryData: (key: unknown[]) => cache.get(JSON.stringify(key)),
        fetchQuery: vi.fn(async (o: { queryKey: unknown[]; queryFn(): Promise<unknown> }) => { const v = await o.queryFn(); cache.set(JSON.stringify(o.queryKey), v); return v; }),
    };
    return {
        cache,
        client: () => client,
        transport: () => 'transport',
        steamId: () => '765',
        prefetch: () => ({
            schema: vi.fn(async (_c: unknown, _t: unknown, appId: number) => { cache.set(JSON.stringify(['achievements', appId, 'schema']), schema); }),
            user: vi.fn(async (_c: unknown, _t: unknown, appId: number, id: string) => { cache.set(JSON.stringify(['achievements', appId, 'user_achievements', id]), user); }),
        }),
        rates: () => async (_t: unknown, appId: number) => ({ percentages: { [appId]: 12.5 } }),
        ...change,
    };
}

describe('achievement sets from Steam\'s own queries', () => {
    it('reads the set list and this player\'s progress from Steam\'s query cache, under Steam\'s keys', () => {
        const s = steam(new Map([[JSON.stringify(['achievements', 7, 'schema']), schema], [JSON.stringify(['achievements', 7, 'user_achievements', '765']), user]]));
        expect(createAchievementSets(s).read(7)).toEqual({ schema, user });
    });
    it('is nothing until both are there', () => {
        const s = steam(new Map([[JSON.stringify(['achievements', 7, 'schema']), schema]]));
        expect(createAchievementSets(s).read(7)).toBeNull();
    });
    it('loads them with Steam\'s own prefetches (client, transport, app, Steam id), then reads them', async () => {
        const s = steam();
        const prefetch = s.prefetch()!;
        const sets = createAchievementSets({ ...s, prefetch: () => prefetch });
        expect(await sets.load(7)).toEqual({ schema, user });
        expect(prefetch.schema).toHaveBeenCalledWith(expect.anything(), 'transport', 7);
        expect(prefetch.user).toHaveBeenCalledWith(expect.anything(), 'transport', 7, '765');
    });
    it('asks once at a time per game', async () => {
        const s = steam();
        const prefetch = s.prefetch()!;
        const sets = createAchievementSets({ ...s, prefetch: () => prefetch });
        await Promise.all([sets.load(7), sets.load(7)]);
        expect(prefetch.schema).toHaveBeenCalledTimes(1);
    });
    it('gives nothing, and never throws, when Steam\'s pieces are missing or the request fails', async () => {
        for (const change of [{ client: () => null }, { prefetch: () => null }, { steamId: () => null }, { transport: () => { throw new Error('x'); } },
            { prefetch: () => ({ schema: async () => { throw new Error('offline'); }, user: async () => undefined }) }] as Partial<SetsSteam>[]) {
            const sets = createAchievementSets(steam(new Map(), change));
            expect(sets.read(7)).toBeNull();
            expect(await sets.load(7)).toBeNull();
        }
    });
    it('does nothing for a non-Steam game (no achievements)', async () => {
        const s = steam();
        const prefetch = s.prefetch()!;
        expect(await createAchievementSets({ ...s, prefetch: () => prefetch }).load(0)).toBeNull();
        expect(prefetch.schema).not.toHaveBeenCalled();
    });
});

describe('global unlock rates (Steam\'s own query)', () => {
    it('loads them under Steam\'s key with its loader, and reads them', async () => {
        const s = steam();
        const sets = createAchievementSets(s);
        expect(await sets.loadRates(7)).toEqual({ percentages: { 7: 12.5 } });
        expect(s.cache.get(JSON.stringify(['achievements', 7, 'globalpercentages']))).toEqual({ percentages: { 7: 12.5 } });
        expect(sets.readRates(7)).toEqual({ percentages: { 7: 12.5 } });
    });
    it('gives nothing when the loader is missing or fails', async () => {
        expect(await createAchievementSets(steam(new Map(), { rates: () => null })).loadRates(7)).toBeNull();
        expect(await createAchievementSets(steam(new Map(), { rates: () => async () => { throw new Error('x'); } })).loadRates(7)).toBeNull();
    });
});
