import { useEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { attempt } from '../data/attempt';
import { cache, TTL } from '../data/cache';
import { lookupHltb } from '../data/hltb';
import { settings } from '../data/settings';
import { memoAchievements, noteDetails, seedAchievements, setAchievementSink } from './detailsMemo';
import { DetailsWarmDeps, HltbWarmDeps, warmAchievements, warmHltb, warmOrder } from './warmup';

/** Waits this long after Home is up before warming, so the first paint and the selected game's own requests go first. */
const WARMUP_DELAY_MS = 1200;

const achievementKey = (appId: number) => `ach:${appId}`;

type SteamApps = { SteamClient?: { Apps?: { RegisterForAppDetails?(appId: number, cb: (details: unknown) => void): { unregister(): void } } } };
const steamApps = () => (globalThis as unknown as SteamApps).SteamClient?.Apps;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface WarmGame {
    appId: number;
    name: string;
}

/**
 * Warms what the selected game's chips need, for every game in the recents row, nearest the selection first: HowLongToBeat
 * (the disk cache at once, online for the games with nothing cached when the pre-load setting allows) and the Achievements
 * counts (Steam's details, one game at a time; also kept in the plugin cache for a week, so after a restart they are there
 * at once). Starts WARMUP_DELAY_MS after Home is up and again when the list of games changes; stops on unmount. `onChange` is
 * called as results come in, so the chips of the selected game refresh. Never throws.
 */
export function useWarmup(games: WarmGame[], centre: number, ready: boolean, isShortcut: (appId: number) => boolean, onChange: () => void) {
    const idsKey = games.map((g) => g.appId).join(',');
    const latest = useRef({ games, centre, isShortcut, onChange });
    latest.current = { games, centre, isShortcut, onChange };
    useEffect(() => {
        setAchievementSink((appId, counts) => {
            void attempt('achievements cache write', () => cache.put(achievementKey(appId), counts, TTL.achievements), undefined);
        });
        return () => setAchievementSink(null);
    }, []);
    useEffect(() => {
        if (!ready || latest.current.games.length === 0) return undefined;
        let cancelled = false;
        const isCancelled = () => cancelled;
        const run = async () => {
            const { games: list, centre: at, isShortcut: shortcut, onChange: changed } = latest.current;
            const ordered = warmOrder(list, at);
            // The persisted counts first: no delay, so the chip is there on the very first selection after a restart.
            let seeded = false;
            for (const game of ordered) {
                if (cancelled) return;
                if (memoAchievements(game.appId)) continue;
                const stored = await attempt('achievements cache read', () => cache.get<{ achieved: number; total: number }>(achievementKey(game.appId)), null);
                if (stored) {
                    seedAchievements(game.appId, stored);
                    seeded = true;
                }
            }
            if (seeded) changed();
            await sleep(WARMUP_DELAY_MS);
            if (cancelled) return;
            const hltbDeps: HltbWarmDeps = {
                readCached: (game) => lookupHltb.cachedOnly(game),
                prefetch: (game) => lookupHltb.prefetch(game),
                allowNetwork: () => settings.get().autoPreload,
                sleep,
            };
            const detailsDeps: DetailsWarmDeps = {
                has: (appId) => memoAchievements(appId) !== undefined,
                register: (appId, onDetails) => steamApps()?.RegisterForAppDetails?.(appId, onDetails),
                sleep,
            };
            await Promise.all([
                warmHltb(ordered.map((g) => ({ appId: g.appId, name: g.name, isShortcut: shortcut(g.appId) })), hltbDeps, isCancelled, changed),
                warmAchievements(ordered.filter((g) => !shortcut(g.appId)).map((g) => g.appId), detailsDeps, isCancelled, (appId, details) => {
                    noteDetails(appId, details);
                    changed();
                }),
            ]);
        };
        run().catch((error) => console.warn(`${LOG_PREFIX} Home: warm-up failed`, error));
        return () => {
            cancelled = true;
        };
    }, [idsKey, ready]);
}

/** A counter that changes when the warm-up learns something: add it to the dependencies of what reads the memos. */
export function useWarmVersion(): [number, () => void] {
    const [version, setVersion] = useState(0);
    return [version, () => setVersion((v) => v + 1)];
}
