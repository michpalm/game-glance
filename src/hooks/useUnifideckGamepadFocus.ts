import { useEffect } from 'react';
import { REFOCUS_GAP_MS, shouldRefocus } from '../logic/gamepadFocus';
import { UNIFIDECK_PAGE, UNIFIDECK_PRIMARY } from '../styles/themeCss';
import { LOG_PREFIX } from '../constants';

const POLL_MS = 250;

/**
 * Keeps Steam's gamepad focus on Unifideck's Play button (logic/gamepadFocus): when it sits on something with no size, the
 * button is blurred and focused again so Steam moves its gamepad focus there. Only on a Unifideck page, only while the window
 * has focus. `doc` is the page's document (a marker in the page tells which window it is).
 */
export function useUnifideckGamepadFocus(doc: Document | null, active: boolean): void {
    useEffect(() => {
        if (!active || !doc) return undefined;
        let done = 0;
        let last = -Infinity;
        let pending: ReturnType<typeof setTimeout> | undefined;
        const timer = setInterval(() => {
            try {
                if (!doc.querySelector(UNIFIDECK_PAGE)) return;
                const gp = doc.querySelector<HTMLElement>('.gpfocus');
                const now = Date.now();
                if (!shouldRefocus({ gpRect: gp ? gp.getBoundingClientRect() : null, windowFocused: doc.hasFocus(), sinceLastMs: now - last, done })) return;
                const play = doc.querySelector<HTMLElement>(UNIFIDECK_PRIMARY.map((c) => `${UNIFIDECK_PAGE} ${c}`).join(', '));
                if (!play) return;
                last = now;
                done++;
                if (doc.activeElement === play) {
                    play.blur();
                    pending = setTimeout(() => play.focus({ preventScroll: true }), REFOCUS_GAP_MS);
                } else {
                    play.focus({ preventScroll: true });
                }
            } catch (error) {
                console.warn(`${LOG_PREFIX} Unifideck gamepad focus repair failed`, error);
            }
        }, POLL_MS);
        return () => {
            clearInterval(timer);
            if (pending) clearTimeout(pending);
        };
    }, [doc, active]);
}
