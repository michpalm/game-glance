import { GameInfo } from '../data/steam';
import { formatAchievements, formatHours, minutesToHours } from '../logic/format';
import { descriptionState } from '../logic/infoCard';
import type { SizeStat } from '../logic/sizeStat';
import { tr } from '../i18n/steamText';
import { CardShell } from './CardShell';

interface Props {
    game: GameInfo;
    locale: string;
    description: string | null | undefined;
    /** A Unifideck game's install or download size (its own row's is hidden); absent for other games. */
    size?: SizeStat | null;
    /** A tap on the card (#24, cardActions): the card responds and gives under the finger. */
    onPress?(card: HTMLElement): void;
}

export function InfoCard({ game, locale, description, size = null, onPress }: Props) {
    const stats = [
        { key: 'played', label: tr('played'), value: formatHours(minutesToHours(game.playedMinutes), locale) },
        ...(size ? [size] : []),
        ...(game.achievements ? [{ key: 'achievements', label: tr('achievements'), value: formatAchievements(game.achievements) }] : []),
    ];
    return <InfoCardPanel stats={stats} description={description} onPress={onPress} />;
}

export function InfoCardPanel({ stats, description, prefix = 'gg', onPress }: { stats: { key: string; label: string; value: string }[]; description: string | null | undefined; prefix?: string; onPress?(card: HTMLElement): void }) {
    const desc = descriptionState(description);
    return (
        <CardShell className={`${prefix}-card`} onPress={onPress}>
            <div className={`${prefix}-stats`}>
                {stats.map((s) => <div key={s.key} data-stat={s.key}>
                    <div className={`${prefix}-label`}>{s.label}</div>
                    <div className={`${prefix}-value`}>{s.value}</div>
                </div>)}
            </div>
            {desc.kind === 'loading' && <p className={`${prefix}-desc`}><span className={`${prefix}-skeleton`} /></p>}
            {desc.kind === 'text' && <p className={`${prefix}-desc`}>{desc.text}</p>}
        </CardShell>
    );
}
