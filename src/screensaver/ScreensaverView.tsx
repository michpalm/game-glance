import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GameTitle } from '../components/GameTitle';
import { attempt } from '../data/attempt';
import { cache, overrides } from '../data/cache';
import { hltbCacheKey, HltbResult } from '../data/hltb';
import { settings, useSettings } from '../data/settings';
import { peekSteamLanguage, playedMinutesOf } from '../data/steam';
import { Art, resolveArt } from '../home/HeroBackground';
import { statusCss } from '../home/homeCss';
import { StatusBar } from '../home/StatusBar';
import { readRowGames } from '../home/useHomeData';
import { steamLanguageToLocale } from '../logic/format';
import type { HltbTimes } from '../logic/progress';
import { memoAchievements, memoPlaytime } from '../home/detailsMemo';
import type { ScreensaverOptions } from './options';
import { cardScale, CROSSFADE_MS, ScreensaverCanvas, screensaverCanvas, screensaverCss, shuffled, SLIDE_MS } from './screensaverCss';
import { EMPTY_STACK, firstSettled, nextIndexes, nextSlides, PICK_AHEAD, PRELOAD_AHEAD, settledSlides, slideLayers, SlidePhase, SlideStack } from './slideStack';
import { screensaverStats } from './stats';
import { slideshowClasses, useScreensaverActive, useScreensaverDocument } from './steamScreensaver';

interface Slide { id: number; appId: number; name: string; art: Exclude<Art, { mode: 'none' }> }

const px = (n: number) => `${n}px`;
const bg = (url: string): CSSProperties => ({ backgroundImage: `url("${url.replace(/"/g, '%22')}")` });

/** The window's size, kept current. */
function useWindowSize(win: Window | null): { width: number; height: number } {
    const read = useCallback(() => ({ width: win?.innerWidth ?? 0, height: win?.innerHeight ?? 0 }), [win]);
    const [size, setSize] = useState(read);
    useEffect(() => {
        if (!win) return undefined;
        const onResize = () => setSize(read());
        onResize();
        win.addEventListener('resize', onResize);
        return () => win.removeEventListener('resize', onResize);
    }, [win, read]);
    return size;
}

interface AppOverview { display_name?: string; minutes_playtime_forever?: number | string }
const appStore = () => (globalThis as unknown as { appStore?: { GetAppOverviewByAppID?(id: number): AppOverview | null } }).appStore;

/** Steam's local play time from its details store, when it has the game's details loaded (no request); else undefined. */
function detailsPlaytime(appId: number): unknown {
    try {
        return (globalThis as { appDetailsStore?: { GetAppDetails?(id: number): { nPlaytimeForever?: unknown } | null | undefined } }).appDetailsStore?.GetAppDetails?.(appId)?.nPlaytimeForever;
    } catch {
        return undefined;
    }
}

function overviewOf(appId: number): AppOverview | null {
    try {
        return appStore()?.GetAppOverviewByAppID?.(appId) ?? null;
    } catch {
        return null;
    }
}

/** A game's HowLongToBeat result from the plugin's cache only: the screensaver never goes online. Null when not cached. */
async function cachedHltb(appId: number): Promise<HltbResult | null> {
    const overrideId = await attempt('override read', () => overrides.get(appId), null);
    return attempt('cache read', () => cache.get<HltbResult>(hltbCacheKey(appId, overrideId)), null);
}

/** A game's achievement counts: what Steam told this session, else what Home's warm-up saved. Null when unknown. */
async function knownAchievements(appId: number): Promise<{ achieved: number; total: number } | null> {
    return memoAchievements(appId) ?? attempt('achievements cache read', () => cache.get<{ achieved: number; total: number }>(`ach:${appId}`), null);
}

/** The stats card: play time, the HowLongToBeat time being worked toward and achievements (screensaver/stats). */
function StatsCard({ appId, locale, scale }: { appId: number; locale: string; scale: number }) {
    const [known, setKnown] = useState<{ times: HltbTimes | null; achievements: { achieved: number; total: number } | null } | null>(null);
    useEffect(() => {
        let live = true;
        Promise.all([cachedHltb(appId), knownAchievements(appId)]).then(([hltb, achievements]) => {
            if (live) setKnown({ times: hltb?.status === 'found' ? hltb.times : null, achievements });
        }, () => undefined);
        return () => {
            live = false;
        };
    }, [appId]);
    if (!known) return null;
    // A shortcut's play time is only in its details (#52): the ones Home kept, or Steam's store when it has them loaded.
    const played = playedMinutesOf(overviewOf(appId)?.minutes_playtime_forever, memoPlaytime(appId) ?? detailsPlaytime(appId));
    const stats = screensaverStats(known.times, played, known.achievements, locale);
    return (
        <div className="ggs-card" style={{ '--ggs-card-k': String(cardScale(scale)) } as CSSProperties}>
            {stats.map((s) => (
                <div key={s.key}>
                    <div className="ggs-label">{s.label}</div>
                    <div className="ggs-value">{s.value}</div>
                    {s.progress !== undefined && <div className="ggs-bar"><div style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>}
                </div>
            ))}
        </div>
    );
}

