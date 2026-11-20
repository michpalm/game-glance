import { Focusable, ToggleField } from '@decky/ui';
import { LuCheck, LuChevronRight, LuLock, LuWifi } from 'react-icons/lu';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { takeSteamFocus } from '../../home/steamFocus';
import type { WifiBindings, WifiNetwork } from '../steam/wifi';
import { createWifiPage, lostFocusKey, wifiPageBack, type WifiRow } from '../wifiPage';
import { MenuAction } from './MenuAction';
import { Crumb } from './SettingRows';
import { focusTarget } from './wifiFocus';
import { WifiPassword } from './WifiPassword';
import { readSteamLayouts } from './MenuKeyboard';
import type { KeyboardSession } from '../keyboard/session';

interface ViewProps { password?: ReactNode; rows: WifiRow[]; onToggle(value: boolean): void; onActivate(row: WifiRow): void }

const Bars = ({ strength }: { strength: number }) => <span className="gg-menu-wifi-bars" aria-label={`Signal ${strength} of 4`}>
    {[1, 2, 3, 4].map(level => <span key={level} data-lit={level <= strength ? '' : undefined} />)}
</span>;

function networkRow(row: Extract<WifiRow, { kind: 'network' }>, onActivate: ViewProps['onActivate']) {
    const { network, status } = row;
    return <div key={network.key} className={`gg-menu-wifi-row${network.needsSteam ? ' gg-menu-row-dim' : ''}`} data-gg-wifi={network.key}>
        <MenuAction id={`wifi:${network.key}`} className="gg-menu-wifi-network" busy={network.state === 'connecting'} onAction={() => onActivate(row)}>
            <span className="gg-menu-wifi-mark">{network.state === 'connected' && <LuCheck aria-hidden="true" />}</span>
            <span className="gg-menu-wifi-text"><span className="gg-menu-wifi-name">{network.name}</span>{status && <span className="gg-menu-wifi-status">{status}</span>}</span>
            {network.locked && <LuLock className="gg-menu-wifi-lock" aria-label="Needs a password" />}
            <Bars strength={network.strength} />
            {row.actions.includes('details') && <LuChevronRight className="gg-menu-wifi-chevron" aria-hidden="true" />}
        </MenuAction>
    </div>;
}

/** Quick settings › Wi-Fi (spec 2026-11-13-console-settings-design, Part 1). Stateless. */
export function WifiPageView({ password, rows, onToggle, onActivate }: ViewProps) {
    return <>
        <Crumb parent="Quick settings" title="Wi-Fi" focusables="button, .Focusable" />
        {password ?? <Focusable className="gg-menu-wifi" flow-children="column">
            {rows.map(row => {
                switch (row.kind) {
                    case 'switch': return <div key="switch" className="gg-menu-setting gg-menu-setting-toggle" data-gg-focus="wifi:switch">
                        <ToggleField highlightOnFocus={false} label={<span className="gg-menu-setting-label"><LuWifi aria-hidden="true" /><span>Wi-Fi</span></span>} checked={row.on} onChange={onToggle} />
                    </div>;
                    case 'note': return <p key="note" className="gg-menu-wifi-note">{row.text}</p>;
                    case 'heading': return <h3 key={row.text} className="gg-menu-wifi-heading">{row.text}</h3>;
                    case 'network': return networkRow(row, onActivate);
                }
            })}
        </Focusable>}
    </>;
}

const keyOf = (row: WifiRow) => row.kind === 'network' ? `wifi:${row.network.key}` : row.kind === 'switch' ? 'wifi:switch' : null;
function focusKey(root: ParentNode | null | undefined, key: string | null) {
    const el = focusTarget(key ? root?.querySelector<HTMLElement>(`[data-gg-focus="${CSS.escape(key)}"]`) : null);
    if (!el) return;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
}

export interface WifiKeyboard { session: KeyboardSession; mode: 'compact' | 'radial'; ownsInput(): boolean }
interface Asking { network: WifiNetwork; answer(password: string | null): void }
export function WifiPage({ wifi, openSteamInternet, openNetwork, keyboard, claimBack }: { wifi: WifiBindings; openSteamInternet(): void; openNetwork(key: string): void; keyboard?: WifiKeyboard;
    /** Hands the menu root this page's B; returns the release. */ claimBack?(claim: () => boolean): () => void }) {
    const [, setVersion] = useState(0);
    // A network that needs a password shows the password view in place of the list; the page (and its scan) stays.
    const [asking, setAsking] = useState<Asking | null>(null);
    const askPassword = (network: WifiNetwork) => keyboard ? new Promise<string | null>(resolve => setAsking({ network, answer: resolve })) : Promise.resolve(null);
    // The shell hands new callbacks each render; the page (and its scan) lives as long as the store does.
    const latest = useRef({ openSteamInternet, askPassword, openNetwork });
    latest.current = { openSteamInternet, askPassword, openNetwork };
    const page = useMemo(() => createWifiPage({ wifi, openSteamInternet: () => latest.current.openSteamInternet(), askPassword: network => latest.current.askPassword(network), openNetwork: key => latest.current.openNetwork(key) },
        () => setVersion(v => v + 1)), [wifi]);
    useEffect(() => page.start(), [page]);
    const rows = page.rows();
    const host = useRef<HTMLDivElement | null>(null);
    const focused = useRef<string | null>(null), keys = useRef<string[]>([]);
    // The list changes under the cursor while scanning: stay on the same network, or the row now in its place.
    useLayoutEffect(() => {
        const after = rows.map(keyOf).filter((k): k is string => k !== null);
        const before = keys.current; keys.current = after;
        // Lost means on the body or a removed node, never somewhere the player moved it (the tab bar).
        const active = document.activeElement;
        const lost = !active || active === document.body || !active.isConnected;
        focusKey(host.current, lostFocusKey({ lost, before, after, was: focused.current }));
    });
    const asked = useRef<string | null>(null);
    useLayoutEffect(() => {
        if (asking) focusKey(host.current, 'wifi:password:field');
        else if (asked.current) focusKey(host.current, `wifi:${asked.current}`);
        asked.current = asking?.network.key ?? null;
    }, [asking]);
    const askingRef = useRef(asking); askingRef.current = asking;
    useEffect(() => claimBack?.(() => wifiPageBack(!!askingRef.current, () => {
        const current = askingRef.current;
        if (!current) return;
        current.answer(null);
        setAsking(value => value === current ? null : value);
    })), [claimBack, page]);
    const layouts = useMemo(() => { if (!asking) return null; try { const read = readSteamLayouts(); return read.layouts[read.current]?.ime ? null : read; } catch { return null; } }, [asking]);
    const password = asking && keyboard ? <WifiPassword network={asking.network} session={keyboard.session} layouts={layouts} mode={keyboard.mode} ownsInput={keyboard.ownsInput}
        onDone={value => { asking.answer(value); setAsking(current => current === asking ? null : current); }} /> : undefined;
    return <div ref={host} className="gg-menu-wifi-page" onFocus={event => {
        const key = (event.target as HTMLElement).closest?.('[data-gg-focus]')?.getAttribute('data-gg-focus');
        if (key && !key.endsWith(':disconnect') && !key.endsWith(':forget')) focused.current = key;
    }}>
        <WifiPageView password={password} rows={rows} onToggle={value => page.setEnabled(value)} onActivate={row => page.activate(row)} />
    </div>;
}
