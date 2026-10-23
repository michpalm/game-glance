import { RefObject, useLayoutEffect } from 'react';
import { fitTitleSize } from './giveWay';

/**
 * With the title's slot down to one line (`oneLine`, home/titleMode, #55), the text title (`selector` inside `box`) takes
 * the largest of `sizes` (CSS px, largest first) at which its lines fit `slotPx`, measured in place inside its `bleedPx`
 * padding; back to the stylesheet's size otherwise. Fitted again when the title arrives late (GameTitle shows the text
 * once a logo turns out missing) or the font loads. Home (TitleBlock) and the restyled page (GameHero) both use it.
 */
export function useOneLineFit(box: RefObject<HTMLElement | null>, oneLine: boolean, key: string, selector: string, sizes: readonly number[], slotPx: number, bleedPx: number) {
    const sizesKey = sizes.join();
    useLayoutEffect(() => {
        const root = box.current;
        if (!root) return undefined;
        const fit = () => {
            const el = root.querySelector<HTMLElement>(selector);
            if (!el) return;
            el.style.removeProperty('font-size');
            el.style.removeProperty('-webkit-line-clamp');
            if (!oneLine) return;
            const fits = (size: number) => {
                el.style.setProperty('font-size', `${size}px`, 'important');
                return el.clientHeight - 2 * bleedPx <= slotPx + 0.5;
            };
            const size = fitTitleSize(fits, sizes);
            el.style.setProperty('font-size', `${size}px`, 'important');
            el.style.setProperty('-webkit-line-clamp', String(Math.max(1, Math.floor(slotPx / size + 0.01))), 'important');
        };
        fit();
        // The fit only changes the title's style, which this does not watch.
        const View = root.ownerDocument?.defaultView as (Window & { MutationObserver?: typeof MutationObserver }) | null;
        const observer = View?.MutationObserver ? new View.MutationObserver(fit) : null;
        observer?.observe(root, { childList: true, subtree: true, characterData: true });
        let live = true;
        root.ownerDocument?.fonts?.ready?.then(() => live && fit()).catch(() => undefined);
        return () => {
            live = false;
            observer?.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oneLine, key, selector, sizesKey, slotPx, bleedPx]);
}
