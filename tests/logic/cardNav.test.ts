import { describe, expect, it } from 'vitest';
import { asElement, controlAboveCard, cardBelowControl, CARD_NAV, cardNavTarget, cardZoneOf, DPAD_DOWN, DPAD_UP, firstFeedbackControl, landingFor } from '../../src/logic/cardNav';
import { parseHTML } from 'linkedom';
import { playRowSelector } from '../../src/styles/themeCss';

describe('cardNavTarget', () => {
    it("Down from the Play row reaches the cards, below it on screen (Steam's tree has them before it: Up did)", () => {
        expect(cardNavTarget('play', DPAD_DOWN, true)).toBe('cards');
    });
    it("from the cards: Up to the Play row, Down to the page's tabs (where Down from Play went)", () => {
        expect(cardNavTarget('cards', DPAD_UP, true)).toBe('play');
        expect(cardNavTarget('cards', DPAD_DOWN, true)).toBe('tabs');
    });
    it('Up from the tabs comes back to the cards', () => {
        expect(cardNavTarget('tabs', DPAD_UP, true)).toBe('cards');
    });
    it('includes visible feedback between the cards and tabs in both directions', () => {
        expect(cardNavTarget('cards', DPAD_DOWN, true, true)).toBe('feedback');
        expect(cardNavTarget('tabs', DPAD_UP, true, true)).toBe('feedback');
        expect(cardNavTarget('feedback', DPAD_UP, true, true)).toBe('cards');
        expect(cardNavTarget('feedback', DPAD_DOWN, true, true)).toBe('tabs');
        expect(cardNavTarget('feedback', 11, true, true)).toBeNull();
        expect(cardNavTarget('feedback', 12, true, true)).toBeNull();
    });
    it("everything else is Steam's own: other buttons, other places, or no card to go to", () => {
        expect(cardNavTarget('play', DPAD_UP, true)).toBeNull();
        expect(cardNavTarget('tabs', DPAD_DOWN, true)).toBeNull();
        expect(cardNavTarget('cards', 11, true)).toBeNull();
        expect(cardNavTarget('cards', 12, true)).toBeNull();
        expect(cardNavTarget(null, DPAD_DOWN, true)).toBeNull();
        expect(cardNavTarget('play', DPAD_DOWN, false)).toBeNull();
        expect(cardNavTarget('tabs', DPAD_UP, false)).toBeNull();
    });
});

describe('cardZoneOf', () => {
    const el = (matches: string[]) => ({ closest: (sel: string) => (sel.split(',').some((s) => matches.includes(s.trim())) ? {} : null) }) as unknown as Element;
    const sel = { play: '.play, .menu', tabs: '[role="tab"]' };
    it('a card, the Play row (any of its buttons) or the tabs; null elsewhere', () => {
        expect(cardZoneOf(el([`.${CARD_NAV}`]), sel)).toBe('cards');
        expect(cardZoneOf(el(['.menu']), sel)).toBe('play');
        expect(cardZoneOf(el(['[role="tab"]']), sel)).toBe('tabs');
        expect(cardZoneOf(el([]), sel)).toBeNull();
        expect(cardZoneOf(null, sel)).toBeNull();
        // Without Steam's classes there is no Play row to know.
        expect(cardZoneOf(el(['.menu']), { play: null, tabs: '[role="tab"]' })).toBeNull();
    });
    it('recognises a response button and its nested contents as feedback', () => {
        const { document } = parseHTML('<div class="feedback"><button><span id="label">Yes</span></button></div>');
        expect(cardZoneOf(document.querySelector('#label'), { ...sel, feedback: '.feedback' })).toBe('feedback');
    });
});

describe('preferred-copy vertical navigation', () => {
    it('Down from the separate library link reaches a card, and Up returns to that link', () => {
        const { document } = parseHTML('<div class="actions"><button>Play</button></div><div class="library"><a role="button">Native action</a></div><div class="gg-copy-pill" role="button"><span id="copy">Your library +</span></div>');
        const play = playRowSelector({ root: { ActionButtonAndStatusPanel: 'actions' }, play: { MenuButton: 'menu', CloudStatusRow: 'cloud' }, shared: { SharedLibrary: 'library' } });
        const link = document.querySelector('.gg-copy-pill')!;
        const zone = cardZoneOf(document.querySelector('#copy'), { play, tabs: '[role="tab"]' });
        expect(zone).toBe('play');
        expect(cardNavTarget(zone, DPAD_DOWN, true)).toBe('cards');
        expect(landingFor(cardNavTarget('cards', DPAD_UP, true)!, { row: link, card: null }, () => null, () => true)).toBe(link);
    });
});

