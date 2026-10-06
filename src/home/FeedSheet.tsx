import { Focusable } from '@decky/ui';
import type { GamepadEvent, NavEntryPositionPreferences } from '@decky/ui';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaUserFriends } from 'react-icons/fa';
import { LOG_PREFIX } from '../constants';
import { browserStores, capsuleUrls, heroUrls, landscapeUrls, storeHeaderUrl } from './artwork';
import { FeedCard } from './FeedCards';
import { claimsPreferredFocus, FEED_GAP, FEED_ROW2_HEADER, FeedData, FeedItem, FeedTab, feedItems, feedRows, feedScroll, hasSecondRow, rowPosition, secondRowTitle } from './feedLayout';
import { NAV_FIRST, onBack, PREFERRED_CHILD as PREFERRED, tabForButton } from './focusZones';
import { focusElement } from './homeNav';
import { clampTab, HomeMemory, noteHome, RESTORE_WAIT_MS, restoreStep } from './homeMemory';
import { useCardAccents } from './useHomeData';

const PREFERRED_CHILD = PREFERRED as NavEntryPositionPreferences;
const FIRST = NAV_FIRST as NavEntryPositionPreferences;

const TABS: Array<{ id: FeedTab; label: string; empty: string }> = [
    { id: 'news', label: 'What\'s new', empty: 'Nothing new' },
    { id: 'friends', label: 'Friends', empty: 'No friends online' },
    { id: 'recommended', label: 'Recommended', empty: 'Nothing to suggest yet' },
];

function urls(read: () => string[]): string[] {
    try {
        return read();
    } catch {
        return [];
    }
}

const art = (appId: number) => {
    const header = storeHeaderUrl(appId);
    return {
        hero: urls(() => heroUrls(appId, browserStores)),
        capsule: urls(() => capsuleUrls(appId, browserStores)),
        wide: urls(() => landscapeUrls(appId, browserStores)),
        store: header ? [header] : [],
    };
};

