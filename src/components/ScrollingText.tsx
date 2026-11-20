import { useEffect, useRef, type ReactNode } from 'react';
import { CARD_NAV } from '../logic/cardNav';
import { attachMarquee, attachRoll } from './scrollText';

/** One line of a card that slides into view when cut off, while its card is focused (components/scrollText). */
export function ScrollLine({ className, children, tone }: { className: string; children: ReactNode; tone?: string }) {
    const line = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = line.current, card = el?.closest<HTMLElement>(`.${CARD_NAV}`);
        return el && card ? attachMarquee(card, el) : undefined;
    }, []);
    return <div ref={line} className={className} data-tone={tone} data-gg-scroll="line"><span>{children}</span></div>;
}

/** A card's description that glides up to its end while the page is left alone (components/scrollText); the span moves. */
export function RollingText({ className, children }: { className: string; children: ReactNode }) {
    const text = useRef<HTMLParagraphElement | null>(null);
    useEffect(() => {
        const el = text.current;
        return el ? attachRoll(el, el.ownerDocument) : undefined;
    }, []);
    return <p ref={text} className={className} data-gg-scroll="roll"><span>{children}</span></p>;
}
