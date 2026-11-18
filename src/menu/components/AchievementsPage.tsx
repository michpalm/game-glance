import { Focusable } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LuPin, LuTrophy } from 'react-icons/lu';
import { pinSlot, togglePin } from '../achievementPins';
import { settings, useSettings } from '../../data/settings';
import { ACH_SORTS, achievementsPage, SORT_LABELS, type AchSort, type AchievementsPageView as Page } from '../achievementsPage';
import { MenuPicker } from './MenuPicker';
import type { GameContext } from '../model';
import { achievementSets } from '../steam/achievementSets';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
import { Crumb } from './SettingRows';
import { NOTIFICATION_FOCUS_INSET, revealWithin } from '../socialScroll';
import { takeSteamFocus } from '../../home/steamFocus';

interface ViewProps {
    game: string; page: Page | null; loading?: boolean;
    /** Focus reached a set: show its list. */ onPick(id: number): void;
    /** A on a set: into its list. */ onEnter?(id: number): void;
    /** B in the list: back to its set. */ onLeaveList?(): void;
    /** The list's order (sort pill) and its change. */ sort?: AchSort; onSort?(sort: AchSort): void;
    /** Y on an achievement: pin or unpin it (menu/achievementPins). */ onTogglePin?(key: number): void;
    openSteam(): void;
}
type CancelEvent = { stopPropagation?(): void; preventDefault?(): void } | undefined;
/**
 * Each column scrolls on its own (the panel itself holds still: the page fits it). The focused row is brought into
 * view at once, with a margin, as focus lands: Steam then finds it in view and does not scroll too. The menu's page
 * scroll (installPageScroll) waits for Steam's scroll to end and glides again, which felt slow in a long list.
 */
export function followFocus(column: HTMLElement): () => void {
    const onFocus = (event: Event) => {
        const row = (event.target as Element | null)?.closest?.<HTMLElement>('button, .Focusable');
        if (row && column.contains(row)) revealWithin(column, row, NOTIFICATION_FOCUS_INSET);
    };
    column.addEventListener('focusin', onFocus);
    return () => column.removeEventListener('focusin', onFocus);
}
/** Marks which way a column has more to scroll (data-more-above / data-more-below): those edges fade, so rows never end in a hard cut. */
export function markEdges(column: HTMLElement): () => void {
    const mark = () => {
        const above = column.scrollTop > 1, below = column.scrollTop + column.clientHeight < column.scrollHeight - 1;
        if (above) column.setAttribute('data-more-above', ''); else column.removeAttribute('data-more-above');
        if (below) column.setAttribute('data-more-below', ''); else column.removeAttribute('data-more-below');
    };
    mark();
    column.addEventListener('scroll', mark, { passive: true });
    return () => column.removeEventListener('scroll', mark);
}
const ownScroll = (column: HTMLDivElement | null) => {
    if (!column) return undefined;
    const stops = [followFocus(column), markEdges(column)];
    return () => stops.forEach(stop => stop());
};

/**
 * In game › Achievements (mock-up "Achievement Sets", board 2): the sets at left, the picked set's next up or recently
 * unlocked at right. Search, filters and friends stay in Steam's own list, a button away. Stateless.
 */
