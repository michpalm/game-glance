import { ART_FILL_FILTER, EXPANDED_INSET, EXPANDED_MASK, STANDARD_HERO_ASPECT, fitMask, type HeroFit } from '../home/heroFit';

/** The launch art layer's class: inside Steam's header, over its image, under the header's scrims (its ::after). */
export const LAUNCH_ART_CLASS = 'gg-launch-art';

const url = (src: string) => `url("${src.replace(/"/g, '%22')}")`;

/**
 * Home's hero, as Home draws it in each Hero art mode (homeCss .gh-hero-full and its Fit and Expanded layers), written as
 * inline styles for the launch art layer: `fill` the blurred art fill (null in Fill), `art` the art itself. `artAspect`
 * is the art's shape (the standard hero's until known), `screenAspect` the page window's. Pure.
 */
export function launchArtLayers(src: string, fit: HeroFit, artAspect: number | null, screenAspect: number): { fill: string | null; art: string } {
    const image = `background-image: ${url(src)}; background-repeat: no-repeat;`;
    if (fit === 'fill') return { fill: null, art: `position: absolute; inset: 0; ${image} background-size: cover; background-position: center 30%;` };
    const fill = `position: absolute; inset: -120px; ${image} background-size: cover; background-position: center; filter: ${ART_FILL_FILTER};`;
    const mask = fit === 'expanded' ? EXPANDED_MASK : fitMask(artAspect ?? STANDARD_HERO_ASPECT, screenAspect);
    const box = fit === 'expanded' ? `inset: ${EXPANDED_INSET}; background-size: cover; background-position: center;` : 'inset: 0; background-size: contain; background-position: center top;';
    const masked = mask === 'none' ? '' : ` -webkit-mask-image: ${mask}; mask-image: ${mask};`;
    return { fill, art: `position: absolute; ${box} ${image}${masked}` };
}

/** The layer itself: the art clipped to Steam's header, never taking input. */
export const LAUNCH_ART_BOX = 'position: absolute; inset: 0; overflow: hidden; pointer-events: none;';
