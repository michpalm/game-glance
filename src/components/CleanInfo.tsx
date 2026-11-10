import { HltbResult } from '../data/hltb';
import { GameInfo } from '../data/steam';
import { CleanStat, cleanStats } from '../logic/cleanInfo';
import type { SizeStat } from '../logic/sizeStat';
import type { GameInfoSlots } from '../logic/infoSlots';
import type { ProtonResult } from '../data/protondb';
import { ProtonMark } from '../home/ProtonMark';

/** The Clean look's info card at the right of the Play row (styles in themeCss.buildCleanCss). */
export function CleanInfo({ game, hltb, locale, size = null, slots, proton }: { game: GameInfo; hltb: HltbResult | undefined; locale: string; size?: SizeStat | null; slots: GameInfoSlots; proton: ProtonResult | undefined }) {
    return <CleanInfoPanel stats={cleanStats(game, hltb, locale, size, slots, proton)} />;
}

/** Identical content/layout for the page and Home's Clean opening card. */
export function CleanInfoPanel({ stats, className = 'gg-clean-info', prefix = 'gg' }: { stats: CleanStat[]; className?: string; prefix?: string }) {
    return (
        <div className={className}>
            {stats.map((s) => (
                <div key={s.key} data-stat={s.key}>
                    <div className={`${prefix}-label`}>{s.label}</div>
                    <div className={`${prefix}-value`}>{s.tone && <span className={`${prefix}-mark`} data-tone={s.tone} aria-hidden="true"><ProtonMark /></span>}{s.value}</div>
                    {s.progress !== undefined && <div className={`${prefix}-bar`}><div style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>}
                </div>
            ))}
        </div>
    );
}