export function AchievementsPageView({ game, page, loading = false, onPick, onEnter, onLeaveList, sort = 'closest', onSort, onTogglePin, openSteam }: ViewProps) {
    const steam = <MenuAction id="achievements:steam" className="gg-ach-steam" onAction={openSteam}>Open full list in Steam</MenuAction>;
    if (!page) return <>
        <Crumb parent={game} title="Achievements" />
        <p className="gg-ach-note">{loading ? 'Loading achievements…' : 'Could not load achievements.'}</p>
        <Focusable className="gg-ach-actions" flow-children="row">{steam}</Focusable>
    </>;
    const showSet = (event: { target: unknown }) => {
        const id = Number((event.target as { closest?(s: string): { getAttribute(n: string): string | null } | null })?.closest?.('[data-gg-set]')?.getAttribute('data-gg-set'));
        if (Number.isInteger(id) && id !== page.picked) onPick(id);
    };
    const leaveList = (event?: CancelEvent) => { event?.stopPropagation?.(); event?.preventDefault?.(); onLeaveList?.(); };
    return <div className="gg-ach-page">
        <Crumb parent={game} title="Achievements" aside={<span className="gg-ach-header">{page.header}</span>} />
        <Focusable className="gg-ach" flow-children="row">
            <Focusable className="gg-ach-left" flow-children="column">
            {/* One header row per column, the pill's height, outside the scrolling lists: titles and first cards line up. */}
            <div className="gg-ach-head"><h3>Sets</h3></div>
            <Focusable ref={ownScroll} className="gg-ach-sets" flow-children="column" onFocus={showSet}>
                {page.sets.map(set => <div key={set.id} className="gg-ach-set-row" data-gg-set={String(set.id)}><MenuAction id={`achievements:set:${set.id}`} className="gg-ach-set" selected={set.id === page.picked} onAction={() => onEnter ? onEnter(set.id) : onPick(set.id)}>
                    <span className="gg-ach-set-head">
                        <span className="gg-ach-set-text"><strong>{set.name}</strong><small>{set.kind}</small></span>
                        <span className="gg-ach-count">{set.done && <LuTrophy className="gg-ach-trophy" aria-label="Set completed" />}{set.count}</span>
                    </span>
                    <span className="gg-ach-bar" data-base={set.base ? '' : undefined} aria-hidden="true"><i style={{ width: `${Math.round(set.ratio * 100)}%` }} /></span>
                </MenuAction></div>)}
            </Focusable>
            {/* Steam's own list under the sets: the achievements get the column's full height. */}
            <Focusable className="gg-ach-actions gg-ach-left-actions" flow-children="column">{steam}</Focusable>
            </Focusable>
            {/* Keyed by the set: each set's list starts at the top, with its own scroll. */}
            <Focusable className="gg-ach-right" flow-children="column" onCancel={leaveList}>
            {/* The title and the sort pill stay put above the list; Up from the first achievement reaches the pill. */}
            <div className="gg-ach-head gg-ach-list-head">
                <h3>{page.title}</h3>
                <MenuPicker<AchSort> id="achievements:sort" text={SORT_LABELS[sort]} selected={sort}
                    options={ACH_SORTS.map(id => ({ id, label: SORT_LABELS[id] }))} onPick={next => { if (next !== sort) onSort?.(next); }} />
            </div>
            <Focusable key={`list:${page.picked}:${sort}`} ref={ownScroll} className="gg-ach-list" flow-children="column">
                {page.items.length === 0 && <p className="gg-ach-note">Nothing here yet.</p>}
                {page.items.map(item => <MenuAction key={item.key} id={`achievements:item:${item.key}`} className={`gg-ach-item${item.rare ? ' gg-ach-rare' : ''}${item.pinned ? ' gg-ach-pinned' : ''}`} onAction={openSteam}
                    onOptions={() => onTogglePin?.(item.key)} optionsLabel={item.pinned ? 'Unpin' : 'Pin'}>
                    <span className="gg-ach-icon">{item.icon ? <img src={item.icon} alt="" /> : <LuTrophy aria-hidden="true" />}</span>
                    <span className="gg-ach-text">
                        <strong>{item.pinned && <LuPin className="gg-ach-pin" aria-label="Pinned" />}{item.name}</strong>
                        {item.description && <small>{item.description}</small>}
                        {item.progress !== null && <span className="gg-ach-progress" aria-hidden="true"><i style={{ width: `${Math.round(item.progress * 100)}%` }} /></span>}
                    </span>
                    <span className="gg-ach-side"><span>{item.right}</span>{item.rarity && <small>{item.rarity}</small>}</span>
                </MenuAction>)}
            </Focusable>
            </Focusable>
        </Focusable>
    </div>;
}