describe('firstFeedbackControl', () => {
    it('skips hidden and disabled controls, and finds the first usable response', () => {
        const { document } = parseHTML('<div class="feedback"><button id="hidden">Hidden</button><button disabled>Disabled</button><button aria-disabled="true">Unavailable</button><button id="yes">Yes</button></div>');
        for (const el of document.querySelectorAll('.feedback, button')) {
            el.getBoundingClientRect = () => ({ width: el.id === 'hidden' ? 0 : 100 }) as DOMRect;
        }
        expect(firstFeedbackControl(document as unknown as Document, '.feedback')).toBe(document.querySelector('#yes'));
    });
    it('does not create a navigation stop for an empty or hidden feedback row', () => {
        const { document } = parseHTML('<div class="feedback" hidden><button>Yes</button></div><div class="feedback"></div>');
        for (const el of document.querySelectorAll('.feedback, button')) el.getBoundingClientRect = () => ({ width: 100 }) as DOMRect;
        expect(firstFeedbackControl(document as unknown as Document, '.feedback')).toBeNull();
        expect(firstFeedbackControl(document as unknown as Document, null)).toBeNull();
    });
});

describe('landingFor', () => {
    const live = (x: string) => !x.startsWith('gone');
    const first = (to: string) => `first-${to}`;
    it("Up from the cards returns to the Play row's button Down left from (Steam's row remembers it: Right went on from there)", () => {
        expect(landingFor('play', { row: 'controller', card: null }, first, live)).toBe('controller');
        expect(landingFor('play', { row: null, card: null }, first, live)).toBe('first-play');
        expect(landingFor('play', { row: 'gone-controller', card: null }, first, live)).toBe('first-play');
    });
    it('the cards: the one last selected, else the first; the tabs: always found afresh', () => {
        expect(landingFor('cards', { row: null, card: 'hltb' }, first, live)).toBe('hltb');
        expect(landingFor('cards', { row: null, card: 'gone-hltb' }, first, live)).toBe('first-cards');
        expect(landingFor('tabs', { row: 'controller', card: 'hltb' }, first, live)).toBe('first-tabs');
    });
    it('returns to the last feedback response, or finds a new one if it disappeared', () => {
        expect(landingFor('feedback', { row: null, card: null, feedback: 'no' }, first, live)).toBe('no');
        expect(landingFor('feedback', { row: null, card: null, feedback: 'gone-no' }, first, live)).toBe('first-feedback');
    });
});

describe('asElement', () => {
    it("takes an element from another window too (Steam's page is not Game Glance's window: instanceof failed there)", () => {
        const foreign = { nodeType: 1, focus: () => undefined, closest: () => null };
        expect(asElement(foreign)).toBe(foreign);
        expect(asElement(null)).toBeNull();
        expect(asElement({ nodeType: 3 })).toBeNull();
        expect(asElement('x')).toBeNull();
    });
});

describe('card below the family/store selectors', () => {
    const rect = (x: number, width: number) => ({ x, width }) as DOMRect;
    it('lands on the card below the pill, independent of the previously selected card', () => {
        const { document } = parseHTML('<div class="gg-copy-pill"><span id="label">Family</span></div><div class="gg-store-choice"></div><div id="description"></div><div id="hltb"></div>');
        const family = document.querySelector('.gg-copy-pill')!;
        const store = document.querySelector('.gg-store-choice')!;
        const description = document.querySelector('#description') as unknown as HTMLElement;
        const hltb = document.querySelector('#hltb') as unknown as HTMLElement;
        family.getBoundingClientRect = () => rect(1000, 200);
        store.getBoundingClientRect = () => rect(1250, 100);
        description.getBoundingClientRect = () => rect(50, 650);
        hltb.getBoundingClientRect = () => rect(900, 450);
        expect(cardBelowControl(family, [description, hltb])).toBe(hltb);
        expect(cardBelowControl(store, [description, hltb])).toBe(hltb);
        hltb.getBoundingClientRect = () => rect(900, 0);
        expect(cardBelowControl(family, [description, hltb])).toBe(description);
    });
    it('leaves the normal action row and missing cards to the existing remembered landing', () => {
        const { document } = parseHTML('<button>Play</button><div class="gg-copy-pill"></div>');
        expect(cardBelowControl(document.querySelector('button'), [])).toBeNull();
        expect(cardBelowControl(document.querySelector('.gg-copy-pill'), [])).toBeNull();
    });
});

describe('card and button alignment', () => {
    it('ignores a remembered button on the opposite side in both directions', () => {
        const { document } = parseHTML('<div id="play"></div><div id="family"></div><div id="description"></div><div id="hltb"></div>');
        const el = (id: string, x: number, width: number) => {
            const item = document.querySelector('#' + id) as unknown as HTMLElement;
            item.getBoundingClientRect = () => ({ x, width }) as DOMRect;
            return item;
        };
        const play = el('play', 50, 340), family = el('family', 1050, 200);
        const description = el('description', 50, 650), hltb = el('hltb', 900, 450);
        const cards = [description, hltb], controls = [play, family];
        expect(controlAboveCard(description, cards, controls, family)).toBe(play);
        expect(controlAboveCard(hltb, cards, controls, play)).toBe(family);
        expect(cardBelowControl(play, cards)).toBe(description);
        expect(cardBelowControl(family, cards)).toBe(hltb);
        expect(controlAboveCard(hltb, cards, controls, family)).toBe(family);
    });
});
