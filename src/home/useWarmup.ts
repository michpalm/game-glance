import { useEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { attempt } from '../data/attempt';
import { cache, TTL } from '../data/cache';
import { lookupHltb } from '../data/hltb';
import { settings } from '../data/settings';
import { getShortcutDescription } from '../data/shortcutDescription';
import { getDescription, getSteamLanguage } from '../data/steam';
import { getSourceLabel } from '../data/source';
import { loadFamilyCopyCount } from '../data/familyCopies';
import { heroicStoreLabel } from '../logic/heroic';
import type { HeroicRef } from '../logic/heroic';
import { artKnown, resolveArt } from './HeroBackground';
import { rowShowsWideCards } from './recentsLayout';
import { cardArtKnown, warmCardArt } from './wideCardArt';
import { memoAchievements, noteDetails, seedAchievements, setAchievementSink } from './detailsMemo';
import { ArtWarmDeps, DescriptionWarmDeps, DetailsWarmDeps, HltbWarmDeps, warmAchievements, warmArt, warmDescriptions, warmHltb, warmOrder } from './warmup';

/**
 * The network and Steam-details warming waits this long after Home is up, so the first paint and the selected game's own
 * requests go first. The art does not wait: its files are on the device, and it starts with the game shown first.
 */
const WARMUP_DELAY_MS = 1200;

const achievementKey = (appId: number) => `ach:${appId}`;

type SteamApps = { SteamClient?: { Apps?: { RegisterForAppDetails?(appId: number, cb: (details: unknown) => void): { unregister(): void } } } };
const steamApps = () => (globalThis as unknown as SteamApps).SteamClient?.Apps;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface WarmGame {
    appId: number;
    name: string;
}

/** What the warm-up needs to know of a game beyond its id: a non-Steam shortcut, and Heroic's reference for it. */
export interface WarmInfo {
    isShortcut: boolean;
    heroic: HeroicRef | null;
}

/**
 * Warms what the selected game's chips, its wide card and the open transition need, for every game in Home's games row
 * (whatever the Games row setting shows), nearest the selection first: HowLongToBeat (the disk cache at once, online for the games with nothing cached when the pre-load
 * setting allows), the Achievements counts (Steam's details, one game at a time; also kept in the plugin cache for a week,
 * so after a restart they are there at once), the description (likewise; the Spotlight look only), the hero art and the
 * wide card's art (loaded and decoded, one game at a time). The art starts at once, from the game shown; the rest
 * WARMUP_DELAY_MS after Home is up. Starts again when the list of games changes;
 * stops on unmount. `onChange` is called as results come in, so the selected game refreshes. Never throws.
 */
export function useWarmup(games: WarmGame[], centre: number, ready: boolean, info: (appId: number) => WarmInfo, onChange: () => void) {
    const idsKey = games.map((g) => g.appId).join(',');
    const latest = useRef({ games, centre, info, onChange });
    latest.current = { games, centre, info, onChange };
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
            // One tick first: Home's restored selection (back on B) is applied by then, so the order starts from what is shown.
            await sleep(0);
            if (cancelled) return;
            const { games: list, centre: at, info: infoOf, onChange: changed } = latest.current;
            const shortcut = (appId: number) => infoOf(appId).isShortcut;
            const ordered = warmOrder(list, at);
            // These are local metadata reads, independent of online preloading. Keep them ahead of selection.
            const pills = (async () => {
                for (const game of ordered) {
                    if (cancelled) return;
                    const meta = infoOf(game.appId);
                    await Promise.all([
                        getSourceLabel(game.appId, meta.isShortcut, undefined, heroicStoreLabel(meta.heroic)),
                        loadFamilyCopyCount(game.appId).catch(() => undefined),
                    ]);
                }
                if (!cancelled) changed();
            })().catch((error) => console.warn(`${LOG_PREFIX} Home: pill warm-up failed`, error));
            // The art at once, from the game shown outward (Home's own load of the shown game's art is shared, not repeated):
            // its hero, and the wide card's own art.
            const ids = ordered.map((g) => g.appId);
            const artDeps: ArtWarmDeps = { has: artKnown, resolve: resolveArt, sleep };
            const cardDeps: ArtWarmDeps = { has: cardArtKnown, resolve: warmCardArt, sleep };
            // Minimal draws no wide card: no wide card art to warm (a later switch to Steam or Spotlight loads it as shown).
            const wideCards = rowShowsWideCards(settings.get().homeRowStyle);
            const art = Promise.all([warmArt(ids, artDeps, isCancelled), wideCards ? warmArt(ids, cardDeps, isCancelled) : undefined]);
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
            const descriptionDeps: DescriptionWarmDeps = {
                readCached: async (appId, lang) => {
                    const entry = await attempt('description cache read', () => cache.get<{ text: string | null }>(`desc:${appId}:${lang}`), null);
                    return entry ? entry.text : undefined;
                },
                fetch: (game, lang) =>
                    game.isShortcut ? getShortcutDescription({ name: game.name, heroic: infoOf(game.appId).heroic }, lang) : getDescription(game.appId, lang),
                allowNetwork: () => settings.get().autoPreload,
                sleep,
            };
            // The Clean look shows no description: none to warm.
            const descriptions = async () => {
                if (settings.get().cleanPage) return;
                const lang = await attempt('Steam language', () => getSteamLanguage(), 'english');
                await warmDescriptions(ordered.map((g) => ({ appId: g.appId, name: g.name, isShortcut: shortcut(g.appId) })), lang, descriptionDeps, isCancelled, changed);
            };
            await Promise.all([
                pills,
                descriptions(),
                art,
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
