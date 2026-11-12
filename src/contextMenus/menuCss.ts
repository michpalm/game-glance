import type { MenuClasses } from './menuClasses';
import { focusRing, labelText, MENU_DIM, menuDimColor, SURFACE_RIM } from '../styles/tokens';

/** Canvas px to Big Picture CSS px: the host sets it on :root to Home's canvas scale, so the menu scales as Home does. */
export const CTX_UNIT = '--gg-ctx-u';
const u = (n: number) => `calc(${n}px * var(${CTX_UNIT}, 1))`;
/** The Game Glance menu's rim at the menu's size: the menu draws it inside its scale() transform, so its px scale too. */
const rim = (css: string) => css.replace(/(\d*\.?\d+)px/g, (_, n: string) => u(Number(n)));
/** The rim colour's alpha as the menu's rim reaches the screen: our border snaps to one whole device pixel at full alpha,
 * the menu's scaled 1.5 px rim is antialiased over ~1.25 px. Measured on the Ally, 2026-11-13: (86,93,103) over
 * (61,67,71), the colour rgb(182,199,224) at about .21. */
const RIM_ON_SCREEN_ALPHA = '.21';
const rimBorder = () => rim(SURFACE_RIM.border).replace(/rgba\((\d+,\d+,\d+),[.\d]+\)/, `rgba($1,${RIM_ON_SCREEN_ALPHA})`);

const MENU = '.BasicUIContextMenu';
const DIM = '.FullModalOverlay:has(.BasicUIContextMenu)';
const ROW = `${MENU} .contextMenuItem`;

/** One rule; every declaration wins over Steam's own (specific) rules. Nothing here is animated. */
const rule = (selectors: string[], body: string) =>
    `${selectors.join(',')}{${body.split(';').filter(Boolean).map((d) => `${d}!important`).join(';')}}`;

/**
 * Steam's context menus in the Game Glance look (spec "A"): the menu's glass, its rows and focus, the title, the dim. A part
 * whose class Steam does not have keeps Steam's look; without the class module there is no stylesheet at all.
 */
