import { focusRing, MENU_DIM, menuDimColor, SURFACE_RIM } from '../styles/tokens';
import { rim, rimBorder, rule, u } from './menuCss';

/** Steam's generic confirm dialog (Restart Steam, Shut down, …): plain class names, probed on the PS5 2026-11-18. */
const DIM = '.FullModalOverlay:has(.GenericConfirmDialog)';
const BOX = '.FullModalOverlay .GenericConfirmDialog';
const ROW = `${BOX} .DialogFooter .DialogButton`;

/**
 * Steam's confirm dialogs in the Game Glance look (mock-up B, 2026-11-18): the menu's glass box over Game Glance's dim,
 * the title and text in the menu's type, and the buttons as full-width rows (Confirm first) with the menu's focus fill and
 * white ring. Steam's footer is a focus group without a direction, so Down moves between the stacked rows. Every rule
 * names the confirm dialog: nothing else changes.
 */
export function confirmDialogCss(): string {
    return [
        rule([DIM], `background:${menuDimColor()}`),
        rule([`${DIM}::before`], `content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;backdrop-filter:blur(${u(MENU_DIM.blur)})`),
        rule([`${DIM} > .ModalOverlayBackground`], 'background:transparent;backdrop-filter:none'),
        rule([BOX], `background:rgba(12,16,22,.40);backdrop-filter:blur(${u(16)});border:${rimBorder()};border-radius:${u(16)};box-shadow:${rim(SURFACE_RIM.shadow)};max-width:${u(600)}`),
        rule([`${BOX} .DialogHeader`], `color:#fff;font-weight:700;font-size:${u(26)};text-transform:none;letter-spacing:0`),
        rule([`${BOX} .DialogBodyText`], `color:rgba(255,255,255,.75);font-size:${u(18)}`),
        rule([`${BOX} .DialogFooter ._DialogColLayout`], `display:flex;flex-direction:column;gap:${u(8)};margin-top:${u(12)}`),
        rule([`${BOX} .DialogFooter ._DialogColLayout > *`], 'flex:none;margin:0;width:100%'),
        rule([ROW], `width:100%;max-width:none;min-height:${u(56)};margin:0;padding:0 ${u(20)};border:none;border-radius:${u(12)};background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);text-align:left;font-weight:700;font-size:${u(20)};box-shadow:none`),
        rule([`${ROW}.gpfocus`, `${ROW}:focus`], `background:rgba(255,255,255,.12);color:#fff;${focusRing('slice', u)}`),
    ].join('');
}
