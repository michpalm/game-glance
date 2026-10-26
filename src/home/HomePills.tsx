import { Focusable, Menu, MenuItem, showContextMenu } from '@decky/ui';
import type { GamepadEvent } from '@decky/ui';
import { useEffect, useRef, useState } from 'react';
import { FaUserFriends } from 'react-icons/fa';
import { FamilyPill, StoreIcon } from '../components/SourcePill';
import { FamilyCopyDialog } from '../components/FamilyCopyDialog';
import type { StoreVersion } from '../data/storeVersions';
import { focusVisualNeighbour } from '../logic/rowNav';
import { takeSteamFocus } from './steamFocus';
import { focusElement, openPage } from './homeNav';
import { tr } from '../i18n/steamText';

const storeName = (s: string) => ({ steam: 'Steam', gog: 'GOG', epic: 'Epic Games', amazon: 'Amazon Games', microsoft: 'Xbox' }[s] ?? s);
const Plus = () => <svg className="gh-copy-plus" aria-hidden="true" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;

export function HomePills({ appId, source, family, count, versions, onFocus, onBack, buttons }: { appId: number; source: string; family: string | null; count: number; versions: StoreVersion[]; onFocus(event: { target: EventTarget }): void; onBack(): void; buttons: { onButtonDown?(event: GamepadEvent): void; onButtonUp?(event: GamepadEvent): void } }) {
    const host = useRef<HTMLSpanElement>(null);
    const storeRef = useRef<HTMLDivElement | null>(null);
    const familyRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    useEffect(() => { setOpen(false); }, [appId]);
    useEffect(() => {
        const doc = host.current?.ownerDocument, root = host.current?.closest('.gh-root');
        if (!doc || !root) return;
        const onDirection = (event: Event) => {
            const button = Number((event as CustomEvent<{ button?: number }>).detail?.button);
            if (event.defaultPrevented || (button !== 11 && button !== 12) || !root.contains(event.target as Node)) return;
            const items = [...root.querySelectorAll<HTMLElement>('.gh-actions .gh-btn, .gh-copy-choice, .gh-store-choice')].filter((e) => e.getBoundingClientRect().width > 0);
            const at = items.findIndex((e) => e === event.target || e.contains(event.target as Node));
            if (at < 0) return;
            // This entire visual row is ours, including its ends; do not let Steam jump focus to another group.
            event.preventDefault();
            event.stopPropagation();
            focusVisualNeighbour(items.map((e) => e.getBoundingClientRect().x), at, button === 11 ? 'left' : 'right', (index) => {
                if (!takeSteamFocus(items[index])) return false;
                focusElement(items[index], 'Home copy selector');
                return true;
            });
        };
        doc.addEventListener('vgp_ondirection', onDirection, true);
        return () => doc.removeEventListener('vgp_ondirection', onDirection, true);
    }, []);
    const handlers = { onFocus, onButtonDown: (event: GamepadEvent) => {
        if (Number(event.detail?.button) === 10) { event.preventDefault(); event.stopPropagation(); onBack(); }
        else buttons.onButtonDown?.(event);
    }, onButtonUp: buttons.onButtonUp, onCancel: (event: Event) => { event.stopPropagation(); onBack(); } };
    const chooseStore = (anchor: HTMLElement) => showContextMenu(<Menu label="Choose store version" cancelText={tr('cancel')}>
        {versions.map((v) => <MenuItem key={v.appId} onSelected={() => { if ((v.appId >>> 0) !== (appId >>> 0)) openPage(v.appId >>> 0); }}><StoreIcon label={storeName(v.store)} /> {storeName(v.store)}{v.edition ? ` · ${v.edition}` : ''}</MenuItem>)}
    </Menu>, anchor);
    return <span ref={host} className={`gh-source${versions.length > 1 ? ' gh-source-selectable' : ''}`}>
        {versions.length > 1 ? <Focusable {...handlers} ref={(el: HTMLDivElement | null) => { storeRef.current = el; }} className="gh-store-choice" focusClassName="gh-pill-focus" noFocusRing onActivate={() => storeRef.current && chooseStore(storeRef.current)} onClick={(e: { currentTarget: HTMLElement }) => chooseStore(e.currentTarget)} aria-label={`${source}: Choose store version`}><StoreIcon label={source} className="gh-source-icon" />{source}<Plus /></Focusable> : <><StoreIcon label={source} className="gh-source-icon" />{source}</>}
        {family && (count > 1 ? <Focusable {...handlers} ref={(el: HTMLDivElement | null) => { familyRef.current = el; }} className="gh-family gh-copy-choice" focusClassName="gh-pill-focus" noFocusRing onActivate={() => setOpen(true)} onClick={() => setOpen(true)} aria-label={`${family}: Change preferred copy`}><FaUserFriends className="gh-family-icon" aria-hidden="true" />{family}<Plus /></Focusable> : <FamilyPill label={family} className="gh-family" iconClassName="gh-family-icon" />)}
        <FamilyCopyDialog appId={appId} open={open} onClose={() => { setOpen(false); focusElement(familyRef.current, 'Home family pill'); }} />
    </span>;
}
