import { Focusable } from '@decky/ui';
import { LuTrash2, LuUnplug, LuWifi } from 'react-icons/lu';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { WifiBindings, WifiNetwork, WifiSnapshot } from '../steam/wifi';
import { MenuAction } from './MenuAction';
import { Crumb } from './SettingRows';

/**
 * A connected or saved network's own page, pushed on the menu stack (Michael's pick B, 2026-11-15): what it is, then
 * Disconnect or Join, and Forget. A page of its own takes focus the way every pushed menu view does, and B returns to
 * the network's row on the Wi-Fi page.
 */
export type NetworkAction = 'join' | 'disconnect' | 'forget';
export interface NetworkPage { network: WifiNetwork | null; facts: [string, string][]; actions: NetworkAction[]; note?: string }
const SIGNAL = ['None', 'Weak', 'Fair', 'Good', 'Strong'];

export function networkPage(snapshot: WifiSnapshot, key: string, failed: string | null): NetworkPage {
    const network = snapshot.connected?.key === key ? snapshot.connected : snapshot.others.find(n => n.key === key) ?? null;
    if (!network) return { network: null, facts: [], actions: [], note: 'This network is out of range.' };
    const connected = network.state === 'connected', connecting = network.state === 'connecting' && !failed;
    const status = connected ? 'Connected' : connecting ? 'Connecting…' : failed ?? (network.saved ? 'Saved' : 'Not saved');
    const actions: NetworkAction[] = connected ? ['disconnect'] : connecting ? [] : ['join'];
    if (network.saved) actions.push('forget');
    return { network, facts: [['Status', status], ['Signal', SIGNAL[network.strength]], ['Security', network.security]], actions };
}

const LABELS: Record<NetworkAction, string> = { join: 'Join', disconnect: 'Disconnect', forget: 'Forget this network' };
const ICONS = { join: LuWifi, disconnect: LuUnplug, forget: LuTrash2 };

/** Stateless. */
export function WifiNetworkView({ name, page, busy, onAction }: { name: string; page: NetworkPage; busy: boolean; onAction(action: NetworkAction): void }) {
    return <>
        <Crumb parent="Wi-Fi" title={name} />
        {page.note && <p className="gg-menu-wifi-note">{page.note}</p>}
        {page.facts.length > 0 && <div className="gg-menu-wifi-facts">
            {page.facts.map(([label, value]) => <div key={label}><small>{label}</small><span>{value}</span></div>)}
        </div>}
        <Focusable className="gg-menu-wifi" flow-children="column">
            {page.actions.map(action => {
                const Icon = ICONS[action];
                return <MenuAction key={action} id={`wifi-network:${action}`} className="gg-menu-wifi-step" busy={busy} onAction={() => { if (!busy) onAction(action); }}>
                    <Icon aria-hidden="true" /><span>{LABELS[action]}</span>
                </MenuAction>;
            })}
        </Focusable>
    </>;
}

export function WifiNetworkPage({ wifi, networkKey, leave }: { wifi: WifiBindings; networkKey: string; leave(): void }) {
    const snapshot = useSyncExternalStore(wifi.subscribe, wifi.read);
    const [failed, setFailed] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    // The name stays when the network leaves the list, so the crumb still says which one this was.
    const name = useRef('');
    const page = networkPage(snapshot, networkKey, failed);
    if (page.network) name.current = page.network.name;
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const run = async (action: NetworkAction) => {
        setBusy(true); setFailed(null);
        const ok = action === 'join' ? await wifi.connect(networkKey) : action === 'disconnect' ? await wifi.disconnect(networkKey) : await wifi.forget(networkKey);
        if (!alive.current) return;
        setBusy(false);
        if (!ok) setFailed(action === 'join' ? "Couldn't connect." : action === 'forget' ? "Couldn't forget this network." : "Couldn't disconnect.");
        // A forgotten network has no page left to show: back to the list.
        else if (action === 'forget') leave();
    };
    return <WifiNetworkView name={name.current} page={page} busy={busy} onAction={action => { void run(action); }} />;
}
