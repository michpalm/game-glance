import { Focusable } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LuTrophy } from 'react-icons/lu';
import { ACH_SORTS, achievementsPage, SORT_LABELS, type AchSort, type AchievementsPageView as Page } from '../achievementsPage';
import { MenuPicker } from './MenuPicker';
import type { GameContext } from '../model';
import { achievementSets } from '../steam/achievementSets';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
import { Crumb } from './SettingRows';
import { installPageScroll } from '../socialScroll';
import { takeSteamFocus } from '../../home/steamFocus';

interface ViewProps {
    game: string; page: Page | null; loading?: boolean;
    /** Focus reached a set: show its list. */ onPick(id: number): void;
    /** A on a set: into its list. */ onEnter?(id: number): void;
    /** B in the list: back to its set. */ onLeaveList?(): void;
    /** The list's order (sort pill) and its change. */ sort?: AchSort; onSort?(sort: AchSort): void;
    openSteam(): void;
}
type CancelEvent = { stopPropagation?(): void; preventDefault?(): void } | undefined;
/** Each column scrolls on its own, with the menu's smooth scroll (the panel itself holds still: the page fits it). */
const ownScroll = (column: HTMLDivElement | null) => column ? installPageScroll(column) : undefined;

/**
 * In game › Achievements (mock-up "Achievement Sets", board 2): the sets at left, the picked set's next up or recently
 * unlocked at right. Search, filters and friends stay in Steam's own list, a button away. Stateless.
 */
export function AchievementsPageView({ game, page, loading = false, onPick, onEnter, onLeaveList, sort = 'closest', onSort, openSteam }: ViewProps) {
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
            <Focusable ref={ownScroll} className="gg-ach-sets" flow-children="column" onFocus={showSet}>
                <h3>Sets</h3>
                {page.sets.map(set => <div key={set.id} className="gg-ach-set-row" data-gg-set={String(set.id)}><MenuAction id={`achievements:set:${set.id}`} className="gg-ach-set" selected={set.id === page.picked} onAction={() => onEnter ? onEnter(set.id) : onPick(set.id)}>
                    <span className="gg-ach-set-head">
                        <span className="gg-ach-set-text"><strong>{set.name}</strong><small>{set.kind}</small></span>
                        <span className="gg-ach-count">{set.done && <LuTrophy className="gg-ach-trophy" aria-label="Set completed" />}{set.count}</span>
                    </span>
                    <span className="gg-ach-bar" data-base={set.base ? '' : undefined} aria-hidden="true"><i style={{ width: `${Math.round(set.ratio * 100)}%` }} /></span>
                </MenuAction></div>)}
            </Focusable>
            {/* Keyed by the set: each set's list starts at the top, with its own scroll. */}
            <Focusable className="gg-ach-right" flow-children="column" onCancel={leaveList}>
            {/* The title and the sort pill stay put above the list; Up from the first achievement reaches the pill. */}
            <div className="gg-ach-list-head">
                <h3>{page.title}</h3>
                <MenuPicker<AchSort> id="achievements:sort" text={SORT_LABELS[sort]} selected={sort}
                    options={ACH_SORTS.map(id => ({ id, label: SORT_LABELS[id] }))} onPick={next => { if (next !== sort) onSort?.(next); }} />
            </div>
            <Focusable key={`list:${page.picked}:${sort}`} ref={ownScroll} className="gg-ach-list" flow-children="column">
                {page.items.length === 0 && <p className="gg-ach-note">Nothing here yet.</p>}
                {page.items.map(item => <MenuAction key={item.key} id={`achievements:item:${item.key}`} className={`gg-ach-item${item.rare ? ' gg-ach-rare' : ''}`} onAction={openSteam}>
                    <span className="gg-ach-icon">{item.icon ? <img src={item.icon} alt="" /> : <LuTrophy aria-hidden="true" />}</span>
                    <span className="gg-ach-text">
                        <strong>{item.name}</strong>
                        {item.description && <small>{item.description}</small>}
                        {item.progress !== null && <span className="gg-ach-progress" aria-hidden="true"><i style={{ width: `${Math.round(item.progress * 100)}%` }} /></span>}
                    </span>
                    <span className="gg-ach-side"><span>{item.right}</span>{item.rarity && <small>{item.rarity}</small>}</span>
                </MenuAction>)}
            </Focusable>
            </Focusable>
        </Focusable>
        <Focusable className="gg-ach-actions" flow-children="row">{steam}</Focusable>
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

/** The page for the running game: Steam's data as its cache holds it, else Steam's own requests for it. */
export function AchievementsPage({ game, handoff }: { game: GameContext; handoff(request: NativeRequest): void }) {
    const [data, setData] = useState(() => ({ sets: achievementSets.read(game.appId), rates: achievementSets.readRates(game.appId), loading: true }));
    const [picked, setPicked] = useState<number | null>(null);
    const [sort, setSort] = useState<AchSort>(() => lastSort);
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
    const page = data.sets ? achievementsPage(data.sets.schema, data.sets.user, data.rates ?? undefined, picked, Math.floor(Date.now() / 1000), navigator.language, game.name, sort) : null;
    return <div ref={host} className="gg-ach-host">
        <AchievementsPageView game={game.name || 'In game'} page={page} loading={data.loading} onPick={setPicked}
            onEnter={id => { setPicked(id); setMove('list'); }} onLeaveList={() => setMove('set')}
            sort={sort} onSort={next => { lastSort = next; setSort(next); }}
            openSteam={() => handoff({ kind: 'game-action', appId: game.appId, gameId: game.gameId, actionId: 'achievements' })} />
    </div>;
}
