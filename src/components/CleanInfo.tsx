import { HltbResult } from '../data/hltb';
import { GameInfo } from '../data/steam';
import { CleanStat, cleanStats } from '../logic/cleanInfo';
import type { SizeStat } from '../logic/sizeStat';

/** The Clean look's info card at the right of the Play row (styles in themeCss.buildCleanCss). */
export function CleanInfo({ game, hltb, locale, size = null }: { game: GameInfo; hltb: HltbResult | undefined; locale: string; size?: SizeStat | null }) {
    return <CleanInfoPanel stats={cleanStats(game, hltb, locale, size)} />;
}

/** Identical content/layout for the page and Home's Clean opening card. */
export function CleanInfoPanel({ stats, className = 'gg-clean-info', prefix = 'gg' }: { stats: CleanStat[]; className?: string; prefix?: string }) {
    return (
        <div className={className}>
            {stats.map((s) => (
                <div key={s.key} data-stat={s.key}>
                    <div className={`${prefix}-label`}>{s.label}</div>
                    <div className={`${prefix}-value`}>{s.value}</div>
                    {s.progress !== undefined && <div className={`${prefix}-bar`}><div style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>}
                </div>
            ))}
        </div>
    );
}