/** The last order picked: kept while Steam runs, for every game. */
let lastSort: AchSort = 'closest';

/** DOM focus and Steam's gamepad focus together, as the rest of the menu moves focus. */
function focusOn(el: HTMLElement | null | undefined): void {
    if (!el) return;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
}

/** Which Steam list "Open full list" goes to: the running game's overlay, or the library's for any other game. */
export type SteamList = 'achievements' | 'achievements-list';
/** The game an achievements:<appId> view draws: the running game itself, else one from the library (Pure). */
export function pageGame(appId: number, running: GameContext | null, nameOf: (appId: number) => string | undefined): { game: GameContext; steamList: SteamList } {
    if (running && running.appId === appId) return { game: running, steamList: 'achievements' };
    return { game: { appId, gameId: String(appId), name: nameOf(appId) ?? '', kind: 'local', actionIds: [] }, steamList: 'achievements-list' };
}
/** A game's name from Steam's library. */
export function libraryName(appId: number): string | undefined {
    try {
        const name = (globalThis as { appStore?: { GetAppOverviewByAppID?(id: number): { display_name?: unknown } | null } }).appStore?.GetAppOverviewByAppID?.(appId)?.display_name;
        return typeof name === 'string' && name !== '' ? name : undefined;
    } catch { return undefined; }
}

/** A game's page: Steam's data as its cache holds it, else Steam's own requests for it. */
export function AchievementsPage({ game, handoff, steamList = 'achievements' }: { game: GameContext; handoff(request: NativeRequest): void; steamList?: SteamList }) {
    const [data, setData] = useState(() => ({ sets: achievementSets.read(game.appId), rates: achievementSets.readRates(game.appId), loading: true }));
    const [picked, setPicked] = useState<number | null>(null);
    const [sort, setSort] = useState<AchSort>(() => lastSort);
    const pins = useSettings().achievementPins;
    // Where focus goes after the next render: into the list (A on a set) or back to the picked set (B in the list).
    const [move, setMove] = useState<'list' | 'set' | null>(null);
    const host = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        if (!move) return;
        setMove(null);
        const root = host.current;
        focusOn(move === 'list' ? root?.querySelector<HTMLElement>('.gg-ach-list button') : root?.querySelector<HTMLElement>('.gg-ach-set[aria-pressed="true"]'));
    }, [move]);
    useEffect(() => {
        let alive = true;
        const appId = game.appId;
        void Promise.all([achievementSets.load(appId), achievementSets.loadRates(appId)]).then(([sets, rates]) => { if (alive) setData({ sets, rates, loading: false }); });
        return () => { alive = false; };
    }, [game.appId]);
    const at = (set: number) => pins[pinSlot(game.appId, set)] ?? [];
    let page = data.sets ? achievementsPage(data.sets.schema, data.sets.user, data.rates ?? undefined, picked, Math.floor(Date.now() / 1000), navigator.language, game.name, sort) : null;
    // The picked set is known only once the page is built (the first set in progress, before one is picked): build it again with that set's pins.
    if (data.sets && page && at(page.picked).length > 0) page = achievementsPage(data.sets.schema, data.sets.user, data.rates ?? undefined, page.picked, Math.floor(Date.now() / 1000), navigator.language, game.name, sort, at(page.picked));
    const set = page?.picked;
    return <div ref={host} className="gg-ach-host">
        <AchievementsPageView game={game.name || 'In game'} page={page} loading={data.loading} onPick={setPicked}
            onEnter={id => { setPicked(id); setMove('list'); }} onLeaveList={() => setMove('set')}
            sort={sort} onSort={next => { lastSort = next; setSort(next); }}
            onTogglePin={key => { if (page && set !== undefined) void settings.setAchievementPins(pinSlot(game.appId, set), togglePin(page.pins, key)); }}
            openSteam={() => handoff({ kind: 'game-action', appId: game.appId, gameId: game.gameId, actionId: steamList })} />
    </div>;
}
