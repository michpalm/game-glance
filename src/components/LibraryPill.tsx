import { Focusable } from '@decky/ui';
import { useEffect, useState } from 'react';
import { FaUserFriends } from 'react-icons/fa';
import { familyPillLabel } from '../data/family';
import { libraryPillState, openLibraryChoice, subscribeLibraryUpdates } from '../logic/libraryPill';
import { useFamilyCopies } from '../hooks/useFamilyCopies';
import { FamilyCopyDialog } from './FamilyCopyDialog';
import { versionLinkSelector } from '../styles/theme';
import { FamilyPill } from './SourcePill';

/** The family label doubles as Steam's preferred-copy action when a native choice is available. */
export function LibraryPill({ doc, appId }: { doc: Document | null; appId: number }) {
    const copies = useFamilyCopies(appId);
    const [dialog, setDialog] = useState(false);
    const [state, setState] = useState<{ label: string | null; link: HTMLElement | null }>({ label: familyPillLabel(appId), link: null });
    useEffect(() => {
        if (!doc) return;
        const update = () => {
            const next = libraryPillState(doc, versionLinkSelector(), familyPillLabel(appId));
            setState((old) => old.label === next.label && old.link === next.link ? old : next);
        };
        update();
        const apps = (globalThis as unknown as { SteamClient?: { Apps?: { RegisterForAppOverviewChanges?: (callback: () => void) => { unregister(): void } | void } } }).SteamClient?.Apps;
        const stopUpdates = subscribeLibraryUpdates(update, apps?.RegisterForAppOverviewChanges?.bind(apps));
        const observer = new MutationObserver(update);
        observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-disabled'] });
        return () => { observer.disconnect(); stopUpdates(); };
    }, [doc, appId]);
    const label = copies.label ?? state.label;
    if (!label) return null;
    if (!state.link && copies.count < 2) return <FamilyPill label={label} />;
    const open = () => state.link ? openLibraryChoice(state.link) : setDialog(true);
    return (
        <><Focusable className="gg-family gg-copy-pill" focusClassName="gg-copy-focus" noFocusRing onActivate={open} onClick={open} aria-label={`${label}: Change preferred copy`}>
            <FaUserFriends className="gg-family-icon" aria-hidden="true" />
            {label}
            <svg className="gg-copy-plus" aria-hidden="true" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </Focusable><FamilyCopyDialog appId={appId} open={dialog} onClose={() => setDialog(false)} /></>
    );
}
