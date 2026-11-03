import { acquireHomeFooter, discoverNativeFooter } from '../home/homeControlsDom';
import { homeFooterCss } from '../home/homeControlsCss';
import { getSteamUiState, subscribeSteamUiState } from '../home/steamUiState';
import { installCalmFilter } from '../styles/tokens';
import { chromeOwnsBar } from '../chrome/useChrome';
import type { Stop } from './model';

interface FooterUi { get(): { foreground: boolean; menu: boolean }; subscribe(listener: Stop): Stop }
/** A retained but hidden/inert page cannot reclaim a visual footer lease. While the chrome host draws the bar it owns
 * the footer on every page, so no page marker is needed; with the host off, only Home's own roots count. */
export function pageFooterCanRestore(doc: Document): boolean {
    if (doc.visibilityState === 'hidden') return false;
    if (chromeOwnsBar()) return true;
    return [...doc.querySelectorAll<HTMLElement>('.gh-root,.gg-hero')].some(node => {
        if (!node.isConnected || node.closest('[hidden],[inert],[aria-hidden="true"]') || node.getClientRects().length === 0) return false;
        for (let at: HTMLElement | null = node; at; at = at.parentElement) {
            const css = doc.defaultView?.getComputedStyle?.(at);
            if (css?.display === 'none' || css?.visibility === 'hidden' || css?.opacity === '0') return false;
        }
        return true;
    });
}
export interface MenuPageFooter { handoff(): void; dispose(): void }
/** Retain only an already-visible footer. This owns appearance, never handlers or Home input. */
export function holdPageFooter(doc: Document, options: { restyle: boolean; canRestore?(): boolean; ui?: FooterUi }): MenuPageFooter | null {
    const found = discoverNativeFooter(doc.documentElement), view = doc.defaultView;
    if (!found) return null;
    const footer = found.footer;
    for (let e: HTMLElement | null = footer; e; e = e.parentElement) {
        const s = view?.getComputedStyle?.(e);
        if (s?.display === 'none' || s?.visibility === 'hidden' || s?.opacity === '0') return null;
    }
    if (!options.restyle) return { handoff() {}, dispose() {} };
    const lease = acquireHomeFooter(doc.documentElement, () => {});
    const sheet = doc.createElement('style');
    sheet.dataset.ggMenuPageFooter = 'true'; sheet.textContent = homeFooterCss;
    let releaseFilter: Stop;
    try { doc.head.appendChild(sheet); releaseFilter = installCalmFilter(doc); }
    catch (error) { lease.dispose(); sheet.remove(); throw error; }
    const ui = options.ui ?? { get: () => getSteamUiState(doc), subscribe: (listener: Stop) => subscribeSteamUiState(doc, listener) };
    let stopped = false, waiting = false, stopUi: Stop | undefined;
    let observer: MutationObserver | undefined;
    function dispose() {
        if (stopped) return;
        stopped = true; observer?.disconnect(); stopUi?.(); doc.removeEventListener('visibilitychange', check);
        lease.dispose(); sheet.remove(); releaseFilter();
    }
    function check() {
        if (stopped || !waiting) return;
        if (!doc.getElementById('Footer')?.isConnected || options.canRestore?.() === false) return dispose();
        const state = ui.get();
        if (!state.foreground || state.menu || !lease.shared()) return;
        // Home/page reacquires its marker before React commits its stylesheet. Keep both until that commit.
        const styled = [...doc.querySelectorAll('style')].some(e => e !== sheet && e.textContent?.includes('[data-gh-footer-side]'));
        if (styled) dispose();
    }
    return {
        dispose,
        handoff() {
            if (stopped || waiting) return;
            waiting = true;
            const Observer = (view as (Window & { MutationObserver?: typeof MutationObserver }) | null)?.MutationObserver;
            observer = Observer ? new Observer(check) : undefined;
            observer?.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden','inert','aria-hidden','style','class'] });
            doc.addEventListener('visibilitychange', check);
            const stop = ui.subscribe(check);
            if (stopped) stop(); else stopUi = stop;
            check();
        },
    };
}
