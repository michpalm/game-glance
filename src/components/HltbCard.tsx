import { HltbResult } from '../data/hltb';
import { HLTB_COLUMNS, HLTB_TITLE, hltbFoundView, hltbNotFoundView } from '../logic/hltbCardView';
import { tr } from '../i18n/steamText';
import { CardShell } from './CardShell';

interface Props {
    prefix?: string;
    result: HltbResult | undefined;
    playedMinutes: number;
    locale: string;
    /** The restyled page (Spotlight Home on): the bar and caption follow the main story only. */
    restyle?: boolean;
    /** A tap on the card (#24, cardActions): the card responds and gives under the finger. */
    onPress?(card: HTMLElement): void;
}

export function HltbCard({ result, playedMinutes, locale, restyle = false, onPress, prefix = 'gg' }: Props) {
    const header = <div className={`${prefix}-label`}>{HLTB_TITLE}</div>;

    if (result === undefined) {
        return (
            <CardShell className={`${prefix}-card ${prefix}-hltb`} onPress={onPress}>
                {header}
                <div className={`${prefix}-stats`}>
                    {HLTB_COLUMNS.map((c) => (
                        <div key={c.tier} data-stat={c.key}>
                            <div className={`${prefix}-label`}>{c.label}</div>
                            <div className={`${prefix}-value`}><span className={`${prefix}-skeleton`} /></div>
                        </div>
                    ))}
                </div>
            </CardShell>
        );
    }
    if (result.status === 'notFound') {
        const none = hltbNotFoundView(result.overrideId);
        return (
            <CardShell className={`${prefix}-card ${prefix}-hltb`} onPress={onPress}>
                {header}
                <div className={`${prefix}-muted`}>{none.muted}</div>
                <div className={`${prefix}-caption`}>{none.caption}</div>
            </CardShell>
        );
    }
    if (result.status === 'unavailable') {
        return (
            <CardShell className={`${prefix}-card ${prefix}-hltb`} onPress={onPress}>
                {header}
                <div className={`${prefix}-muted`}>{tr('unavailable')}</div>
            </CardShell>
        );
    }

    const view = hltbFoundView(result.times, playedMinutes, locale, restyle);
    return (
        <CardShell className={`${prefix}-card ${prefix}-hltb`} onPress={onPress}>
            {header}
            <div className={`${prefix}-stats`}>
                {view.columns.map((c) => (
                    <div key={c.tier} className={c.goal ? `${prefix}-goal` : undefined} data-stat={c.key}>
                        <div className={`${prefix}-label`}>{c.label}</div>
                        <div className={`${prefix}-value`}>{c.value}</div>
                    </div>
                ))}
            </div>
            {view.bar !== null && <div className={`${prefix}-bar`}><div style={{ width: `${view.bar}%` }} /></div>}
            {view.caption !== null && <div className={`${prefix}-caption`}>{view.caption}</div>}
        </CardShell>
    );
}
