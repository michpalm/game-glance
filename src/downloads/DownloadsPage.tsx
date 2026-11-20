import { ConfirmModal, DialogButton, Focusable, Navigation, showModal } from '@decky/ui';
import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { browserStores, heroUrls, landscapeUrls, logoUrls } from '../home/artwork';
import { takeSteamFocus } from '../home/steamFocus';
import { downloadsView, graphPath, graphScale, type CompletedRow, type DownloadsInput, type DownloadsView, type QueueRow } from './downloadsModel';
import { downloadsStyles } from './downloadsStyles';
import { createDownloadsBindings, type DownloadsBindings } from './steamDownloads';

/** The graph's drawing box (mock-up A2): the Network card's inner width by its graph height, in the page's units. */
const GRAPH_W = 468, GRAPH_H = 122;

interface ViewProps {
    view: DownloadsView;
    art(appId: number): string | null;
    /** The current card's art (mock-up B): Steam's hero art, then the game's logo on it; each a list tried in order. */
    hero(appId: number): string[];
    logo(appId: number): string[];
    onCurrent(): void;
    onQueue(row: QueueRow, button: 'a' | 'x' | 'y'): void;
    onCompleted(row: CompletedRow, button: 'a' | 'y'): void;
    onBack(): void;
    onOptions(): void;
}
type AnyButton = ComponentType<Record<string, unknown>>;

const Bar = ({ ratio, className = '' }: { ratio: number; className?: string }) =>
    <span className={`gg-dl-bar ${className}`.trim()}><span className="gg-dl-bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} /></span>;
/** The first of `urls` that loads; `fallback` once none does. The caller keys it by game, so a new game starts over. */
export function FallbackImg({ urls, className, alt = '', fallback = null }: { urls: string[]; className: string; alt?: string; fallback?: ReactNode }) {
    const [at, setAt] = useState(0);
    const src = urls[at];
    if (!src) return <>{fallback}</>;
    return <img className={className} src={src} alt={alt} onError={() => setAt(at + 1)} />;
}

const Art = ({ src }: { src: string | null }) => src ? <img className="gg-dl-art" src={src} alt="" /> : <span className="gg-dl-art" />;

function QueueRowView({ row, art, onQueue }: { row: QueueRow; art: string | null; onQueue: ViewProps['onQueue'] }) {
    const Button = DialogButton as unknown as AnyButton;
    // One control per game, as Storage: X and Y ride on it, so Steam's footer shows their hints.
    const buttons: Record<string, unknown> = { onClick: () => onQueue(row, 'a'), onOKActionDescription: 'Download now',
        onOptionsButton: () => onQueue(row, 'y'), onOptionsActionDescription: 'Remove' };
    if (row.canMoveUp) Object.assign(buttons, { onSecondaryButton: () => onQueue(row, 'x'), onSecondaryActionDescription: 'Move up' });
    return <Button className="gg-dl-row" data-gg-focus={`downloads:queue:${row.appId}`} {...buttons}>
        <Art src={art} />
        <span className="gg-dl-text">
            <span className="gg-dl-name">{row.name}</span>
            {row.line && <span className="gg-dl-sub">{row.line}</span>}
            <Bar ratio={row.ratio} className="gg-dl-row-bar" />
        </span>
        <span className="gg-dl-end">
            <span className="gg-dl-percent">{`${row.percent}%`}</span>
            {row.tag && <span className={`gg-dl-tag${row.tag === 'PAUSED' ? ' gg-dl-tag-paused' : ''}`}>{row.tag}</span>}
        </span>
    </Button>;
}

function CompletedRowView({ row, art, onCompleted }: { row: CompletedRow; art: string | null; onCompleted: ViewProps['onCompleted'] }) {
    const Button = DialogButton as unknown as AnyButton;
    return <Button className="gg-dl-done" data-gg-focus={`downloads:done:${row.appId}`} onClick={() => onCompleted(row, 'a')} onOKActionDescription="Game page"
        onOptionsButton={() => onCompleted(row, 'y')} onOptionsActionDescription="Remove">
        <Art src={art} />
        <span className="gg-dl-text">
            <span className="gg-dl-name">{row.name}</span>
            {row.line && <span className="gg-dl-sub">{row.line}</span>}
        </span>
        <span className="gg-dl-done-mark">Done</span>
    </Button>;
}

