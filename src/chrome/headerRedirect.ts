import { visibleHomeControl } from '../home/useHomeControls';
import { createTopBarFinder } from '../home/topBar';

export interface HeaderRedirectOptions {
    enabled(): boolean;
    /** Move focus into our bar; false when it could not. */
    enter(): boolean;
    inOurBar(target: Element | null): boolean;
    /** Something else owns the controller (the Search keyboard): leave Steam's bar alone. */
    busy(): boolean;
    /** Entry is refused only because our bar is hidden (Home's feed sheet): send focus back out with `back`. */
    hidden?(): boolean;
    back?(): void;
    /** How leave() focuses the remembered element (the host hands over Steam's gamepad focus too). */
    focus?(el: HTMLElement): void;
}

/**
 * Steam's top bar stays mounted (invisible), so Up still lands focus there. When it does, move focus into our bar and
 * remember where it came from so Down/B can return. Arrival is seen as DOM `focusin` or as Steam's gamepad focus class
 * (`.gpfocus`) appearing in the bar, which Steam can set without any focus event. One entry per arrival.
 */
export function installHeaderRedirect(doc: Document, o: HeaderRedirectOptions): { rememberFrom(element: HTMLElement): void; leave(fallback?: () => void): void; dispose(): void } {
    const findBar = createTopBarFinder(doc);
    let remembered: HTMLElement | null = null;
    let lastOutside: HTMLElement | null = null;
    let inSteamBar = false;

    const outsideBoth = (el: unknown): el is HTMLElement => {
        if (!el || typeof (el as Element).closest !== 'function') return false;
        const bar = findBar();
        return !(bar && bar.contains(el as Node)) && !o.inOurBar(el as Element);
    };
    const arrive = (from: unknown) => {
        if (inSteamBar || o.busy()) return;
        if (!o.enabled()) {
            // Steam's header is invisible: focus left there is stranded.
            if (o.hidden?.()) o.back?.();
            return;
        }
        const source = outsideBoth(from) ? from : lastOutside;
        if (o.enter()) {
            inSteamBar = true;
            // Coming back from our own bar keeps the memory; an arrival with no source forgets an older element.
            if (source) remembered = source;
            else if (!(from && typeof (from as Element).closest === 'function' && o.inOurBar(from as Element))) remembered = null;
        }
    };

    const onFocusIn = (event: Event) => {
        const target = event.target as Element | null;
        const bar = findBar();
        if (target && bar?.contains(target)) {
            arrive((event as FocusEvent).relatedTarget);
        } else {
            // Focus moving into our own bar while Steam's gamepad focus still sits in its bar is the redirect itself.
            if (!(inSteamBar && bar?.querySelector('.gpfocus') && o.inOurBar(target))) inSteamBar = false;
            if (outsideBoth(target)) lastOutside = target;
        }
    };
    doc.addEventListener('focusin', onFocusIn, true);

    // `.gpfocus` moves are class changes. One observer on the document (it must also see where gamepad focus was before
    // the bar, which is anywhere in the page); the callback skips every record whose target does not carry `.gpfocus`, and
    // looks the bar up only for those, or while an entry is being held.
    const Observer = doc.defaultView?.MutationObserver;
    const observer = Observer
        ? new Observer((records) => {
            for (const r of records) {
                const el = r.target as Element;
                if (!el.classList?.contains('gpfocus')) continue;
                if (findBar()?.contains(el)) arrive(null);
                else if (outsideBoth(el)) { lastOutside = el as HTMLElement; inSteamBar = false; }
            }
            // gamepad focus left the bar without a focusin elsewhere
            if (inSteamBar) {
                const bar = findBar();
                if (bar && !bar.querySelector('.gpfocus') && !bar.contains(doc.activeElement)) inSteamBar = false;
            }
        })
        : null;
    observer?.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });

    return {
        rememberFrom(element) {
            remembered = outsideBoth(element) && element.ownerDocument === doc ? element : null;
        },
        leave(fallback) {
            const target = remembered;
            remembered = null;
            inSteamBar = false;
            if (target && visibleHomeControl(target)) (o.focus ?? ((el: HTMLElement) => el.focus()))(target);
            else fallback?.();
        },
        dispose() {
            doc.removeEventListener('focusin', onFocusIn, true);
            observer?.disconnect();
        },
    };
}
