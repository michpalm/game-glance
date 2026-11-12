import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
vi.mock('@decky/ui', () => ({ Focusable: 'focusable' }));
import { PlayersPill, playersLabel } from '../../src/components/PlayersPill';
import { focusAwayFromBadge, hidePlayCountBadge, playCountButton, PLAYCOUNT_HIDDEN } from '../../src/components/usePlayCountBadge';

type El = { type: unknown; props: Record<string, any> };

describe('PlayersPill', () => {
    it("reads '<count> playing' in the locale's grouping, 0 included", () => {
        expect(playersLabel(20663, 'en-US')).toBe('20,663 playing');
        expect(playersLabel(0, 'en-US')).toBe('0 playing');
        expect(playersLabel(20663, 'de-DE')).toBe('20.663 playing');
    });
    it('is a plain marked span without a chart, and a focusable button that opens it with one', () => {
        const plain = PlayersPill({ count: 5, locale: 'en-US', className: 'gg-players', dotClassName: 'gg-players-dot' }) as unknown as El;
        expect(plain.type).toBe('span');
        expect(plain.props.className).toBe('gg-players');
        expect(plain.props['data-players-pill']).toBe('');
        const chart = vi.fn();
        const button = PlayersPill({ count: 5, locale: 'en-US', className: 'gg-players', dotClassName: 'gg-players-dot', chart }) as unknown as El;
        expect(button.type).toBe('focusable');
        expect(button.props.className).toBe('gg-players gg-players-choice');
        expect(button.props['aria-label']).toBe('5 playing: Open player chart');
        button.props.onActivate(); button.props.onClick();
        expect(chart).toHaveBeenCalledTimes(2);
    });
});

describe("PlayCount's badge", () => {
    it('finds its button, hides the badge while asked, and puts it back', () => {
        const { document } = parseHTML('<div><div class="playerBadge"><button id="b"></button></div></div>');
        const button = playCountButton(document as unknown as Document)!;
        expect(button.id).toBe('b');
        const click = vi.fn(); button.addEventListener('click', click);
        button.click(); expect(click).toHaveBeenCalled();
        const undo = hidePlayCountBadge(document as unknown as Document);
        expect(document.querySelector('.playerBadge')!.classList.contains(PLAYCOUNT_HIDDEN)).toBe(true);
        undo();
        expect(document.querySelector('.playerBadge')!.classList.contains(PLAYCOUNT_HIDDEN)).toBe(false);
    });
    it('without a badge there is nothing to press and nothing hidden', () => {
        const { document } = parseHTML('<div><div class="other"></div></div>');
        expect(playCountButton(document as unknown as Document)).toBeNull();
        const undo = hidePlayCountBadge(document as unknown as Document);
        expect(document.querySelectorAll(`.${PLAYCOUNT_HIDDEN}`).length).toBe(0);
        undo();
    });
});

describe('focus never rests on the hidden badge', () => {
    it('moves focus from inside the hidden badge to our pill, and leaves any other focus alone', () => {
        const { document } = parseHTML(`<div><div class="playerBadge ${'gg-native-playcount'}"><button id="b"></button></div><span class="gg-players-choice" id="ours"></span><button id="other"></button></div>`);
        const focus = vi.fn();
        expect(focusAwayFromBadge(document.querySelector('#b') as unknown as Element, document as unknown as Document, focus)).toBe(true);
        expect(focus).toHaveBeenCalledWith(document.querySelector('#ours'));
        expect(focusAwayFromBadge(document.querySelector('#other') as unknown as Element, document as unknown as Document, focus)).toBe(false);
        expect(focus).toHaveBeenCalledTimes(1);
    });
});
