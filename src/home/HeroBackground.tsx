import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { browserStores, capsuleUrls, heroUrls } from './artwork';
import { displayInfo, loadArt } from './artShrink';
import { HeroLayer, nextHeroLayers, settledHeroLayers } from './heroLayers';
import { HeroFit, STANDARD_HERO_ASPECT, fitMask, windowAspect } from './heroFit';
import { heroSources, shouldMemoArt } from './homeView';
import { HERO_FADE_MS, HERO_PRELOAD_DELAY_MS } from './motion';

export type Art = { mode: 'full'; url: string } | { mode: 'fallback'; url: string } | { mode: 'none' };

/** Games whose resolved art is kept (more than any recents row). */
const ART_MEMO_MAX = 48;

/**
 * The first url that loads, decoded, as the url to draw: a smaller copy when the file is far bigger than the screen or a
 * big PNG (home/artShrink), so showing it never waits on a long decode.
 */
async function firstThatLoads(urls: string[]): Promise<string | null> {
    const screen = displayInfo();
    for (const url of urls) {
        const drawn = await loadArt(url, screen);
        if (drawn) return drawn;
    }
    return null;
}

/** Resolved art by game, with the url list it came from (Steam can list another file once it loads the game's details). */
const artMemo = new Map<number, { key: string; art: Art }>();
/** Lookups in flight, so a pre-load and the selection share one load. */
const inFlight = new Map<string, Promise<Art>>();

function remember(appId: number, key: string, art: Art) {
    artMemo.delete(appId);
    artMemo.set(appId, { key, art });
    while (artMemo.size > ART_MEMO_MAX) {
        const oldest = artMemo.keys().next().value;
        if (oldest === undefined) break;
        artMemo.delete(oldest);
    }
}

/** A game's art urls now (hero files, then the fallback capsules) and their memo key. */
function artSources(appId: number): { full: string[]; fallback: string[]; key: string } {
    const { full, fallback } = heroSources(heroUrls(appId, browserStores), capsuleUrls(appId, browserStores));
    return { full, fallback, key: `${full.join('|')}||${fallback.join('|')}` };
}

/** The art remembered for a game's current url list, or undefined. */
function knownArt(appId: number): Art | undefined {
    const entry = artMemo.get(appId);
    if (!entry) return undefined;
    try {
        return entry.key === artSources(appId).key ? entry.art : undefined;
    } catch {
        return undefined;
    }
}

/** Whether a game's art is already resolved this session (the warm-up skips it). */
export function artKnown(appId: number): boolean {
    return knownArt(appId) !== undefined;
}

/** Hero art when the game has it; else the blurred-capsule fallback; else nothing (ink). Never rejects. */
export function resolveArt(appId: number): Promise<Art> {
    let sources: ReturnType<typeof artSources>;
    try {
        sources = artSources(appId);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: hero art urls failed`, error);
        return Promise.resolve({ mode: 'none' });
    }
    const memo = artMemo.get(appId);
    if (memo && memo.key === sources.key) return Promise.resolve(memo.art);
    const flight = `${appId}|${sources.key}`;
    const pending = inFlight.get(flight);
    if (pending) return pending;
    const lookup = lookupArt(appId, sources).finally(() => inFlight.delete(flight));
    inFlight.set(flight, lookup);
    return lookup;
}

async function lookupArt(appId: number, { full, fallback, key }: ReturnType<typeof artSources>): Promise<Art> {
    try {
        // Until Steam has loaded the game's details, `strHeroImage` is unknown: a fallback then is shown but not kept.
        const assets = browserStores.details(appId)?.libraryAssets;
        const detailsLoaded = assets !== undefined && assets !== null;
        const hasHeroImage = typeof assets?.strHeroImage === 'string' && assets.strHeroImage.length > 0;
        let art: Art = { mode: 'none' };
        const hero = await firstThatLoads(full);
        if (hero) art = { mode: 'full', url: hero };
        else {
            const url = await firstThatLoads(fallback);
            if (url) art = { mode: 'fallback', url };
        }
        if (shouldMemoArt(detailsLoaded, hasHeroImage, art.mode)) remember(appId, key, art);
        return art;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: hero art lookup failed`, error);
        return { mode: 'none' };
    }
}

/** The game whose art Home shows now, and that art (the open transition morphs only over a game's own full hero). */
let shownNow: { appId: number; art: Art } | null = null;

/** The game Home's hero shows now, or null. */
export function heroShownApp(): number | null {
    return shownNow?.appId ?? null;
}

/** A game's hero art as Home shows or last resolved it (null when unknown); never loads anything. */
export function heroArtFor(appId: number): Art | null {
    if (shownNow?.appId === appId) return shownNow.art;
    return artMemo.get(appId)?.art ?? null;
}

const sameArt = (a: Art | undefined, b: Art) =>
    a !== undefined && a.mode === b.mode && (a.mode === 'none' || (b.mode !== 'none' && a.url === b.url));

const bg = (url: string) => ({ backgroundImage: `url("${url.replace(/"/g, '%22')}")` });

/**
 * The full-art hero's style: the art, and in Fit the fade where it meets the art fill (heroFit.fitMask), for the art's
 * shape (the standard hero shape until it is known) in a box of `boxAspect`. Pure.
 */
