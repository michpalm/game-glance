import { useEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { focusElement } from '../home/homeNav';
import { takeSteamFocus } from '../home/steamFocus';
import { rowFocusIndex, focusRingClass, needsVisualNav, focusVisualNeighbour } from '../logic/rowNav';
import { playRowControlSelector } from '../styles/theme';

const LEFT = 11;
const RIGHT = 12;

/** Step between Steam's controls and the library selection pill in their visible order. */
export function PlayRowNav() {
    const marker = useRef<HTMLSpanElement>(null);
    const [doc, setDoc] = useState<Document | null>(null);
    useEffect(() => setDoc(marker.current?.ownerDocument ?? null), []);
    useEffect(() => {
        if (!doc) return undefined;
        const onDirection = (event: Event) => {
            try {
                if (event.defaultPrevented) return;
                const button = Number((event as CustomEvent<{ button?: unknown }>).detail?.button);
                if (button !== LEFT && button !== RIGHT) return;
                const selector = playRowControlSelector();
                if (!selector) return;
                const items = [...doc.querySelectorAll<HTMLElement>(selector)].filter((el) => el.getBoundingClientRect().width > 0);
                const xs = items.map((el) => el.getBoundingClientRect().x);
                const crossesGroups = items.some((el) => el.matches('.gg-copy-pill, .gg-store-choice'));
                if (!needsVisualNav(xs, crossesGroups)) return;
                const target = event.target as HTMLElement | null;
                const gp = doc.querySelector<HTMLElement>('.gpfocus');
                const from = rowFocusIndex(items, target, gp, (el, focus) => el === focus || el.contains(focus));
                if (from < 0) return;
                const next = focusVisualNeighbour(xs, from, button === RIGHT ? 'right' : 'left', (index) => {
                    if (!takeSteamFocus(items[index])) return false;
                    focusElement(items[index], 'play row control');
                    return true;
                });
                if (next === null) return;
                event.stopPropagation();
                event.preventDefault();
            } catch (error) {
                console.warn(`${LOG_PREFIX} play row navigation failed`, error);
            }
        };
        doc.addEventListener('vgp_ondirection', onDirection, true);
        return () => doc.removeEventListener('vgp_ondirection', onDirection, true);
    }, [doc]);
    useEffect(() => {
        if (!doc) return undefined;
        const link = ':is(.gg-copy-pill, .gg-store-choice)';
        let ring = '';
        for (const sheet of doc.styleSheets) {
            let rules: CSSRuleList;
            try {
                rules = sheet.cssRules;
            } catch {
                continue;
            }
            for (const rule of rules) {
                ring = focusRingClass(rule.cssText) ?? '';
                if (ring) break;
            }
            if (ring) break;
        }
        if (!ring) return undefined;
        // The other circles turn white and do not keep Steam's square outline. Hide that outline while this link is focused.
        const style = doc.createElement('style');
        style.textContent = `body:has(${link}.gpfocus) .${ring}, body:has(${link}:focus) .${ring} { outline: none !important; visibility: hidden !important; }`;
        doc.head.appendChild(style);
        return () => style.remove();
    }, [doc]);
    return <span ref={marker} style={{ display: 'none' }} />;
}
