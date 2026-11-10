import { HltbResult } from '../data/hltb';
import { ProtonResult } from '../data/protondb';
import { ProtonMark } from '../home/ProtonMark';
import { AchievementFacts, achievementsView, FeaturedView, playTimeView, protonView } from '../logic/featuredViews';
import { FeaturedId } from '../logic/infoSlots';
import { CardShell } from './CardShell';
import { HltbCard } from './HltbCard';

interface Props {
    prefix?: string;
    featured: FeaturedId | null;
    hltb: HltbResult | undefined;
    playedMinutes: number;
    locale: string;
    /** The restyled page (Spotlight Home on): HowLongToBeat's bar and caption follow the main story only. */
    restyle?: boolean;
    onPress?(card: HTMLElement): void;
    proton: ProtonResult | undefined;
    achievements: AchievementFacts | undefined;
    playTime: { minutes: number; twoWeeks: number; lastPlayed: number };
    /** Unix seconds. */
    now: number;
}

/** The game page's right-hand card: the featured stat (the Game info setting). HowLongToBeat's card is unchanged; the others draw a FeaturedView. */
export function FeaturedCard(p: Props) {
    const prefix = p.prefix ?? 'gg';
    if (p.featured === null) return null;
    if (p.featured === 'hltb') {
        return <HltbCard prefix={prefix} result={p.hltb} playedMinutes={p.playedMinutes} locale={p.locale} restyle={p.restyle} onPress={p.onPress} />;
    }
    const view: FeaturedView =
        p.featured === 'protondb' ? protonView(p.proton)
        : p.featured === 'achievements' ? achievementsView(p.achievements, p.now, p.locale)
        : playTimeView(p.playTime, p.now, p.locale);

    return (
        <CardShell className={`${prefix}-card ${prefix}-featured ${prefix}-featured-${p.featured}`} onPress={p.onPress}>
            <div className={`${prefix}-label`}>{view.title}</div>
            {view.empty !== undefined && <div className={`${prefix}-muted`}>{view.empty}</div>}
            {view.loading && (
                <div className={`${prefix}-stats`}><div><div className={`${prefix}-value`}><span className={`${prefix}-skeleton`} /></div></div></div>
            )}
            {view.icon && (
                <div className={`${prefix}-stats`}>
                    {view.icon.src && <img src={view.icon.src} alt="" style={{ height: '2.6em', aspectRatio: '1', borderRadius: '0.3em', objectFit: 'cover' }} />}
                    <div style={{ minWidth: 0 }}>
                        <div className={`${prefix}-label`}>{view.icon.label}</div>
                        <div className={`${prefix}-value`} style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{view.icon.value}</div>
                    </div>
                </div>
            )}
            {view.columns.length > 0 && (
                <div className={`${prefix}-stats`}>
                    {view.columns.map((c) => (
                        <div key={c.key} className={c.accent ? `${prefix}-goal` : undefined} data-stat={c.key}>
                            <div className={`${prefix}-label`}>{c.label}</div>
                            <div className={`${prefix}-value`}>
                                {c.tone && <span className={`${prefix}-mark`} data-tone={c.tone}><ProtonMark /></span>}
                                {c.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {view.bar !== null && <div className={`${prefix}-bar`}><div style={{ width: `${view.bar}%` }} /></div>}
            {view.caption !== null && <div className={`${prefix}-caption`}>{view.caption}</div>}
        </CardShell>
    );
}