export function heroFullStyle(url: string, fit: HeroFit, artAspect: number | null, boxAspect: number): CSSProperties {
    if (fit === 'fill') return bg(url);
    return { ...bg(url), '--gh-hero-mask': fitMask(artAspect ?? STANDARD_HERO_ASPECT, boxAspect) } as CSSProperties;
}

const artAspects = new Map<string, number>();

/** The art's width / height once known (its file is already decoded by then, so this is quick); null before. */
function useArtAspect(url: string | null): number | null {
    const [aspect, setAspect] = useState<number | null>(() => (url ? artAspects.get(url) ?? null : null));
    useEffect(() => {
        if (!url) return setAspect(null);
        const known = artAspects.get(url);
        if (known) return setAspect(known);
        setAspect(null);
        let live = true;
        const img = new Image();
        img.onload = () => {
            if (!(img.naturalWidth > 0 && img.naturalHeight > 0)) return;
            const value = img.naturalWidth / img.naturalHeight;
            artAspects.set(url, value);
            if (live) setAspect(value);
        };
        img.src = url;
        return () => {
            live = false;
        };
    }, [url]);
    return aspect;
}

/** The shape of the screen `ref`'s element is drawn on (heroFit.windowAspect), following resizes (a Deck docked to a TV). */
function useScreenAspect(ref: { current: HTMLElement | null }, active: boolean): number {
    const [aspect, setAspect] = useState(16 / 9);
    useLayoutEffect(() => {
        const win = ref.current?.ownerDocument?.defaultView;
        if (!active || !win) return undefined;
        const read = () => setAspect(windowAspect(win));
        read();
        win.addEventListener('resize', read);
        return () => win.removeEventListener('resize', read);
    }, [ref, active]);
    return aspect;
}

function Layer({ art, settled }: { art: Art; settled: boolean }) {
    const cls = `gh-hero-layer${settled ? ' gh-hero-settled' : ''}`;
    const { heroFit } = useSettings();
    const fit = art.mode === 'full' ? heroFit : 'fill';
    const ref = useRef<HTMLDivElement>(null);
    const aspect = useArtAspect(art.mode === 'full' && fit === 'fit' ? art.url : null);
    const screen = useScreenAspect(ref, fit === 'fit');
    if (art.mode === 'full') {
        return (
            <div className={cls} ref={ref}>
                <div className={`gh-hero-full${fit === 'fit' ? ' gh-hero-fit' : ''}`} style={heroFullStyle(art.url, fit, aspect, screen)} />
            </div>
        );
    }
    if (art.mode === 'fallback') {
        return (
            <div className={cls}>
                <div className="gh-hero-blur" style={bg(art.url)} />
                <div className="gh-hero-sharp" style={bg(art.url)} />
            </div>
        );
    }
    return <div className={`${cls} gh-hero-none`} />;
}

/**
 * Full-bleed art for the selected game. A new game's art is loaded (and decoded) first, then fades in (HERO_FADE_MS)
 * over the previous one, which is dropped once the fade is done. A switch during a fade settles the fading layer at
 * once instead of stacking fades (heroLayers.nextHeroLayers). No spinner: until the art loads, the last one stays.
 * `neighbours`: the games either side of the selection; once the selection has rested briefly their art is
 * pre-loaded (local steamloopback files, at most 2 x HERO_PRELOAD_RADIUS, deduplicated), so the next switch starts at once.
 */
export function HeroBackground({ appId, detailsVersion, neighbours = [] }: { appId: number | null; detailsVersion: number; neighbours?: number[] }) {
    const [layers, setLayers] = useState<Array<HeroLayer<Art>>>([]);
    const nextId = useRef(0);
    const shown = useRef<Art | undefined>(undefined);

    // Nothing on screen yet (Home back on B, once its selection is restored): a known art is there before the first paint,
    // settled, instead of fading in from black.
    useLayoutEffect(() => {
        if (appId === null) return;
        const known = knownArt(appId) ?? null;
        const settled = settledHeroLayers(shown.current !== undefined, known, Date.now());
        if (!settled || !known) return;
        shown.current = known;
        shownNow = { appId, art: known };
        setLayers(settled);
    }, [appId]);

    useEffect(() => {
        if (appId === null) {
            shown.current = undefined;
            shownNow = null;
            setLayers([]);
            return undefined;
        }
        let active = true;
        let prune: ReturnType<typeof setTimeout> | undefined;
        resolveArt(appId).then((art) => {
            if (!active) return;
            shownNow = { appId, art };
            if (sameArt(shown.current, art)) return; // re-resolved to what is already up
            shown.current = art;
            const id = ++nextId.current;
            setLayers((current) => nextHeroLayers(current, { id, art }, Date.now(), HERO_FADE_MS));
            prune = setTimeout(() => setLayers((current) => current.filter((layer) => layer.id >= id)), HERO_FADE_MS + 50);
        }, () => undefined);
        return () => {
            active = false;
            if (prune !== undefined) clearTimeout(prune);
        };
    }, [appId, detailsVersion]);

    const neighbourKey = neighbours.join(',');
    useEffect(() => {
        if (neighbours.length === 0) return undefined;
        const timer = setTimeout(() => {
            for (const id of neighbours) void resolveArt(id);
        }, HERO_PRELOAD_DELAY_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [neighbourKey]);

    return (
        <div className="gh-hero" aria-hidden="true">
            {layers.map((layer) => (
                <Layer key={layer.id} art={layer.art} settled={layer.settled} />
            ))}
        </div>
    );
}
