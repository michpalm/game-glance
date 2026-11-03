import { visibleHomeControl } from '../home/useHomeControls';
import { createTopBarFinder } from '../home/topBar';

export interface HeaderRedirectOptions {
    enabled(): boolean;
    /** Move focus into our bar; false when it could not. */
    enter(): boolean;
    inOurBar(target: Element | null): boolean;
    /** Something else owns the controller (the Search keyboard): leave Steam's bar alone. */
    busy(): boolean;
}

/**
 * Steam's top bar stays mounted (invisible), so Up still lands focus there. When it does, move focus into our bar and
 * remember where it came from so Down/B can return. Arrival is seen as DOM `focusin` or as Steam's gamepad focus class
 * (`.gpfocus`) appearing in the bar, which Steam can set without any focus event. One entry per arrival.
 */
export function installHeaderRedirect(doc: Document, o: HeaderRedirectOptions): { leave(fallback?: () => void): void; dispose(): void } {
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
        if (inSteamBar) return;
        inSteamBar = true;
        if (!o.enabled() || o.busy()) return;
        const source = outsideBoth(from) ? from : lastOutside;
        if (source) remembered = source;
        o.enter();
    };

    const onFocusIn = (event: Event) => {
        const target = event.target as Element | null;
        const bar = findBar();
        if (target && bar?.contains(target)) {
            arrive((event as FocusEvent).relatedTarget);
        } else {
            inSteamBar = false;
            if (outsideBoth(target)) lastOutside = target;
        }
    };
    doc.addEventListener('focusin', onFocusIn, true);

    // `.gpfocus` moves are class changes. One observer on the document (it must also see where focus was before the
    // bar, and Steam replacing the bar); the callback only looks at the records' own targets.
    const Observer = doc.defaultView?.MutationObserver;
    const observer = Observer
        ? new Observer((records) => {
            for (const r of records) {
                const el = r.target as Element;
                if (!el.classList?.contains('gpfocus')) continue;
                const bar = findBar();
                if (bar?.contains(el)) arrive(null);
                else if (outsideBoth(el)) { lastOutside = el as HTMLElement; inSteamBar = false; }
            }
            // gamepad focus left the bar without a focusin elsewhere
            const bar = findBar();
            if (inSteamBar && bar && !bar.querySelector('.gpfocus') && !bar.contains(doc.activeElement)) inSteamBar = false;
        })
        : null;
    observer?.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });

    return {
        leave(fallback) {
            const target = remembered;
            remembered = null;
            inSteamBar = false;
            if (target && visibleHomeControl(target)) target.focus();
            else fallback?.();
        },
        dispose() {
            doc.removeEventListener('focusin', onFocusIn, true);
            observer?.disconnect();
        },
    };
}
