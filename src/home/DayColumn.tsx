import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import type { CSSProperties } from 'react';
import { tr } from '../i18n/steamText';
import { FeedCard } from './FeedCards';
import type { FeedItem } from './feedLayout';
import { NAV_MAINTAIN_Y } from './focusZones';

/** A day column's heading line and the room around and between its cards (feedLayout.calendarColumn's numbers). */
const HEADING = 30;
const PAD = 8;
const GAP = 8;

/**
 * One Personal Calendar day in the Recommended tab's first row (docs/superpowers/specs/2026-11-18-personal-calendar-row-design.md):
 * a frosted column with the day's heading ("Wed 18/11"; today says so, in the accent) over its games, stacked, each a
 * feed card (art; the name shows on focus) whose A opens the store page. Moving left or right between days keeps the
 * height focus was at. `setRef` gets the first game, where focus goes when the row is entered.
 */
export function DayColumn({ item, left, accent, preferred, onFocused, setRef }: {
    item: FeedItem;
    left: number;
    accent: string;
    preferred: boolean;
    onFocused(): void;
    setRef(el: HTMLDivElement | null): void;
}) {
    const day = item.day;
    if (!day) return null;
    const label = `${day.weekday} ${day.date}`;
    return (
        <div className={`gh-cal-day${day.today ? ' gh-cal-today' : ''}`} style={{ left: `${left}px`, width: `${item.width}px`, height: `${item.height}px`, '--gh-card-accent': accent } as CSSProperties}>
            <div className="gh-cal-head">
                <span className="gh-cal-weekday">{day.today ? tr('today') : day.weekday}</span> <span className="gh-cal-date">{day.date}</span>
            </div>
            <Focusable className="gh-cal-games" flow-children="column" preferredFocus={preferred} navEntryPreferPosition={NAV_MAINTAIN_Y as NavEntryPositionPreferences}>
                {day.games.map((game, k) => (
                    <FeedCard
                        key={game.appId}
                        item={{ ...item, key: `${item.key}-${game.appId}`, width: day.cardW, height: day.cardH, art: game.art, title: game.name || label, opens: game.opens, motion: game.motion, day: undefined, start: undefined }}
                        left={PAD}
                        top={HEADING + k * (day.cardH + GAP)}
                        accent={accent}
                        preferred={preferred && k === 0}
                        onFocused={onFocused}
                        setRef={k === 0 ? setRef : () => {}}
                    />
                ))}
            </Focusable>
        </div>
    );
}
