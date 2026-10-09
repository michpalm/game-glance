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
export function SourcePill({ label, className = 'gg-pill', iconClassName = 'gg-pill-icon', children }: { label: string; className?: string; iconClassName?: string; children?: ReactNode }) {
    return (
        <span className={className}>
            <StoreIcon label={label} className={iconClassName} />
            {label}
            {children}
        </span>
    );
}

/**
 * A game from the family library: "Family Sharing · Grave" with a friends icon (data/family), drawn like the store pill and
 * placed inside it, just to its left (`gg-family` on the game page, `gh-family` on Home).
 */
export function FamilyPill({ label, className = 'gg-family', iconClassName = 'gg-family-icon' }: { label: string; className?: string; iconClassName?: string }) {
    return (
        <span className={className}>
            <FaUserFriends className={iconClassName} aria-hidden="true" />
            {label}
        </span>
    );
}
