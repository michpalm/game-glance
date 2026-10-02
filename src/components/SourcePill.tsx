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

export function SourcePill({ label }: { label: string }) {
    const Icon = ICONS[storeIconKey(label)];
    return (
        <span className="gg-pill">
            <Icon className="gg-pill-icon" aria-hidden="true" />
            {label}
        </span>
    );
}