/** Stateless: mock-up A2 with Completed. */
export function DownloadsPageView({ view, art, hero, logo, onCurrent, onQueue, onCompleted, onBack, onOptions }: ViewProps) {
    const Button = DialogButton as unknown as AnyButton;
    const { current, network } = view;
    const heroArt = current.appId ? hero(current.appId) : [];
    const name = <span className="gg-dl-card-name">{current.name}</span>;
    const cardBody = <>
        {heroArt.length > 0
            ? <span className="gg-dl-card-hero" key={current.appId}>
                <FallbackImg className="gg-dl-card-hero-img" urls={heroArt} />
                <FallbackImg className="gg-dl-card-logo" urls={logo(current.appId!)} alt={current.name} fallback={name} />
            </span>
            : name}
        {current.mode !== 'idle' && <>
            <span className="gg-dl-big"><strong>{current.percent}</strong><span>{current.mode === 'paused' ? '% · Paused' : '% installed'}</span></span>
            {current.line && <span className="gg-dl-line">{current.line}</span>}
            <span className="gg-dl-bars">
                <span>DOWNLOAD</span><Bar ratio={current.download} />
                <span>INSTALL</span><Bar ratio={current.install} className="gg-dl-bar-install" />
            </span>
        </>}
    </>;
    // One scale for network, disk and Steam's peak, so the lines compare.
    const top = graphScale(network);
    // Behind the page, as Storage: the game downloading now, else the newest finished one.
    const backdropId = current.appId ?? view.completed[0]?.appId ?? null;
    const backdrop = backdropId ? hero(backdropId)[0] : undefined;
    const graph = graphPath(network.samples, GRAPH_W, GRAPH_H, top), disk = graphPath(network.diskSamples, GRAPH_W, GRAPH_H, top);
    const peakY = network.peakBytes > 0 && top > 0 ? GRAPH_H - network.peakBytes / top * GRAPH_H : null;
    return <Focusable className="gg-dl" onCancelButton={onBack} onCancelActionDescription="Back" onMenuButton={() => onOptions()} onMenuActionDescription="Options">
        <style>{downloadsStyles}</style>
        {backdrop && <div className="gg-dl-hero" style={{ backgroundImage: `url("${backdrop}")` }} />}
        <div className="gg-dl-shade" />
        <div className="gg-dl-page">
            <h1 className="gg-dl-title">Downloads</h1>
            <Focusable className="gg-dl-columns" flow-children="row">
                <Focusable className="gg-dl-side" flow-children="column">
                    {current.action
                        ? <Button className="gg-dl-card" data-gg-focus="downloads:current" onClick={onCurrent} onOKActionDescription={current.action === 'pause' ? 'Pause' : 'Resume'}>{cardBody}</Button>
                        : <div className="gg-dl-card gg-dl-network">{cardBody}</div>}
                    <div className="gg-dl-network">
                        <span className="gg-dl-net-figures">
                            <span><h3>Network</h3><span className="gg-dl-big"><strong>{network.mbps}</strong><span>Mbps</span></span></span>
                            <span className="gg-dl-net-side">
                                <span><i className="gg-dl-key gg-dl-key-peak" />{network.peak}</span>
                                <span><i className="gg-dl-key gg-dl-key-disk" />{network.disk}</span>
                            </span>
                        </span>
                        {graph.line && <svg className="gg-dl-graph" viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} preserveAspectRatio="none" aria-hidden="true">
                            <path className="gg-dl-graph-area" d={graph.area} />
                            {disk.line && <path className="gg-dl-graph-disk" d={disk.line} />}
                            <path className="gg-dl-graph-line" d={graph.line} />
                            {peakY !== null && <line className="gg-dl-graph-peak" x1={0} x2={GRAPH_W} y1={peakY} y2={peakY} />}
                        </svg>}
                    </div>
                </Focusable>
                <div className="gg-dl-games">
                    {view.queue.length > 0 && <p className="gg-dl-eyebrow">{`UP NEXT · ${view.queue.length}`}</p>}
                    <Focusable className="gg-dl-list" flow-children="column">
                        {view.queue.map(row => <QueueRowView key={row.appId} row={row} art={art(row.appId)} onQueue={onQueue} />)}
                        {view.completed.length > 0 && <p className={`gg-dl-eyebrow${view.queue.length ? ' gg-dl-eyebrow-done' : ''}`}>COMPLETED</p>}
                        {view.completed.map(row => <CompletedRowView key={row.appId} row={row} art={art(row.appId)} onCompleted={onCompleted} />)}
                        {view.queue.length === 0 && view.completed.length === 0 && <p className="gg-dl-empty">No downloads queued.</p>}
                    </Focusable>
                </div>
            </Focusable>
        </div>
    </Focusable>;
}

/** Steam's overview arrives about once a second: the page re-reads the store at that pace while it is open. */
const TICK_MS = 1000;
const EMPTY: DownloadsInput = { overview: null, queued: [], completed: [], history: [] };

let shared: DownloadsBindings | null = null;
const steamGlobal = (name: string): unknown => (globalThis as Record<string, unknown>)[name];
const sharedBindings = () => shared ??= createDownloadsBindings(steamGlobal('downloadsStore'), steamGlobal('SteamClient'));

