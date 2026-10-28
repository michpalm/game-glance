import { DEFAULT_ACCENT, legibleAccent } from '../home/accent';

/** Approved VDL, 20 October / 25 October review. Sizes use the consuming surface's design unit. */
export const TOKENS = {
    glass: 'rgba(12,16,22,.40)', strong: 'rgba(12,16,22,.55)', solid: 'rgba(12,16,22,.75)',
    ink: '#07090c', scrim: 'rgb(5,7,10)',
    edge: 'rgba(255,255,255,.12)', raised: 'rgba(255,255,255,.18)', active: 'rgba(255,255,255,.35)',
    text: '#fff', dim: 'rgba(255,255,255,.62)', idle: 'rgba(255,255,255,.80)', label: 'rgba(255,255,255,.90)', textShadow: '0 1px 2px #0009',
    track: 'rgba(255,255,255,.14)', trackEdge: 'rgba(255,255,255,.22)',
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
export const focusRing = (kind: 'compact' | 'card' = 'compact') => `outline:2px solid rgba(255,255,255,.9);outline-offset:1px;border-color:var(--gg-edge-active);box-shadow:var(--gg-focus-shadow);background:var(--gg-glass-strong);transform:${kind === 'compact' ? 'scale(1.04)' : `translateY(${unit(-4)})`}`;
export const currentUnderline = () => `content:'';position:absolute;left:${unit(12)};right:${unit(12)};bottom:${unit(4)};height:${unit(3)};border-radius:var(--gg-r-pill);background:var(--gg-accent);pointer-events:none`;
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
