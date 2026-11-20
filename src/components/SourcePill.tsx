import { ReactNode } from 'react';
import { IconType } from 'react-icons';
import { FaAmazon, FaGamepad, FaUserFriends, FaXbox } from 'react-icons/fa';
import { SiBattledotnet, SiEpicgames, SiGogdotcom, SiHeroicgameslauncher, SiSteam, SiUbisoft } from 'react-icons/si';
import { StoreIconKey, storeIconKey } from '../logic/storeIcon';

const ICONS: Record<StoreIconKey, IconType> = {
    steam: SiSteam,
    gog: SiGogdotcom,
    epic: SiEpicgames,
    amazon: FaAmazon,
    ubisoft: SiUbisoft,
    xbox: FaXbox,
    battlenet: SiBattledotnet,
    heroic: SiHeroicgameslauncher,
    generic: FaGamepad,
};

/** The store's icon for a source label. */
export function StoreIcon({ label, className }: { label: string; className?: string }) {
    const Icon = ICONS[storeIconKey(label)];
    return <Icon className={className} aria-hidden="true" />;
}

/**
 * The store pill (icon + name): the game page's (`gg-pill`) and Spotlight Home's (`gh-source`); both are styled from
 * styles/sourcePill.ts.
 */
export function SourcePill({ label, className = 'gg-pill', iconClassName = 'gg-pill-icon', children, plus = false, selectableClassName = 'gg-store-selectable', controlClassName = 'gg-store-choice', faceClassName = 'gg-store-face', plusClassName = 'gg-copy-plus', renderControl, bare = false }: { label: string; className?: string; iconClassName?: string; children?: ReactNode; plus?: boolean; selectableClassName?: string; controlClassName?: string; faceClassName?: string; plusClassName?: string; renderControl?(content: ReactNode): ReactNode; bare?: boolean }) {
    // The store pill turned off (settings.storePill) while the family pill shows: an empty, unglazed anchor at the store
    // pill's place (the selectable look: no padding, border or glass), so the family pill takes its place at the edge.
    if (bare) return <span className={`${className} ${selectableClassName} ${className}-bare`}>{children}</span>;
    const content = <><StoreIcon label={label} className={iconClassName} />{label}{plus && <svg className={plusClassName} aria-hidden="true" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}</>;
    // The glass is never on the holder: a blur flattens its element, and a blur inside it (the family pill, just left of
    // the store pill) then sees only the holder, not the art, and shows the art sharp. The holder is the unglazed
    // selectable shape; the store's glass is its own face (or its control, when the store has versions), beside the family pill.
    return (
        <span className={`${className} ${selectableClassName}`}>
            {plus ? renderControl ? renderControl(content) : <span className={controlClassName}>{content}</span> : <span className={faceClassName}>{content}</span>}
            {children}
        </span>
    );
}

/**
 * A game from the family library: "Family Sharing · Lender" with a friends icon (data/family), drawn like the store pill and
 * placed in its holder, beside its glass face, just to its left (`gg-family` on the game page, `gh-family` on Home).
 */
export function FamilyPill({ label, className = 'gg-family', iconClassName = 'gg-family-icon', plus = false }: { label: string; className?: string; iconClassName?: string; plus?: boolean }) {
    return (
        <span className={className}>
            <FaUserFriends className={iconClassName} aria-hidden="true" />
            {label}
            {plus && <svg className="gh-x-copy-plus" aria-hidden="true" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
        </span>
    );
}