function SlideView({ slide, phase, canvas, options, locale }: { slide: Slide; phase: SlidePhase; canvas: ScreensaverCanvas; options: ScreensaverOptions; locale: string }) {
    const overlays = options.logo || options.stats;
    return (
        <div className={`ggs-slide ggs-${phase}`}>
            <div className="ggs-frame">
                {slide.art.mode === 'fallback' && <div className="ggs-art ggs-blur" style={bg(slide.art.url)} />}
                <div className="ggs-art" style={bg(slide.art.url)} />
            </div>
            {overlays && (
                <div className="ggs-overlay">
                    <div className="ggs-scrim" />
                    <div className="ggs-canvas" style={{ width: canvas.logicalWidth, height: canvas.logicalHeight, transform: `scale(${canvas.scale})` }}>
                        {options.logo && (
                            <div className="ggs-titlebox">
                                <GameTitle appId={slide.appId} name={slide.name} logo className="ggs-title" logoClassName="ggs-logo" unit={px} />
                            </div>
                        )}
                        {options.stats && <StatsCard appId={slide.appId} locale={locale} scale={canvas.scale} />}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * The slideshow: the games of Home's Games row (recent games or a collection), shuffled, each SLIDE_MS with Home's art
 * (custom art first; a game without hero art shows its capsule blurred; one with no art at all is skipped). The next
 * games' art loads while a slide shows, so each change starts at once.
 */
function useSlides(): SlideStack<Slide> {
    const { homeRow, homeRowSort } = useSettings();
    // Read once per screensaver: the row does not change while it shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const games = useMemo(() => shuffled(readRowGames(homeRow, homeRowSort).games), []);
    const [slides, setSlides] = useState<SlideStack<Slide>>(EMPTY_STACK);
    useEffect(() => {
        if (games.length === 0) return undefined;
        let live = true;
        let index = -1;
        let seq = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const show = async () => {
            // The next few games load at once and the first ready is shown, so one slow to load (not installed: its art
            // comes from Steam's servers) never leaves the screen black; a game with no art at all is passed over.
            for (let tries = 0; tries < games.length && live; tries += PICK_AHEAD) {
                const picked = await firstSettled(nextIndexes(index, games.length, PICK_AHEAD).map((i) =>
                    resolveArt(games[i].appId).then((art) => (art.mode === 'none' ? null : { i, art }))));
                if (!live) return;
                if (!picked) {
                    index = nextIndexes(index, games.length, PICK_AHEAD).pop() ?? index;
                    continue;
                }
                index = picked.i;
                const game = games[index];
                const slide: Slide = { id: ++seq, appId: game.appId, name: game.name, art: picked.art };
                setSlides((stack) => nextSlides(stack, slide));
                // The old slide is dropped once it has faded out.
                setTimeout(() => live && setSlides((stack) => settledSlides(stack, slide.id)), CROSSFADE_MS + 100);
                break;
            }
            if (!live) return;
            for (const i of nextIndexes(index, games.length, PRELOAD_AHEAD)) void resolveArt(games[i].appId);
            timer = setTimeout(show, SLIDE_MS);
        };
        void show();
        return () => {
            live = false;
            if (timer !== undefined) clearTimeout(timer);
        };
    }, [games]);
    return slides;
}

function ScreensaverView({ doc, options }: { doc: Document; options: ScreensaverOptions }) {
    const { width, height } = useWindowSize(doc.defaultView);
    const canvas = screensaverCanvas(width, height);
    const slides = useSlides();
    const locale = steamLanguageToLocale(peekSteamLanguage() ?? 'english');
    return (
        <div className="ggs-root">
            <style>{screensaverCss(slideshowClasses().slideshow)}</style>
            {slideLayers(slides).map(({ slide, phase }) => (
                <SlideView key={slide.id} slide={slide} phase={phase} canvas={canvas} options={options} locale={locale} />
            ))}
            {options.statusBar && (
                <div className="ggs-status" style={{ width: canvas.logicalWidth, transform: `scale(${canvas.scale})` }}>
                    <style>{statusCss()}</style>
                    <StatusBar away={false} scale={canvas.scale} />
                </div>
            )}
        </div>
    );
}

/**
 * Always mounted (a Decky global component in Big Picture's window): while Steam's screensaver is on and the Screensaver
 * setting is on, draws Game Glance's slideshow over Steam's in the screensaver's window. Steam's Bouncing Logo (a web
 * page, no slideshow window) is left alone.
 */
export function ScreensaverHost() {
    const { screensaver } = useSettings();
    const [doc, setDoc] = useState<Document | null>(null);
    const marker = useCallback((el: HTMLSpanElement | null) => {
        if (el) setDoc(el.ownerDocument);
    }, []);
    const active = useScreensaverActive();
    // Read the settings again as the screensaver starts: right after an install Decky can load the plugin twice, and this
    // component could be the first copy's, whose settings were read before a change made in the second's Quick Access.
    useEffect(() => {
        if (active) settings.load().catch(() => undefined);
    }, [active]);
    const ssDoc = useScreensaverDocument(doc, active && screensaver.enabled);
    return (
        <>
            <span ref={marker} style={{ display: 'none' }} />
            {ssDoc && screensaver.enabled && createPortal(<ScreensaverView doc={ssDoc} options={screensaver} />, ssDoc.body)}
        </>
    );
}