export function contextMenuCss(c: MenuClasses | null): string {
    if (!c) return '';
    const cls = (k: keyof MenuClasses) => (c[k] ? `.${c[k]}` : null);
    const out: string[] = [
        // In gamepad mode .BasicUIContextMenu is Steam's full-screen modal layer; the menu's box is its container (probed 2026-11-12).
        rule([MENU], 'background:transparent;box-shadow:none'),
        rule([ROW], `border-radius:${u(12)};background:transparent;${labelText(u)}`),
        rule([...(cls('Focused') ? [`${ROW}${cls('Focused')}`] : []), `${ROW}.gpfocus`, `${ROW}:focus`],
            `background:rgba(255,255,255,.12);color:rgba(255,255,255,.9);${focusRing('slice', u)}`),
        rule([`${ROW}[aria-disabled="true"]`, `${ROW}:disabled`, `${ROW}.disabled`, `${ROW}[disabled]`], 'opacity:.45'),
        // The tint on the overlay; its blur on a layer inside it, behind the menu. A backdrop-filter on the overlay itself
        // would make it a backdrop root, and the box's own frost could then not reach the page (Deck, 2026-11-12).
        rule([DIM], `background:${menuDimColor()}`),
        rule([`${DIM}::before`], `content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;backdrop-filter:blur(${u(MENU_DIM.blur)})`),
        // Steam's own dim inside the overlay (85% black + 3 px blur, probed 2026-11-12): ours replaces it.
        rule([`${DIM} > .ModalOverlayBackground`], 'background:transparent;backdrop-filter:none'),
    ];
    const add = (k: keyof MenuClasses, selector: (s: string) => string, body: string) => {
        const s = cls(k);
        if (s) out.push(rule([selector(s)], body));
    };
    add('BasicContextMenuContainer', (s) => `${MENU} ${s}`, `background:rgba(12,16,22,.40);backdrop-filter:blur(${u(16)});border:${rimBorder()};border-radius:${u(16)};padding:${u(8)};box-shadow:${rim(SURFACE_RIM.shadow)}`);
    // The row whose submenu is open (Steam's `active`): a quiet fill, so the cascade shows where it came from.
    add('active', (s) => `${ROW}${s}`, 'background:rgba(255,255,255,.08)');
    add('Selected', (s) => `${ROW}${s}`, 'color:rgba(255,255,255,.9)');
    add('Destructive', (s) => `${ROW}${s}`, 'color:rgba(255,255,255,.9)');
    add('ContextMenuSeparator', (s) => `${MENU} ${s}`, `height:1px;background:rgba(255,255,255,.10);margin:${u(4)} ${u(14)}`);
    add('MenuSectionHeader', (s) => `${MENU} ${s}`, `color:rgba(255,255,255,.62);font-weight:700;font-size:${u(11)};letter-spacing:.06em`);
    add('Arrow', (s) => `${MENU} ${s}`, 'color:#fff;fill:#fff');
    add('BasicContextMenuHeader', (s) => `${DIM} ${s}`, `color:#fff;font-weight:700;text-shadow:0 ${u(1)} ${u(2)} #0009`);
    // The game menu panel (B, the mock-up): Steam's list 540 wide, the art with the name, 58-tall rows with icons and checkboxes.
    const G = (x: string) => `${DIM} ${x}`;
    out.push(
        // The art fills the top of the box edge to edge: it reaches past the list's 8 px side padding, and the box's own rounded
        // corners clip it. (Side margins on the rows instead overflowed the list: Steam's rows are width:100%.)
        rule([G('.gg-gm-hero')], `position:relative;height:${u(150)};border-radius:0;overflow:hidden;margin:0 ${u(-8)} ${u(8)}`),
        rule([G('.gg-gm-art')], 'position:absolute;inset:0;background-size:cover;background-position:center'),
        rule([G('.gg-gm-art::after')], 'content:"";position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(8,10,14,.85))'),
        rule([G('.gg-gm-hero-text')], `position:absolute;left:${u(28)};right:${u(28)};bottom:${u(16)}`),
        rule([G('.gg-gm-eyebrow')], `font-size:${u(13)};font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#fff;opacity:.75`),
        rule([G('.gg-gm-name')], `margin-top:${u(4)};font-size:${u(25)};font-weight:700;color:#fff;text-shadow:0 ${u(1)} ${u(2)} #0009;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`),
        rule([G('.gg-gm-pagehead')], `display:flex;align-items:center;gap:${u(12)};padding:${u(8)} ${u(10)} ${u(14)};color:#fff`),
        rule([G('.gg-gm-pagehead .gg-gm-chev')], `width:${u(24)};height:${u(24)};opacity:.7`),
        rule([G('.gg-gm-title')], `font-size:${u(24)};font-weight:700`),
        rule([G('.contextMenuItem.gg-gm-row')], `display:flex;align-items:center;gap:${u(16)};min-height:${u(58)};padding:0 ${u(20)};font-size:${u(21)};box-sizing:border-box`),
        rule([G('.gg-gm-label')], 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'),
        rule([G('.gg-gm-icon')], `width:${u(22)};height:${u(22)};flex:none;opacity:.9`),
        rule([G('.gg-gm-end')], `margin-left:auto;display:flex;align-items:center;gap:${u(8)};font-size:${u(18)};color:rgba(255,255,255,.55)`),
        rule([G('.gg-gm-end .gg-gm-chev')], `width:${u(20)};height:${u(20)}`),
        rule([G('.gg-gm-chk')], `width:${u(24)};height:${u(24)};border-radius:${u(7)};border:${u(2)} solid rgba(255,255,255,.55);flex:none;display:grid;place-items:center;box-sizing:border-box`),
        rule([G('.gg-gm-chk.on')], 'background:#fff;border-color:#fff'),
        rule([G('.gg-gm-chk.on::after')], `content:"";width:${u(11)};height:${u(6)};border:${u(3)} solid #10141a;border-top:0;border-right:0;transform:translateY(${u(-2)}) rotate(-45deg)`),
        rule([G('.gg-gm-lead')], 'position:relative'),
        // A Steam element that drew nothing (e.g. no Developer items): no stray icon or gap.
        rule([G('.gg-gm-lead:not(:has(.contextMenuItem))'), G('.gg-gm-steam:not(:has(.contextMenuItem))')], 'display:none'),
        rule([G('.gg-gm-lead > .gg-gm-icon')], `position:absolute;left:${u(20)};top:50%;transform:translateY(-50%);pointer-events:none;z-index:1`),
        rule([G('.gg-gm-lead .contextMenuItem')], `padding:0 ${u(20)} 0 ${u(66)};min-height:${u(58)};font-size:${u(21)};display:flex;align-items:center;box-sizing:border-box`),
        rule([G('.gg-gm-steam .contextMenuItem')], `min-height:${u(58)};font-size:${u(21)};padding:0 ${u(20)}`),
    );
    add('contextMenuContents', (s) => G(`${s}:has(.gg-gm)`), `width:${u(540)};max-width:none;padding-left:${u(8)};padding-right:${u(8)}`);
    // The box's top and side padding goes for the panel; the list takes the side inset (above), so only the art reaches the edges.
    add('BasicContextMenuContainer', (s) => G(`${s}:has(.gg-gm)`), `padding:0 0 ${u(8)}`);
    if (c.contextMenuContents) {
        const list = G(`.${c.contextMenuContents}:has(.gg-gm)`);

        // A row another plugin adds into the panel (SteamGridDB's Change Artwork…): our size, its label in line with ours.
        out.push(rule([`${list} > .contextMenuItem:not(.gg-gm-row)`], `min-height:${u(58)};font-size:${u(21)};padding:0 ${u(20)} 0 ${u(66)};display:flex;align-items:center;box-sizing:border-box`));
        // Steam's Cancel (the root adds it last, after a separator): the panel closes with B, as the mock-up.
        out.push(rule([`${list} > .contextMenuItem:last-child:not(.gg-gm-row)`, ...(c.ContextMenuSeparator ? [`${list} > .${c.ContextMenuSeparator}:nth-last-child(2)`] : [])], 'display:none'));
    }
    add('BasicContextMenuHeader', (s) => `${DIM}:has(.gg-gm) ${s}`, 'display:none');
    return out.join('\n');
}
