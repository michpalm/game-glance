import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lutrisPlaytime, parseLutrisPlaytime, resetLutrisPlaytime } from '../../src/data/lutrisPlaytime';

describe('parseLutrisPlaytime (hours and Unix seconds, as Lutris keeps them)', () => {
    it('turns hours into seconds and keeps last played', () => {
        expect(parseLutrisPlaytime({ hours: 12.5, lastplayed: 1792588711 })).toEqual({ playedSeconds: 45000, lastPlayed: 1792588711 });
    });
    it('0 hours counts as none, but last played is kept', () => {
        expect(parseLutrisPlaytime({ hours: 0, lastplayed: 5 })).toEqual({ playedSeconds: null, lastPlayed: 5 });
    });
    it('is null when there is nothing usable', () => {
        for (const bad of [{ hours: 0, lastplayed: null }, null, 'x', { hours: -1 }]) expect(parseLutrisPlaytime(bad)).toBeNull();
    });
});

describe('lutrisPlaytime fetch', () => {
    beforeEach(() => resetLutrisPlaytime());
    const reply = { hours: 12.5, lastplayed: 1792588711 };
    const parsed = { playedSeconds: 45000, lastPlayed: 1792588711 };

    it('asks the backend with the game id and the install', async () => {
        const call = vi.fn(async () => reply);
        expect(await lutrisPlaytime({ gameId: 1, flatpak: true }, { call })).toEqual(parsed);
        expect(call).toHaveBeenCalledWith(1, true);
    });
    it('is null when the backend throws', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const call = vi.fn(async () => { throw new Error('no backend'); });
        expect(await lutrisPlaytime({ gameId: 1, flatpak: true }, { call })).toBeNull();
        warn.mockRestore();
    });
    it('caches for 60 s per game and install', async () => {
        const call = vi.fn(async () => reply);
        let now = 1000;
        const deps = { call, now: () => now };
        await Promise.all([lutrisPlaytime({ gameId: 1, flatpak: true }, deps), lutrisPlaytime({ gameId: 1, flatpak: true }, deps)]);
        expect(call).toHaveBeenCalledTimes(1);
        now += 59_000;
        await lutrisPlaytime({ gameId: 1, flatpak: true }, deps);
        expect(call).toHaveBeenCalledTimes(1);
        await lutrisPlaytime({ gameId: 1, flatpak: false }, deps);
        expect(call).toHaveBeenCalledTimes(2);
        now += 2_000;
        await lutrisPlaytime({ gameId: 1, flatpak: true }, deps);
        expect(call).toHaveBeenCalledTimes(3);
    });
});
