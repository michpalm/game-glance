import { DEFAULT_ACCENT, legibleAccent } from '../home/accent';

/** Approved VDL, 20 October / 25 October review. Sizes use the consuming surface's design unit. */
export const TOKENS = {
    glass: 'rgba(12,16,22,.40)', strong: 'rgba(12,16,22,.55)', solid: 'rgba(12,16,22,.75)',
    ink: '#07090c', scrim: 'rgb(5,7,10)',
    edge: 'rgba(255,255,255,.12)', raised: 'rgba(255,255,255,.18)', active: 'rgba(255,255,255,.35)',
    text: '#fff', dim: 'rgba(255,255,255,.62)', idle: 'rgba(255,255,255,.80)', label: 'rgba(255,255,255,.90)', textShadow: '0 1px 2px #0009',
    selected: 'rgba(255,255,255,.14)', track: 'rgba(255,255,255,.14)', trackEdge: 'rgba(255,255,255,.22)',
    glassBlur: 16, artBlur: 42,
    radius: { small: 8, card: 12, panel: 16, pill: 999 },
    type: { heading: 20, body: 16, label: 11, tab: 13, value: 20, bodyWeight: 700, headingWeight: 800 },
    space: [4, 8, 12, 16, 24, 32],
    motion: { fast: 150, base: 250, accent: 500 },
} as const;

export const unit = (value: number) => `calc(var(--gg-d,1px) * ${value})`;
export function tokenCss(selector: string): string {
    return `@property --gg-accent{syntax:'<color>';inherits:true;initial-value:${DEFAULT_ACCENT}}
${selector}{
--gg-glass:${TOKENS.glass};--gg-glass-strong:${TOKENS.strong};--gg-glass-solid:${TOKENS.solid};
--gg-ink:${TOKENS.ink};--gg-scrim:${TOKENS.scrim};--gg-glass-blur:${unit(TOKENS.glassBlur)};
--gg-edge:${TOKENS.edge};--gg-edge-raised:${TOKENS.raised};--gg-edge-active:${TOKENS.active};
--gg-text:${TOKENS.text};--gg-text-dim:${TOKENS.dim};--gg-text-idle:${TOKENS.idle};--gg-text-shadow:${TOKENS.textShadow};
--gg-selected:${TOKENS.selected};--gg-selected-edge:inset 0 -2px 0 color-mix(in srgb,var(--gg-accent) 55%,transparent);
--gg-track:${TOKENS.track};--gg-track-edge:inset 0 0 0 1px ${TOKENS.trackEdge};
--gg-accent:${DEFAULT_ACCENT};--gg-accent-text:${legibleAccent(DEFAULT_ACCENT)};--gg-on-accent:#fff;
--gg-r-small:${unit(TOKENS.radius.small)};--gg-r-card:${unit(TOKENS.radius.card)};--gg-r-panel:${unit(TOKENS.radius.panel)};--gg-r-pill:${TOKENS.radius.pill}px;
--gg-type-heading:${unit(TOKENS.type.heading)};--gg-type-body:${unit(TOKENS.type.body)};--gg-type-label:${unit(TOKENS.type.label)};--gg-type-tab:${unit(TOKENS.type.tab)};--gg-type-value:${unit(TOKENS.type.value)};
--gg-weight-body:${TOKENS.type.bodyWeight};--gg-weight-heading:${TOKENS.type.headingWeight};
--gg-fast:${TOKENS.motion.fast}ms;--gg-base:${TOKENS.motion.base}ms;--gg-accent-duration:${TOKENS.motion.accent}ms;
--gg-focus-shadow:0 14px 40px -8px var(--gg-accent);
--gg-art-fill:blur(${unit(TOKENS.artBlur)}) saturate(1.25) brightness(.8);
--gg-art-fill-dim:blur(${unit(TOKENS.artBlur)}) saturate(.7) brightness(.5);
--gg-empty-fill:linear-gradient(160deg,rgba(255,255,255,.10) 0%,rgba(12,16,22,.35) 75%);
}
@media(prefers-reduced-motion:reduce){${selector}{--gg-fast:0ms;--gg-base:0ms;--gg-accent-duration:0ms}}`;
}
export function glassSurface(level: 'glass' | 'strong' | 'solid' = 'glass'): string {
    const name = level === 'glass' ? '--gg-glass' : `--gg-glass-${level}`;
    return `background:var(${name});border:1px solid var(--gg-edge);backdrop-filter:blur(var(--gg-glass-blur))`;
}
export const artFill = (dim = false) => `filter:var(--gg-art-fill${dim ? '-dim' : ''})`;
/** The in-game menu's ring follows the control's shape: outside a card, just inside a slice. It sets no fill or shadow, so a selected item keeps its mark.
 * Section 7: 'lift' raises a feed or info card 4 units, 'level' keeps a capsule in its row; both add a neutral shadow, never the accent.
 * `u` writes the surface's unit (the page's d units, so its ring is Home's 2 canvas px at the hand-over). */
