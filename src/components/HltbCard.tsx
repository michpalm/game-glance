import { HltbResult } from '../data/hltb';
import { formatHours, minutesToHours } from '../logic/format';
import { beyondCaption, computeProgress, Tier, towardCaption } from '../logic/progress';

interface Props {
    result: HltbResult | undefined;
    playedMinutes: number;
    locale: string;
}

const COLUMNS: Array<{ tier: Tier; label: string }> = [
    { tier: 'main', label: 'Main' },
    { tier: 'mainExtras', label: '+ Extras' },
    { tier: 'completionist', label: '100%' },
];

export function HltbCard({ result, playedMinutes, locale }: Props) {
    const header = <div className="gg-label">How long to beat</div>;

    if (result === undefined) {
        return (
            <div className="gg-card gg-hltb">
                {header}
                <div className="gg-stats">
                    {COLUMNS.map((c) => (
                        <div key={c.tier}>
                            <div className="gg-label">{c.label}</div>
                            <div className="gg-value"><span className="gg-skeleton" /></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (result.status === 'notFound') {
        return (
            <div className="gg-card gg-hltb">
                {header}
                <div className="gg-muted">
                    {result.overrideId !== undefined ? `HowLongToBeat #${result.overrideId} not found` : 'No match found'}
                </div>
                <div className="gg-caption">
                    {result.overrideId !== undefined
                        ? 'Check or remove the override in Quick Access → Game Glance'
                        : 'Set the right game in Quick Access → Game Glance'}
                </div>
            </div>
        );
    }
    if (result.status === 'unavailable') {
        return (
            <div className="gg-card gg-hltb">
                {header}
                <div className="gg-muted">HowLongToBeat unavailable</div>
            </div>
        );
    }

    const played = minutesToHours(playedMinutes);
    const progress = computeProgress(played, result.times);
    const goalTier = progress.kind === 'toward' ? progress.tier : null;
    return (
        <div className="gg-card gg-hltb">
            {header}
            <div className="gg-stats">
                {COLUMNS.map((c) => {
                    const hours = result.times[c.tier];
                    return (
                        <div key={c.tier} className={c.tier === goalTier ? 'gg-goal' : undefined}>
                            <div className="gg-label">{c.label}</div>
                            <div className="gg-value">{hours === null ? '—' : formatHours(hours, locale)}</div>
                        </div>
                    );
                })}
            </div>
            {progress.kind === 'toward' && (
                <>
                    <div className="gg-bar"><div style={{ width: `${progress.percent}%` }} /></div>
                    <div className="gg-caption">
                        {towardCaption(played, progress.goalHours, progress.tier, locale)}
                    </div>
                </>
            )}
            {progress.kind === 'beyond' && (
                <>
                    <div className="gg-bar"><div style={{ width: '100%' }} /></div>
                    <div className="gg-caption">{beyondCaption(progress.lastTier)}</div>
                </>
            )}
            {progress.kind === 'notPlayed' && <div className="gg-caption">Not played yet</div>}
        </div>
    );
}
