import { Focusable } from '@decky/ui';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { findStoreSwitcher, openStoreSwitcher } from '../logic/storeSwitcher';
import { focusElement } from '../home/homeNav';
import { SourcePill, StoreIcon } from './SourcePill';

/** Unifideck's selector lives behind the Store pill; the family pill remains a separate sibling action. */
export function GameSourcePill({ label, doc, appId, active, children }: { label: string; doc: Document | null; appId: number; active: boolean; children?: ReactNode }) {
    const [button, setButton] = useState<HTMLElement | null>(null);
    const anchor = useRef<HTMLElement | null>(null);
    useEffect(() => {
        if (!doc || !active) return;
        const marked = new Map<HTMLElement, string>();
        const update = () => {
            const next = findStoreSwitcher(doc, appId);
            const wrapper = next?.parentElement;
            if (wrapper && !marked.has(wrapper)) {
                marked.set(wrapper, wrapper.getAttribute('style') ?? '');
                wrapper.classList.add('gg-native-store-switcher');
            }
            setButton((old) => old === next ? old : next);
        };
        update();
        const observer = new MutationObserver(update);
        observer.observe(doc.body, { childList: true, subtree: true });
        const restore = (event: Event) => {
            if (anchor.current && (event.target as Element | null)?.closest?.('.gg-native-store-switcher')) focusElement(anchor.current, 'store selection pill');
        };
        doc.addEventListener('focusin', restore, true);
        return () => {
            observer.disconnect();
            doc.removeEventListener('focusin', restore, true);
            for (const [wrapper, style] of marked) {
                wrapper.classList.remove('gg-native-store-switcher');
                wrapper.setAttribute('style', style);
            }
        };
    }, [doc, appId, active]);
    if (!active || !button) return <SourcePill label={label}>{children}</SourcePill>;
    const open = () => { if (anchor.current) openStoreSwitcher(button, anchor.current.getBoundingClientRect()); };
    return <span className="gg-pill gg-store-selectable">
        <Focusable ref={(el: HTMLDivElement | null) => { anchor.current = el; }} className="gg-store-choice" focusClassName="gg-store-focus" noFocusRing onActivate={open} onClick={open} aria-label={`${label}: Choose store version`}>
            <StoreIcon label={label} className="gg-pill-icon" />{label}
            <svg className="gg-copy-plus" aria-hidden="true" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </Focusable>
        {children}
    </span>;
}
