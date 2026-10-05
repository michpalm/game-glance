import type { Chip } from './chips';

function ChipView({ chip }: { chip: Chip }) {
    const progress = chip.progress;
    return (
        <div className="gh-chip">
            <div className="gh-chip-label">{chip.label}</div>
            <div className="gh-chip-value">{chip.value}</div>
            {progress !== undefined && Number.isFinite(progress) && (
                <div className="gh-chip-bar">
                    <div className="gh-chip-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
                </div>
            )}
        </div>
    );
}

/**
 * Title, eyebrow (accent) and stat chips. The parent `.gh-title-block` column also holds the actions. The title sits at the bottom
 * of a two-line slot and the chip row is always there at a fixed height, so a longer title only grows upward and
 * the eyebrow, chips and actions never move when the game changes (homeCss.titleBlockLayout).
 */
export function TitleBlock({ eyebrow, title, chips }: { eyebrow: string; title: string; chips: Chip[] }) {
    return (
        <>
            <div className="gh-title-slot">
                <div className="gh-title">{title}</div>
            </div>
            <div className="gh-eyebrow">{eyebrow}</div>
            <div className="gh-chips">
                {chips.map((chip) => (
                    <ChipView key={chip.key} chip={chip} />
                ))}
            </div>
        </>
    );
}
