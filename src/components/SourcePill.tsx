import { IconType } from 'react-icons';
import { FaAmazon, FaGamepad, FaXbox } from 'react-icons/fa';
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
export function SourcePill({ label, className = 'gg-pill', iconClassName = 'gg-pill-icon' }: { label: string; className?: string; iconClassName?: string }) {
    return (
        <span className={className}>
            <StoreIcon label={label} className={iconClassName} />
            {label}
        </span>
    );
}
