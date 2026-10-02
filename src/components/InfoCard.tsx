import { GameInfo } from '../data/steam';
import { formatHours, minutesToHours } from '../logic/format';
import { descriptionState } from '../logic/infoCard';

interface Props {
    game: GameInfo;
    locale: string;
    description: string | null | undefined;
}

export function InfoCard({ game, locale, description }: Props) {
    const desc = descriptionState(description);
    return (
        <div className="gg-card">
            <div className="gg-stats">
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
