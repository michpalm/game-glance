import { ConfirmModal, DialogButton, Focusable, Menu, MenuItem, Navigation, showContextMenu, showModal } from '@decky/ui';
import { LuHardDrive, LuMemoryStick } from 'react-icons/lu';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import { browserStores, heroUrls, landscapeUrls } from '../home/artwork';
import { takeSteamFocus } from '../home/steamFocus';
import { createStorageBindings, type StorageBindings, type StorageSnapshot } from '../menu/steam/storage';
import { moveQuestion, refocusKey, refusal, storageView, uninstallQuestion, type Question, type GameRow, type StorageView } from './storageModel';
import { storageStyles } from './storageStyles';

export { STORAGE_ROUTE } from './route';
const NOTE_MS = 4000;

type Button = 'a' | 'x' | 'y';
interface ViewProps { view: StorageView; art(appId: number): string | null; hero: string | null; onPick(index: number): void; onRow(row: GameRow, button: Button): void; onBack?(): void }

function GameRowView({ row, art, onRow }: { row: GameRow; art: string | null; onRow: ViewProps['onRow'] }) {
    // Pick C: one control per game; X and Y ride on it, so Steam's footer shows their hints and nothing is added to the row.
    const buttons: Record<string, unknown> = { onClick: () => onRow(row, 'a'), onOKActionDescription: row.a.label };
    if (row.x) Object.assign(buttons, { onSecondaryButton: () => onRow(row, 'x'), onSecondaryActionDescription: row.x.label });
    if (row.y) Object.assign(buttons, { onOptionsButton: () => onRow(row, 'y'), onOptionsActionDescription: row.y.label });
    const Button = DialogButton as unknown as ComponentType<Record<string, unknown>>;
    return <Button className="gg-storage-row" data-gg-focus={`storage:game:${row.appId}`} {...buttons}>
        {art ? <img className="gg-storage-art" src={art} alt="" /> : <span className="gg-storage-art gg-storage-art-none" />}
        <span className="gg-storage-text">
            <span className="gg-storage-name">{row.name}</span>
            <span className="gg-storage-status">{row.status}</span>
            {row.progress !== null && <span className="gg-storage-progress"><span className="gg-storage-progress-fill" style={{ width: `${Math.round(row.progress * 100)}%` }} /></span>}
        </span>
        <span className="gg-storage-size">{row.size}</span>
    </Button>;
}

/** Stateless. */
export function StoragePageView({ view, art, hero, onPick, onRow, onBack }: ViewProps) {
    const Button = DialogButton as unknown as ComponentType<Record<string, unknown>>;
    // B leaves from anywhere on the page, the unavailable page included.
    return <Focusable className="gg-storage" onCancelButton={onBack} onCancelActionDescription="Back">
        <style>{storageStyles}</style>
        {hero && <div className="gg-storage-hero" style={{ backgroundImage: `url("${hero}")` }} />}
        <div className="gg-storage-shade" />
        <div className="gg-storage-page">
            <h1 className="gg-storage-title">Storage</h1>
            {view.loading ? null : !view.available ? <p className="gg-storage-unavailable">Storage is unavailable.</p> :
                <Focusable className="gg-storage-columns" flow-children="row">
                    <Focusable className="gg-storage-drives" flow-children="column">
                        {view.cards.map(card => {
                            const Icon = card.kind === 'sd' ? LuMemoryStick : LuHardDrive;
                            return <Button key={card.index} className="gg-storage-card" data-gg-focus={`storage:drive:${card.index}`} aria-current={card.index === view.picked}
                                onFocus={() => onPick(card.index)}>
                                <span className="gg-storage-card-name"><Icon aria-hidden="true" /><span>{card.name}</span></span>
                                <span className="gg-storage-free"><strong>{card.free}</strong><span>GB free</span></span>
                                <span className="gg-storage-card-line">{card.line}</span>
                                {card.moving && <span className="gg-storage-card-moving">{card.moving}</span>}
                                <span className="gg-storage-bar"><span style={{ width: `${Math.round(card.usedRatio * 100)}%` }} /></span>
                            </Button>;
                        })}
                    </Focusable>
                    <Focusable className="gg-storage-list" flow-children="column">
                        <p className="gg-storage-eyebrow">{view.eyebrow}</p>
                        {view.rows.map(row => <GameRowView key={row.appId} row={row} art={art(row.appId)} onRow={onRow} />)}
                        {view.empty && <p className="gg-storage-empty">{view.empty}</p>}
                    </Focusable>
                </Focusable>}
        </div>
        {view.note && <div className="gg-storage-note" role="status">{view.note}</div>}
    </Focusable>;
}

const steamGlobal = (name: string): unknown => (globalThis as Record<string, unknown>)[name];
let shared: StorageBindings | null = null;
const bindings = () => shared ??= createStorageBindings(steamGlobal('SteamClient'), steamGlobal('SteamUIStore'));

