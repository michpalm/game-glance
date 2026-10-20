import { useEffect } from 'react';
import { LOG_PREFIX } from '../constants';
import { focusElement } from '../home/homeNav';
import { asElement, cardBelowControl, controlAboveCard, CARD_NAV, cardNavTarget, cardZoneOf, CardZone, firstFeedbackControl, landingFor } from '../logic/cardNav';
import { takeSteamFocus } from '../home/steamFocus';
import { installPageFocusScrolling } from '../logic/feedbackScroll';
import { pageFeedbackSelector, pageTabsSection, playRow, playRowControlSelector } from '../styles/theme';

/** The page's tabs (Steam's What's New, Game Info, ...): where Down from Play goes (probed on the Ally). */
const TABS = '[role="tab"]';

/** Each zone's first landing: the first card, the Play pill, the selected tab (or the first). */
function firstIn(doc: Document, to: CardZone, play: string, feedback: string | null): HTMLElement | null {
    if (to === 'cards') return doc.querySelector<HTMLElement>(`.${CARD_NAV}`);
    if (to === 'play') return doc.querySelector<HTMLElement>(`${play.split(', ')[0]} [role="button"]`);
    if (to === 'feedback') return firstFeedbackControl(doc, feedback);
    return doc.querySelector<HTMLElement>(`${TABS}[aria-selected="true"]`) ?? doc.querySelector<HTMLElement>(TABS);
}

/** Brings `el` into view when it is not, as Steam's own moves scroll the page (focusElement does not scroll). */
function reveal(el: HTMLElement) {
    try {
        const r = el.getBoundingClientRect();
        const h = el.ownerDocument.defaultView?.innerHeight ?? 0;
        if (h > 0 && (r.top < 0 || r.bottom > h)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch {
        // stays where it is
    }
}

/**
 * The controller between the game page's Play row, its cards and its tabs, in the screen's order (logic/cardNav): Steam's
 * own Up and Down ran the wrong way there. Listens for Steam's controller events (vgp_onbuttondown) on the page's
 * document while `active` (the restyled page with a selectable card); a press it routes is not Steam's (preventDefault).
 */
export function useCardNav(doc: Document | null, active: boolean) {
    useEffect(() => {
        const play = playRow();
        const feedback = pageFeedbackSelector();
        const tabsLayout = pageTabsSection();
        if (!doc || !active || !play) return undefined;
        const stopFocusScrolling = installPageFocusScrolling(doc, feedback, tabsLayout);
        const memory: { row: HTMLElement | null; card: HTMLElement | null; feedback: HTMLElement | null } = { row: null, card: null, feedback: null };
        const onFocus = (e: Event) => {
            const card = (e.target as Element | null)?.closest?.(`.${CARD_NAV}`);
            if (card) memory.card = card as HTMLElement;
            const target = asElement(e.target);
            if (target && feedback && target.closest(feedback)) memory.feedback = target;
        };
        const onButton = (e: Event) => {
            try {
                const button = Number((e as CustomEvent<{ button?: number }>).detail?.button);
                const hasCards = !!doc.querySelector(`.${CARD_NAV}`);
                const from = cardZoneOf(e.target as Element | null, { play, tabs: TABS, feedback });
                const to = cardNavTarget(from, button, hasCards, firstFeedbackControl(doc, feedback) !== null);
                if (!to) return;
                const cards = [...doc.querySelectorAll<HTMLElement>(`.${CARD_NAV}`)];
                const source = asElement(e.target);
                const controls = [...doc.querySelectorAll<HTMLElement>(playRowControlSelector() ?? '[data-gg-no-controls]')]
                    .filter((x) => x.getBoundingClientRect().width > 0 && !x.matches('[disabled], [aria-disabled="true"], [role="img"]'));
                const card = source?.closest<HTMLElement>(`.${CARD_NAV}`);
                const aligned = from === 'play' && to === 'cards'
                    ? cardBelowControl(controls.find((x) => x === source || (source && x.contains(source))) ?? source, cards) : null;
                const above = from === 'cards' && to === 'play' && card ? controlAboveCard(card, cards, controls, memory.row) : null;
                const el = aligned ?? above ?? landingFor(to, memory, (zone) => firstIn(doc, zone, play, feedback), (x) => x.isConnected && (to !== 'feedback' || x.getBoundingClientRect().width > 0));
                if (!el) return;
                e.preventDefault();
                e.stopPropagation();
                // Remember the row control; Up restores it only while it remains above the selected card.
                if (from === 'play' && source) memory.row = source;
                if (from === 'feedback' && source) memory.feedback = source;
                focusElement(el, `the page's ${to}`);
                // And Steam's focus tree takes it every time, so its rows remember where focus is (focusElement hands it
                // over only when the highlight did not follow).
                takeSteamFocus(el);
                if (to === 'play' || (to === 'tabs' && !tabsLayout)) reveal(el);
            } catch (error) {
                console.warn(`${LOG_PREFIX} game page: card navigation failed`, error);
            }
        };
        doc.addEventListener('focusin', onFocus, true);
        doc.addEventListener('vgp_onbuttondown', onButton, true);
        return () => {
            stopFocusScrolling();
            doc.removeEventListener('focusin', onFocus, true);
            doc.removeEventListener('vgp_onbuttondown', onButton, true);
        };
    }, [doc, active]);
}
