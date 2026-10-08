import { useEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { browserStores, capsuleUrls, heroUrls } from './artwork';
import { loadWithTimeout } from './accentSample';
import { HeroLayer, nextHeroLayers } from './heroLayers';
import { heroSources, shouldMemoArt } from './homeView';
import { HERO_FADE_MS, HERO_PRELOAD_DELAY_MS } from './motion';

type Art = { mode: 'full'; url: string } | { mode: 'fallback'; url: string } | { mode: 'none' };

const LOAD_TIMEOUT_MS = 4000;
/** Games whose resolved art is kept (more than any recents row). */
const ART_MEMO_MAX = 48;

function loads(url: string): Promise<boolean> {
    try {
        return loadWithTimeout<boolean>((done) => {
            const img = new Image();
            // Decoded before it is used, so the crossfade starts on a ready image (the background reuses the decode).
            img.onload = () => {
                try {
                    if (typeof img.decode === 'function') img.decode().then(() => done(true), () => done(true));
                    else done(true);
                } catch {
                    done(true);
                }
            };
            img.onerror = () => done(false);
            img.src = url;
        }, LOAD_TIMEOUT_MS).then((ok) => ok === true, () => false);
    } catch {
        return Promise.resolve(false);
    }
}

async function firstThatLoads(urls: string[]): Promise<string | null> {
    for (const url of urls) if (await loads(url)) return url;
    return null;
}

const artMemo = new Map<number, Art>();
/** Lookups in flight, so a pre-load and the selection share one load. */
const inFlight = new Map<number, Promise<Art>>();

function remember(appId: number, art: Art) {
    artMemo.delete(appId);
    artMemo.set(appId, art);
    while (artMemo.size > ART_MEMO_MAX) {
        const oldest = artMemo.keys().next().value;
        if (oldest === undefined) break;
        artMemo.delete(oldest);
    }
}

/** Hero art when the game has it; else the blurred-capsule fallback; else nothing (ink). Never rejects. */
function resolveArt(appId: number): Promise<Art> {
    const memo = artMemo.get(appId);
    if (memo) return Promise.resolve(memo);
    const pending = inFlight.get(appId);
    if (pending) return pending;
    const lookup = lookupArt(appId).finally(() => inFlight.delete(appId));
    inFlight.set(appId, lookup);
    return lookup;
}

async function lookupArt(appId: number): Promise<Art> {
    try {
        // Until Steam has loaded the game's details, `strHeroImage` is unknown and only the fallback is
        // possible; such a result is shown but not kept, and is re-resolved when the details arrive.
        const assets = browserStores.details(appId)?.libraryAssets;
        const detailsLoaded = assets !== undefined && assets !== null;
        const hasHeroImage = typeof assets?.strHeroImage === 'string' && assets.strHeroImage.length > 0;
        const { full, fallback } = heroSources(heroUrls(appId, browserStores), capsuleUrls(appId, browserStores));
        let art: Art = { mode: 'none' };
        const hero = await firstThatLoads(full);
        if (hero) art = { mode: 'full', url: hero };
        else {
            const url = await firstThatLoads(fallback);
            if (url) art = { mode: 'fallback', url };
        }
        if (shouldMemoArt(detailsLoaded, hasHeroImage, art.mode)) remember(appId, art);
        return art;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: hero art lookup failed`, error);
        return { mode: 'none' };
    }
}

const sameArt = (a: Art | undefined, b: Art) =>
    a !== undefined && a.mode === b.mode && (a.mode === 'none' || (b.mode !== 'none' && a.url === b.url));

const bg = (url: string) => ({ backgroundImage: `url("${url.replace(/"/g, '%22')}")` });

function Layer({ art, settled, direction }: { art: Art; settled: boolean; direction?: 'left' | 'right' | 'none' }) {
    const dirCls = direction === 'left' ? ' gh-hero-in-left' : direction === 'right' ? ' gh-hero-in-right' : '';
    const cls = `gh-hero-layer${settled ? ' gh-hero-settled' : ''}${dirCls}`;
    if (art.mode === 'full') {
        return (
            <div className={cls}>
                <div className="gh-hero-full" style={bg(art.url)} />
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
 * `direction`: 'left' | 'right' | 'none', applies a directional zoom-in entrance aligned with recents navigation.
 */
export function HeroBackground({
    appId,
    detailsVersion,
    neighbours = [],
    direction = 'none',
}: {
    appId: number | null;
    detailsVersion: number;
    neighbours?: number[];
    direction?: 'left' | 'right' | 'none';
}) {
    const [layers, setLayers] = useState<Array<HeroLayer<Art>>>([]);
    const nextId = useRef(0);
    const shown = useRef<Art | undefined>(undefined);
    const directionRef = useRef(direction);
    directionRef.current = direction;

    useEffect(() => {
        if (appId === null) {
            shown.current = undefined;
            setLayers([]);
            return undefined;
        }
        let active = true;
        let prune: ReturnType<typeof setTimeout> | undefined;
        const currentDir = directionRef.current;
        resolveArt(appId).then((art) => {
            if (!active || sameArt(shown.current, art)) return; // re-resolved to what is already up
            shown.current = art;
            const id = ++nextId.current;
            setLayers((current) => nextHeroLayers(current, { id, art, direction: currentDir }, Date.now(), HERO_FADE_MS));
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
                <Layer key={layer.id} art={layer.art} settled={layer.settled} direction={layer.direction} />
            ))}
        </div>
    );
}
