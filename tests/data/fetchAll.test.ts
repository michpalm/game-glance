import { describe, expect, it, vi } from 'vitest';
import { createFetchAll, FetchAllDeps } from '../../src/data/fetchAll';
import type { InstalledGame } from '../../src/data/installedGames';

const game = (appId: number): InstalledGame => ({ appId, name: `Game ${appId}`, isShortcut: false, heroic: null });

function deps(over: Partial<FetchAllDeps> = {}): FetchAllDeps {
    return {
        listGames: async () => [game(1), game(2), game(3)],
        prefetch: vi.fn(async (g: InstalledGame) => (g.appId === 2 ? { status: 'notFound' as const, fetched: true } : { status: 'found' as const, fetched: true })),
        sleep: vi.fn(async () => undefined),
        notify: vi.fn(),
        delayMs: 1000,
        ...over,
    };
}

describe('createFetchAll', () => {
    it('fetches every game one at a time and reports a short summary', async () => {
        const d = deps();
        const run = createFetchAll(d);
        await run.start();
        expect(d.prefetch).toHaveBeenCalledTimes(3);
        expect(run.state()).toEqual({ running: false, done: 3, total: 3, found: 2, notFound: 1 });
        expect(d.notify).toHaveBeenCalledWith('Game data for 3 games found.');
    });
    it('pauses between network fetches, but not after cached games or the last game', async () => {
        const prefetch = vi.fn(async (g: InstalledGame) => ({ status: 'found' as const, fetched: g.appId !== 2 }));
        const d = deps({ prefetch, listGames: async () => [game(1), game(2), game(3), game(4)] });
        await createFetchAll(d).start();
        expect(d.sleep).toHaveBeenCalledTimes(2);
        expect(d.sleep).toHaveBeenCalledWith(1000);
    });
    it('shows progress while running and ignores a second start', async () => {
        let release!: () => void;
        const gate = new Promise<void>((r) => (release = r));
        const prefetch = vi.fn(async () => { await gate; return { status: 'found' as const, fetched: false }; });
        const run = createFetchAll(deps({ prefetch }));
        const seen: number[] = [];
        run.subscribe(() => seen.push(run.state().done));
        const first = run.start();
        await vi.waitFor(() => expect(run.state()).toMatchObject({ running: true, total: 3, done: 0 }));
        await run.start();
        release();
        await first;
        expect(prefetch).toHaveBeenCalledTimes(3);
        expect(seen).toContain(1);
    });
    it('stops when asked, and says so', async () => {
        const d = deps();
        const run = createFetchAll(d);
        (d.prefetch as ReturnType<typeof vi.fn>).mockImplementation(async () => { run.stop(); return { status: 'found', fetched: true }; });
        await run.start();
        expect(d.prefetch).toHaveBeenCalledTimes(1);
        expect(run.state()).toMatchObject({ running: false, done: 1 });
        expect(d.notify).toHaveBeenCalledWith('Stopped after 1 of 3 games.');
    });
    it('gives up when HowLongToBeat cannot be reached', async () => {
        const d = deps({ prefetch: vi.fn(async () => ({ status: 'unavailable' as const, fetched: true })) });
        await createFetchAll(d).start();
        expect(d.prefetch).toHaveBeenCalledTimes(1);
        expect(d.notify).toHaveBeenCalledWith('HowLongToBeat could not be reached. Try again later.');
    });
    it('reports when there is nothing to fetch, and survives a failing game list', async () => {
        const empty = deps({ listGames: async () => [] });
        await createFetchAll(empty).start();
        expect(empty.notify).toHaveBeenCalledWith('No installed games found.');
        const broken = deps({ listGames: async () => { throw new Error('x'); } });
        const run = createFetchAll(broken);
        await run.start();
        expect(run.state().running).toBe(false);
        expect(broken.notify).toHaveBeenCalledWith('No installed games found.');
    });
    it('keeps going when one game fails', async () => {
        const prefetch = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ status: 'found', fetched: true });
        const d = deps({ prefetch });
        const run = createFetchAll(d);
        await run.start();
        expect(prefetch).toHaveBeenCalledTimes(3);
        expect(run.state()).toMatchObject({ done: 3, found: 2 });
    });
});

describe('createFetchAll summary', () => {
    it('says "game" for a single game', async () => {
        const d = deps({ listGames: async () => [game(1)] });
        await createFetchAll(d).start();
        expect(d.notify).toHaveBeenCalledWith('Game data for 1 game found.');
    });
});

describe('createFetchAll quiet runs', () => {
    it('shows no notification at all when run in the background', async () => {
        for (const listGames of [async () => [game(1)], async () => []]) {
            const d = deps({ listGames });
            await createFetchAll(d).start({ quiet: true });
            expect(d.notify).not.toHaveBeenCalled();
        }
        const offline = deps({ prefetch: vi.fn(async () => ({ status: 'unavailable' as const, fetched: true })) });
        await createFetchAll(offline).start({ quiet: true });
        expect(offline.notify).not.toHaveBeenCalled();
    });
});
