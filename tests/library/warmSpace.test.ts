import { describe, expect, it, vi } from 'vitest';
import { knownSpace, rememberSpace, warmSpace, type SpaceWarmDeps } from '../../src/library/librarySpace';

const deps = (sizes: Record<number, number | undefined>, extra: Partial<SpaceWarmDeps> = {}) => {
    const unregister = vi.fn();
    const d: SpaceWarmDeps = {
        register: vi.fn((appId: number, cb: (details: unknown) => void) => { queueMicrotask(() => cb({ lDiskSpaceRequiredBytes: sizes[appId] })); return { unregister }; }),
        sleep: async () => {},
        waitMs: 50,
        ...extra,
    };
    return { d, unregister };
};

describe('warmSpace (PS5: Home\'s once-per-session details loop and its 64-game memo lost sizes)', () => {
    it('asks Steam for each game and keeps every size for the session', async () => {
        const { d, unregister } = deps({ 1455840: 1_000_000_000, 1446780: 2_000_000_000 });
        const seen: number[] = [];
        await warmSpace([1455840, 1446780], d, () => false, id => seen.push(id));
        expect(knownSpace(1455840)).toBe(1_000_000_000);
        expect(knownSpace(1446780)).toBe(2_000_000_000);
        expect(seen).toEqual([1455840, 1446780]);
        expect(unregister).toHaveBeenCalledTimes(2);
    });
    it('skips games it already knows', async () => {
        rememberSpace(42, 5);
        const { d } = deps({});
        await warmSpace([42], d, () => false, () => {});
        expect(d.register).not.toHaveBeenCalled();
    });
    it('moves on when Steam sends no size, and stops when cancelled', async () => {
        const { d } = deps({ 7: undefined, 8: 9 });
        let cancelled = false;
        await warmSpace([7, 8], d, () => cancelled, () => { cancelled = true; });
        expect(knownSpace(7)).toBeUndefined();
        expect(knownSpace(8)).toBe(9);
    });
    it('never throws when registering fails', async () => {
        const { d } = deps({}, { register: () => { throw new Error('no'); } });
        await expect(warmSpace([99], d, () => false, () => {})).resolves.toBeUndefined();
    });
});