/** B handler for a zone: stops the event so Steam does not also act on it, then runs `step`. */
function cancel(zone: 'tabs' | 'feed', step: () => void) {
    return (evt: CustomEvent) => {
        try {
            evt?.stopPropagation?.();
            step();
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: back from the ${zone} failed`, error);
        }
    };
}

/**
 * The feed sheet: tab strip (What's new / Friends / Recommended) and the selected tab's cards. Like Steam's own
 * tabs, a tab is selected when it takes focus (so left/right switches the tab) and, once the sheet has been
 * entered, the selected tab is the preferred child when focus comes down from the actions. A tab without cards shows its own empty text and
 * renders no focusable row, so focus stays on the tabs. B: feed -> selected tab -> the game cards (focusZones.onBack).
 * `raised`: focus is in the tabs or feed (the page is translated up); `onZone` reports which one took focus.
 * L1/R1 anywhere in the tabs or feed switch the tab, as on Steam's own tabbed pages (focusZones.tabForButton);
 * on the game cards and the action row L1/R1 select the game instead, so the off-screen feed never changes from there.
 */
export function FeedSheet({ data, raised, viewport, space, onZone, onBackToGames, restore = null, onRestored }: {
    data: FeedData;
    raised: boolean;
    viewport: number;
    /** Height the raised sheet's rows may use (feedLayout.feedSpace of the canvas height). */
    space: number;
    onZone(zone: 'tabs' | 'feed'): void;
    onBackToGames(): void;
    /** Where Home was when the user left it (homeMemory), applied once: the tab, the card, and focus in the tabs or feed. */
    restore?: HomeMemory | null;
    /** The restore is done (or given up), so Home stops holding its first focus back. */
    onRestored?(): void;
}) {
    const [tab, setTab] = useState(() => clampTab(restore?.tab ?? 0, TABS.length));
    // The selected card of each row (the second row: What's new's recently updated, Recommended's wishlist deals) and
    // the row that last had focus.
    const [at, setAt] = useState<[number, number]>([0, 0]);
    const [row, setRow] = useState<0 | 1>(0);
    // Set once focus has been in the tabs or feed in this mount. Until then the sheet claims no preferred focus
    // (Home opens on the game cards) and its rows enter at their first child, which is then the selected
    // tab and card (tab 0, card 0: neither can change before the sheet is entered). Card accents also wait for it.
    const [entered, setEntered] = useState(false);
    const [restoring, setRestoring] = useState(restore !== null);
    const [waited, setWaited] = useState(false);
    useEffect(() => {
        if (raised) setEntered(true);
    }, [raised]);
    const entry = entered ? PREFERRED_CHILD : FIRST;
    const tabRefs = useRef<Array<HTMLDivElement | null>>([]);
    const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
    // Set by L1/R1 from the feed: once the new tab's cards are committed, focus its first card (its tab when empty).
    const focusAfterSwitch = useRef(false);

    const { news, updated, friends, trending, recommended, deals } = data;
    const tabId = TABS[tab].id;
    const items = useMemo(() => feedItems(tabId, { news, updated, friends, trending, recommended, deals }, art, space), [tabId, news, updated, friends, trending, recommended, deals, space]);
    const geometry = feedRows(tabId, space, hasSecondRow(tabId, { news, updated, friends, trending, recommended, deals }));
    const rows: [FeedItem[], FeedItem[]] = [items.filter((i) => i.row === 0), items.filter((i) => i.row === 1)];
    /** A card's place in `items` (row 1 first, then row 2), which also indexes cardRefs. */
    const flat = (r: 0 | 1, i: number) => (r === 0 ? i : rows[0].length + i);
    const accentOf = useCardAccents(items.map((i) => i.accentAppId ?? 0), entered);
    const sel: [number, number] = [0, 1].map((r) => Math.min(Math.max(0, at[r]), Math.max(0, rows[r].length - 1))) as [number, number];
    const selRow: 0 | 1 = row === 1 && rows[1].length > 0 ? 1 : 0;
    const scrolls = [0, 1].map((r) => feedScroll(sel[r], rows[r].map((i) => i.width), FEED_GAP, viewport));
    const lefts = rows.map((list) => {
        const out: number[] = [];
        list.reduce((x, item) => {
            out.push(x);
            return x + item.width + FEED_GAP;
        }, 0);
        return out;
    });
    const select = (r: 0 | 1, i: number) => {
        setRow(r);
        setAt((old) => (old[r] === i ? old : (r === 0 ? [i, old[1]] : [old[0], i])));
    };
    const reset = () => {
        setAt([0, 0]);
        setRow(0);
    };

    // Restore the remembered card and focus. The Recommended deals load late, so its card may take a moment (the
    // wait is bounded); focus moves into the tabs or feed only while the user has not left them meanwhile.
    useEffect(() => {
        if (!restoring || !restore) return undefined;
        const step = restoreStep(items.map((i) => i.key), restore.feedKey, TABS[tab].id !== 'recommended', waited);
        if (step === 'wait') {
            // Focus the selected tab meanwhile, so Home is not left without focus.
            if (restore.zone === 'feed' && raised) focusElement(tabRefs.current[tab], `${TABS[tab].id} tab`);
            const timer = setTimeout(() => setWaited(true), RESTORE_WAIT_MS);
            return () => clearTimeout(timer);
        }
        if (step !== 'tab') {
            const place = rowPosition(rows[0].length, rows[1].length, step.card);
            select(place.row, place.index);
        }
        if (tab !== 0 || step !== 'tab') setEntered(true);
        if (restore.zone === 'feed' && raised) {
            if (step === 'tab') focusElement(tabRefs.current[tab], `${TABS[tab].id} tab`);
            else focusElement(cardRefs.current[step.card], `feed card ${step.card}`);
        } else if (restore.zone === 'tabs' && raised) {
            focusElement(tabRefs.current[tab], `${TABS[tab].id} tab`);
        }
        setRestoring(false);
        onRestored?.();
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restoring, items, waited, raised]);
    // Remember the tab and card for the way back (not while the restore is still reading them).
    const feedKey = items[flat(selRow, sel[selRow])]?.key ?? null;
    useEffect(() => {
        if (!restoring) noteHome({ tab, feedKey });
    }, [restoring, tab, feedKey]);

    const selectTab = (i: number) => {
        onZone('tabs');
        if (i === tab) return;
        setTab(i);
        reset();
    };
    const enterFeed = () => {
        if (rows[0].length > 0) focusElement(cardRefs.current[flat(0, sel[0])], `feed card ${sel[0]}`);
    };
    useLayoutEffect(() => {
        if (!focusAfterSwitch.current) return;
        focusAfterSwitch.current = false;
        if (items.length > 0) focusElement(cardRefs.current[0], `${TABS[tab].id} card 0`);
        else focusElement(tabRefs.current[tab], `${TABS[tab].id} tab`);
    }, [tab, items]);
    /**
     * L1/R1 (Steam's own tab pattern: handled, then stopped so nothing else acts on them). In the tabs, focusing
     * the new tab selects it through its own focus handler (selectTab). In the feed, the tab switches and focus moves
     * to the new tab's first card once rendered (the old card unmounts). At an end nothing changes.
     */
    const shoulder = (zone: 'tabs' | 'feed') => (evt: GamepadEvent) => {
        try {
            const next = tabForButton(tab, Number(evt?.detail?.button), TABS.length);
            if (next === null) return;
            evt.preventDefault?.();
            evt.stopPropagation?.();
            if (next === tab) return;
            if (zone === 'tabs') {
                focusElement(tabRefs.current[next], `${TABS[next].id} tab`);
                return;
            }
            focusAfterSwitch.current = true;
            setTab(next);
            reset();
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: tab switch from the ${zone} failed`, error);
        }
    };
    const onlineFriends = Math.max(0, Math.floor(Number(data.friendsOnline) || 0));
    const backFromTabs = cancel('tabs', () => {
        if (onBack('tabs') === 'recents') onBackToGames();
    });
    const backFromFeed = cancel('feed', () => {
        if (onBack('feed') === 'tabs') focusElement(tabRefs.current[tab], `${TABS[tab].id} tab`);
    });

    return (
        <>
            <Focusable className="gh-tabs" flow-children="row" navEntryPreferPosition={entry} onCancel={backFromTabs} onButtonDown={shoulder('tabs')}>
                {TABS.map((t, i) => (
                    <Focusable
                        key={t.id}
                        ref={(el: HTMLDivElement | null) => {
                            tabRefs.current[i] = el;
                        }}
                        className={`gh-tab${i === tab ? ' gh-tab-on' : ''}`}
                        focusClassName="gh-tab-focus"
                        noFocusRing
                        preferredFocus={claimsPreferredFocus(entered, i, tab)}
                        onFocus={() => selectTab(i)}
                        onGamepadFocus={() => selectTab(i)}
                        onActivate={enterFeed}
                        onClick={() => selectTab(i)}
                        role="tab"
                        aria-selected={i === tab}
                    >
                        <span>{t.label}</span>
                        {t.id === 'friends' && (
                            <span className={`gh-tab-count${onlineFriends > 0 ? ' gh-tab-count-on' : ''}`} aria-label={`${onlineFriends} online`}>
                                <FaUserFriends aria-hidden="true" />
                                {onlineFriends}
                            </span>
                        )}
                        <div className="gh-tab-line" />
                    </Focusable>
                ))}
                <div className="gh-tabs-more" aria-hidden="true">▾ MORE</div>
            </Focusable>
            <div className="gh-feed" style={{ height: `${geometry.total}px` }}>
                {items.length > 0 ? (
                    ([0, 1] as const).map((r) => rows[r].length === 0 ? null : (
                        <div key={`row-${r}`}>
                            {r === 1 && (
                                <div className="gh-feed-row-title" style={{ top: `${geometry.row2Top - FEED_ROW2_HEADER}px` }}>{secondRowTitle(tabId)}</div>
                            )}
                            <div className="gh-feed-row" style={{ top: `${r === 0 ? 0 : geometry.row2Top}px`, height: `${r === 0 ? geometry.row1 : geometry.row2}px` }}>
                                <Focusable
                                    className="gh-feed-track"
                                    flow-children="row"
                                    navEntryPreferPosition={entry}
                                    onCancel={backFromFeed}
                                    onButtonDown={shoulder('feed')}
                                    style={{ transform: `translateX(${-scrolls[r]}px)` }}
                                >
                                    {rows[r].map((item, i) => (
                                        <FeedCard
                                            key={item.key}
                                            item={item}
                                            left={lefts[r][i]}
                                            accent={accentOf(item.accentAppId ?? 0)}
                                            preferred={claimsPreferredFocus(entered, i, sel[r])}
                                            onFocused={() => {
                                                onZone('feed');
                                                select(r, i);
                                            }}
                                            setRef={(el) => {
                                                cardRefs.current[flat(r, i)] = el;
                                            }}
                                        />
                                    ))}
                                </Focusable>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="gh-feed-empty">{TABS[tab].empty}</div>
                )}
            </div>
        </>
    );
}
