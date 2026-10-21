import type { HltbResult } from '../data/hltb';
import { HLTB_TITLE, hltbFoundView, hltbNotFoundView } from '../logic/hltbCardView';
import { formatHours, minutesToHours } from '../logic/format';
import { tr } from '../i18n/steamText';
import { SETTLE } from './openTwins';
import { extrasParts } from './openHome';
import { FamilyPill, SourcePill } from '../components/SourcePill';

interface Props {
    description: string | null;
    hltb: HltbResult | undefined;
    playedMinutes: number;
    locale: string;
    /** The store's name (the store pill) and the family library pill's words, when known. */
    source?: string;
    family?: string | null;
    familyMultiple?: boolean;
    sourceMultiple?: boolean;
    /** Home shows no Play time chip (a new game's Added chip): the page's Play time column is drawn here. */
    playedMissing?: boolean;
    /** A Unifideck game's size column (the page's, right after Played), when Home knows it. */
    size?: { label: string; value: string } | null;
}

/**
 * The page's parts Spotlight Home draws as it turns into the page's Spotlight look (the open transition): the description
 * and the HowLongToBeat card's title, columns, bar and caption, as the page's card shows them (logic/hltbCardView), and
 * the page's store pill (the family pill in it) at the page's own size.
 * Hidden until opening (homeCss.openingRules); openMotion places it; the page then shows the same at once (intent).
 */
export function OpenExtras({ description, hltb, playedMinutes, locale, source, family, familyMultiple = false, sourceMultiple = false, playedMissing = false, size = null }: Props) {
    const parts = extrasParts(description, hltb, source, playedMissing, size !== null);
    const view = parts.includes('hltb') && hltb?.status === 'found' ? hltbFoundView(hltb.times, playedMinutes, locale, true) : null;
    // No match: the page card's two lines, so the card is not empty until they arrive after the hand-over.
    const none = parts.includes('hltb') && hltb?.status === 'notFound' ? hltbNotFoundView(hltb.overrideId) : null;
    return (
        <div className="gh-open-extras" data-parts={parts}>
            {parts.includes('desc') && <p className="gh-x-desc" data-settle={SETTLE.desc}>{description}</p>}
            {view && (
                <div className="gh-x-card" data-for="hltb">
                    <div className="gh-x-hltb">
                        <div className="gh-x-label" data-settle={SETTLE.hltbTitle}>{HLTB_TITLE}</div>
                        <div className="gh-x-stats">
                            {view.columns.map((c) => (
                                <div key={c.key}>
                                    <div className="gh-x-label" data-settle={SETTLE.label(c.key)}>{c.label}</div>
                                    <div className="gh-x-value" data-settle={SETTLE.value(c.key)}>{c.value}</div>
                                </div>
                            ))}
                        </div>
                        {view.bar !== null && <div className="gh-x-bar"><div style={{ width: `${view.bar}%` }} /></div>}
                        {view.caption !== null && <div className="gh-x-caption" data-settle={SETTLE.caption}>{view.caption}</div>}
                    </div>
                </div>
            )}
            {none && (
                <div className="gh-x-card" data-for="hltb">
                    <div className="gh-x-hltb">
                        <div className="gh-x-label" data-settle={SETTLE.hltbTitle}>{HLTB_TITLE}</div>
                        <div className="gh-x-caption" data-settle={SETTLE.muted}>{none.muted}</div>
                        <div className="gh-x-caption" data-settle={SETTLE.caption}>{none.caption}</div>
                    </div>
                </div>
            )}
            {playedMissing && (
                <div className="gh-x-card" data-for="played">
                    <div className="gh-x-played">
                        <div className="gh-x-label" data-settle={SETTLE.statLabel('played')}>{tr('played')}</div>
                        <div className="gh-x-value" data-settle={SETTLE.statValue('played')}>{formatHours(minutesToHours(playedMinutes), locale)}</div>
                    </div>
                </div>
            )}
            {size && (
                <div className="gh-x-card" data-for="size">
                    <div className="gh-x-size">
                        <div className="gh-x-label" data-settle={SETTLE.statLabel('size')}>{size.label}</div>
                        <div className="gh-x-value" data-settle={SETTLE.statValue('size')}>{size.value}</div>
                    </div>
                </div>
            )}
            {source && (
                <SourcePill plus={sourceMultiple} label={source} className="gh-x-pill" iconClassName="gh-x-pill-icon">
                    {family && <FamilyPill plus={familyMultiple} label={family} className="gh-x-family" iconClassName="gh-x-family-icon" />}
                </SourcePill>
            )}
        </div>
    );
}
