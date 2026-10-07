import { HltbResult } from '../data/hltb';
import { GameInfo } from '../data/steam';
import { cleanStats } from '../logic/cleanInfo';
import type { SizeStat } from '../logic/sizeStat';

/** The Clean look's info card at the right of the Play row (styles in themeCss.buildCleanCss). */
export function CleanInfo({ game, hltb, locale, size = null }: { game: GameInfo; hltb: HltbResult | undefined; locale: string; size?: SizeStat | null }) {
    return (
        <div className="gg-clean-info">
            {cleanStats(game, hltb, locale, size).map((s) => (
                <div key={s.key}>
                    <div className="gg-label">{s.label}</div>
                    <div className="gg-value">{s.value}</div>
                    {s.progress !== undefined && <div className="gg-bar"><div style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>}
                </div>
            ))}
        </div>
    );
}
