import { Focusable } from '@decky/ui';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { findStoreSwitcher, openStoreSwitcher } from '../logic/storeSwitcher';
import { focusElement } from '../home/homeNav';
import { SourcePill } from './SourcePill';
import { peekStoreVersions } from '../data/storeVersions';

/** Unifideck's selector lives behind the Store pill; the family pill remains a separate sibling action. */
export function GameSourcePill({ label, doc, appId, active, children }: { label: string; doc: Document | null; appId: number; active: boolean; children?: ReactNode }) {
    const [button, setButton] = useState<HTMLElement | null>(() => doc && active ? findStoreSwitcher(doc, appId) : null);
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
    if (!active || (!button && (peekStoreVersions(appId)?.length ?? 0) < 2)) return <SourcePill label={label}>{children}</SourcePill>;
    const open = () => {
        const native = button ?? (doc ? findStoreSwitcher(doc, appId) : null);
        if (native && anchor.current) openStoreSwitcher(native, anchor.current.getBoundingClientRect());
    };
    return <SourcePill label={label} plus renderControl={(content) => <Focusable ref={(el: HTMLDivElement | null) => { anchor.current = el; }} className="gg-store-choice" focusClassName="gg-store-focus" noFocusRing onActivate={open} onClick={open} aria-label={`${label}: Choose store version`}>{content}</Focusable>}>{children}</SourcePill>;
}