export const focusRing = (kind: 'compact' | 'card' | 'menu' | 'slice' | 'lift' | 'level' = 'compact', u: (n: number) => string = (n) => `${n}px`) => {
    if (kind === 'menu' || kind === 'slice') return `outline:${u(2)} solid #fff;outline-offset:${u(kind === 'menu' ? 2 : -2)};transform:none`;
    if (kind === 'lift' || kind === 'level') return `outline:${u(2)} solid #fff;outline-offset:${u(2)};box-shadow:0 ${u(14)} ${u(28)} ${u(-12)} rgba(0,0,0,.75);transform:${kind === 'lift' ? `translateY(${u(-4)})` : 'none'}`;
    return `outline:2px solid rgba(255,255,255,.9);outline-offset:1px;border-color:var(--gg-edge-active);box-shadow:var(--gg-focus-shadow);background:var(--gg-glass-strong);transform:${kind === 'compact' ? 'scale(1.04)' : `translateY(${unit(-4)})`}`;
};
/** Section 7: action corners are a share of the button's height, so Home's Play scales into the page's with the same corner. */
export const actionRadius = (height: number, kind: 'action' | 'icon') => Math.round(height * (kind === 'action' ? .36 : .30));
/** The shader's calm (qam-frost.fx.in) in CSS: off until the Ally shows Steam's browser keeps the blur with an SVG filter in backdrop-filter. */
export const CALM_IN_CSS: boolean = false;
export const CALM_FILTER_ID = 'gg-calm';
export const calmTable = () => Array.from({ length: 21 }, (_, i) => {
    const x = i / 20;
    return +(x <= .45 ? x : .45 + (x - .45) * .35).toFixed(4);
}).join(' ');
/** One frost for every glass surface: background and backdrop only; each surface keeps its own border. */
export const frostSurface = (blur: string, level: 'glass' | 'strong' = 'glass') =>
    `background:${level === 'glass' ? TOKENS.glass : TOKENS.strong};backdrop-filter:blur(${blur})${CALM_IN_CSS ? ` url(#${CALM_FILTER_ID})` : ''}`;
/** Small text over art or glass: the menu's 90% white with its shadow. */
export const labelText = () => `color:${TOKENS.label};text-shadow:${TOKENS.textShadow}`;
export const currentUnderline = () => `content:'';position:absolute;left:${unit(12)};right:${unit(12)};bottom:${unit(4)};height:${unit(3)};border-radius:var(--gg-r-pill);background:var(--gg-accent);pointer-events:none`;
/** Section 6: a selected tab, option, friend or bell is a soft shade with a faint accent line. */
export const selectedSlice = () => 'background:var(--gg-selected);color:var(--gg-text);box-shadow:var(--gg-selected-edge)';
export const onFill = () => 'background:var(--gg-accent);color:var(--gg-on-accent)';
export const ghost = () => 'filter:grayscale(.6) brightness(.75);border-color:rgba(255,255,255,.06)';
export function applyAccent(root: HTMLElement, color: string | null | undefined): void {
    const accent = color && /^#[\da-f]{6}$/i.test(color) ? color : DEFAULT_ACCENT;
    root.style.setProperty('--gg-accent', accent);
    root.style.setProperty('--gg-accent-text', legibleAccent(accent));
}

const sheets = new WeakMap<Document, Map<string, { node: HTMLStyleElement; users: number }>>();
/** Each native document owns its stylesheet. Borrowers cannot remove another surface's tokens. */
export function installTokenCss(document: Document, selector: string): () => void {
    let entries = sheets.get(document);
    if (!entries) { entries = new Map(); sheets.set(document, entries); }
    let entry = entries.get(selector);
    if (!entry) {
        const node = document.createElement('style');
        node.dataset.ggTokens = 'true'; node.textContent = tokenCss(selector);
        document.head.appendChild(node); entry = { node, users: 0 }; entries.set(selector, entry);
    }
    entry.users++;
    let released = false;
    return () => {
        if (released) return; released = true;
        if (--entry!.users === 0) { entry!.node.remove(); entries!.delete(selector); }
        if (!entries!.size) sheets.delete(document);
    };
}

const calmFilters = new WeakMap<Document, { node: Element; users: number }>();
/** One hidden SVG holding the calm filter per document, shared like the token sheet. Does nothing while CALM_IN_CSS is off. */
export function installCalmFilter(document: Document): () => void {
    if (!CALM_IN_CSS) return () => {};
    let entry = calmFilters.get(document);
    if (!entry) {
        const funcs = ['R', 'G', 'B'].map((c) => `<feFunc${c} type="table" tableValues="${calmTable()}"/>`).join('');
        const host = document.createElement('div');
        host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" style="position:absolute"><filter id="${CALM_FILTER_ID}" color-interpolation-filters="sRGB"><feComponentTransfer>${funcs}</feComponentTransfer></filter></svg>`;
        const node = host.firstElementChild!;
        document.body.appendChild(node); entry = { node, users: 0 }; calmFilters.set(document, entry);
    }
    entry.users++;
    let released = false;
    return () => {
        if (released) return; released = true;
        if (--entry!.users === 0) { entry!.node.remove(); calmFilters.delete(document); }
    };
}
