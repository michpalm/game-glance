import { GameInfo } from '../data/steam';
import { formatHours, minutesToHours } from '../logic/format';
import { descriptionState } from '../logic/infoCard';
import type { SizeStat } from '../logic/sizeStat';

interface Props {
    game: GameInfo;
    locale: string;
    description: string | null | undefined;
    /** A Unifideck game's install or download size (its own row's is hidden); absent for other games. */
    size?: SizeStat | null;
}

export function InfoCard({ game, locale, description, size = null }: Props) {
    const desc = descriptionState(description);
    return (
        <div className="gg-card">
            <div className="gg-stats">
                {size && (
                    <div>
                        <div className="gg-label">{size.label}</div>
                        <div className="gg-value">{size.value}</div>
                    </div>
                )}
                <div>
                    <div className="gg-label">Played</div>
                    <div className="gg-value">{formatHours(minutesToHours(game.playedMinutes), locale)}</div>
                </div>
                {game.achievements && (
                    <div>
                        <div className="gg-label">Achievements</div>
                        <div className="gg-value">{game.achievements.achieved}/{game.achievements.total}</div>
                    </div>
                )}
            </div>
            {desc.kind === 'loading' && <p className="gg-desc"><span className="gg-skeleton" /></p>}
            {desc.kind === 'text' && <p className="gg-desc">{desc.text}</p>}
        </div>
    );
}