function nameOf(appId: number): string {
    try {
        const name = (steamGlobal('appStore') as { GetAppOverviewByAppID?(id: number): { display_name?: unknown } | null } | undefined)?.GetAppOverviewByAppID?.(appId)?.display_name;
        return typeof name === 'string' && name ? name : `App ${appId}`;
    } catch {
        return `App ${appId}`;
    }
}
const artOf = (appId: number) => { try { return landscapeUrls(appId, browserStores)[0] ?? null; } catch { return null; } };
const heroOf = (appId: number) => { try { return heroUrls(appId, browserStores); } catch { return []; } };
const logoOf = (appId: number) => { try { return logoUrls(appId, browserStores); } catch { return []; } };
const focusKeys = (view: DownloadsView) => [...(view.current.action ? ['downloads:current'] : []),
    ...view.queue.map(r => `downloads:queue:${r.appId}`), ...view.completed.map(r => `downloads:done:${r.appId}`)];

function focusKey(root: ParentNode | null, key: string | null): boolean {
    const el = key ? root?.querySelector<HTMLElement>(`[data-gg-focus="${key}"]`) : null;
    if (!el) return false;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
    return true;
}

/** Game Glance's Downloads, live from Steam's download store. */
export function DownloadsPage({ bindings }: { bindings: DownloadsBindings }) {
    const [input, setInput] = useState<DownloadsInput | null>(() => bindings.read());
    const refresh = () => setInput(bindings.read());
    useEffect(() => {
        const timer = setInterval(refresh, TICK_MS);
        return () => clearInterval(timer);
    }, [bindings]);
    const view = useMemo(() => downloadsView(input ?? EMPTY, nameOf, Date.now()), [input]);
    const host = useRef<HTMLDivElement | null>(null);

    // First focus: the current download when it takes A, else the first row.
    const started = useRef(false);
    useLayoutEffect(() => {
        if (!started.current) started.current = focusKey(host.current, focusKeys(view)[0] ?? null);
    });
    // A row left under the cursor (removed, started): when focus was lost, the row now in its place (as Storage).
    const keys = useRef<string[]>([]), focused = useRef<string | null>(null);
    useLayoutEffect(() => {
        const before = keys.current, after = focusKeys(view);
        keys.current = after;
        const doc = host.current?.ownerDocument, active = doc?.activeElement;
        const lost = !active || active === doc?.body || !active.isConnected;
        if (!lost || before.join() === after.join() || after.length === 0) return;
        const at = focused.current ? before.indexOf(focused.current) : -1;
        focusKey(host.current, after[Math.min(Math.max(at, 0), after.length - 1)]);
    });

    const act = (done: boolean) => { if (done) refresh(); };
    const ask = (row: { appId: number; name: string }, onOK: () => void) => {
        const props = { strTitle: 'Remove from downloads', strDescription: `Remove ${row.name} from the download list?`, strOKButtonText: 'Remove', strCancelButtonText: 'Cancel', onOK };
        showModal(<ConfirmModal {...(props as object)} />, host.current?.ownerDocument?.defaultView ?? undefined);
    };
    const onCurrent = () => {
        const { action, appId } = view.current;
        if (action === 'pause') act(bindings.pauseAll());
        else if (action === 'resume' && appId) act(bindings.resume(appId));
    };
    const onQueue = (row: QueueRow, button: 'a' | 'x' | 'y') => {
        if (button === 'a') act(bindings.downloadNow(row.appId));
        else if (button === 'x') act(bindings.moveUp(row.appId, row.queueIndex));
        else ask(row, () => act(bindings.remove(row.appId)));
    };
    const onCompleted = (row: CompletedRow, button: 'a' | 'y') => {
        if (button === 'a') Navigation.Navigate(`/library/app/${row.appId}`);
        else act(bindings.remove(row.appId));
    };
    return <div ref={host} style={{ height: '100%' }} onFocus={event => {
        focused.current = (event.target as HTMLElement).closest?.('[data-gg-focus]')?.getAttribute('data-gg-focus') ?? null;
    }}>
        <DownloadsPageView view={view} art={artOf} hero={heroOf} logo={logoOf} onCurrent={onCurrent} onQueue={onQueue} onCompleted={onCompleted}
            onBack={() => Navigation.NavigateBack()} onOptions={() => Navigation.Navigate('/settings/downloads')} />
    </div>;
}

/** Steam's Downloads route renders this: Game Glance's page, or Steam's own when its download store cannot be read. */
export function DownloadsGate({ native, bindings = sharedBindings() }: { native: ReactNode; bindings?: DownloadsBindings }): ReactNode {
    if (!bindings.available() || bindings.read() === null) return native;
    return createElement(DownloadsPage, { bindings });
}