/** The most recently played installed game's hero, for the backdrop. */
function heroOf(snapshot: StorageSnapshot): string | null {
    const games = snapshot.drives.flatMap(d => d.games).filter(g => g.lastPlayed > 0).sort((a, b) => b.lastPlayed - a.lastPlayed);
    for (const game of games.slice(0, 1)) { try { return heroUrls(game.appId, browserStores)[0] ?? null; } catch { return null; } }
    return null;
}
const artOf = (appId: number) => { try { return landscapeUrls(appId, browserStores)[0] ?? null; } catch { return null; } };

function focusKey(root: ParentNode | null, key: string | null): boolean {
    const el = key ? root?.querySelector<HTMLElement>(`[data-gg-focus="${key}"]`) : null;
    if (!el) return false;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
    return true;
}

export function StoragePage() {
    const storage = useMemo(bindings, []);
    const snapshot = useSyncExternalStore(storage.subscribe, storage.read);
    const [picked, setPicked] = useState<number | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(noteTimer.current), []);
    const say = (text: string | null) => {
        clearTimeout(noteTimer.current);
        setNote(text);
        if (text) noteTimer.current = setTimeout(() => setNote(null), NOTE_MS);
    };
    const view = storageView(snapshot, picked, Date.now(), note);
    const hero = useMemo(() => heroOf(snapshot), [snapshot.drives]);
    const host = useRef<HTMLDivElement | null>(null);

    // First focus: the first game, else the picked drive's card.
    const started = useRef(false);
    useLayoutEffect(() => {
        if (started.current || !view.available) return;
        started.current = focusKey(host.current, view.rows[0] ? `storage:game:${view.rows[0].appId}` : `storage:drive:${view.picked}`);
    });
    // The list changes under the cursor (an uninstall, a move): only when focus was lost, go to the row now in its place.
    const ids = useRef<number[]>([]), focused = useRef<number | null>(null);
    useLayoutEffect(() => {
        const after = view.rows.map(r => r.appId), before = ids.current;
        ids.current = after;
        // The page lives in Steam's window, not the plugin's: its own document says where focus is.
        const doc = host.current?.ownerDocument, active = doc?.activeElement;
        const lost = !active || active === doc?.body || !active.isConnected;
        focusKey(host.current, refocusKey(before, after, focused.current, lost, view.picked));
    });

    const findGame = (appId: number) => {
        for (const drive of snapshot.drives) { const game = drive.games.find(g => g.appId === appId); if (game) return { drive, game }; }
        return null;
    };
    const startMove = async (appId: number, toIndex: number) => {
        const found = findGame(appId), target = snapshot.drives.find(d => d.index === toIndex);
        const result = await storage.move(appId, toIndex);
        const text = found && target ? refusal(result, found.game, target) : null;
        if (text) say(text);
    };
    const ask = (question: Question, onOK: () => void) => {
        const props = { strTitle: question.title, strDescription: question.text, strOKButtonText: question.ok, strCancelButtonText: 'Cancel', onOK };
        showModal(<ConfirmModal {...(props as object)} />, host.current?.ownerDocument?.defaultView ?? undefined);
    };
    const askMove = (appId: number, toIndex: number) => {
        const found = findGame(appId), target = snapshot.drives.find(d => d.index === toIndex);
        if (found && target) ask(moveQuestion(found.game, found.drive, target), () => { void startMove(appId, toIndex); });
    };
    const onRow = (row: GameRow, button: Button) => {
        const action = row[button];
        if (!action) return;
        const found = findGame(row.appId);
        switch (action.run) {
            case 'page': Navigation.Navigate(`/library/app/${row.appId}`); break;
            case 'cancel': storage.cancelMove(); break;
            case 'move': {
                const target = snapshot.drives.find(d => d.index !== found?.drive.index);
                if (target) askMove(row.appId, target.index);
                break;
            }
            case 'pick-drive': {
                const targets = snapshot.drives.filter(d => d.index !== found?.drive.index);
                const Item = MenuItem as unknown as ComponentType<Record<string, unknown>>;
                showContextMenu(<Menu label="Move to" cancelText="Cancel">
                    {targets.map(d => <Item key={d.index} onSelected={() => askMove(row.appId, d.index)}>{d.name}</Item>)}
                </Menu>, host.current?.querySelector(`[data-gg-focus="storage:game:${row.appId}"]`) ?? undefined);
                break;
            }
            case 'uninstall': {
                if (!found) break;
                // Steam's own uninstall asks first in its own dialog (not reachable from a plugin); this asks the same question.
                ask(uninstallQuestion(found.game, found.drive), () => { if (!storage.uninstall(row.appId)) say('Close the game first.'); });
                break;
            }
        }
    };
    return <div ref={host} style={{ height: '100%' }} onFocus={event => {
        const key = (event.target as HTMLElement).closest?.('[data-gg-focus]')?.getAttribute('data-gg-focus') ?? '';
        focused.current = key.startsWith('storage:game:') ? Number(key.slice('storage:game:'.length)) : null;
    }}>
        <StoragePageView view={view} art={artOf} hero={hero} onPick={index => setPicked(current => current === index ? current : index)} onRow={onRow}
            onBack={() => Navigation.NavigateBack()} />
    </div>;
}
