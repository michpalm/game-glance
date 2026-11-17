import type { Stop } from './model';
import type { WifiBindings, WifiNetwork, WifiSnapshot } from './steam/wifi';

/** The Wi-Fi page's rows, top to bottom (spec 2026-11-13-console-settings-design, Part 1). */
export type WifiRow =
    | { kind: 'switch'; on: boolean }
    | { kind: 'note'; text: string }
    | { kind: 'heading'; text: 'Connected' | 'Other networks' }
    | { kind: 'network'; network: WifiNetwork; status: string; actions: WifiAction[] };
/** `details`: a connected or saved network opens its own page (spec Part 1, Michael's pick B 2026-11-15). */
export type WifiAction = 'join' | 'password' | 'details' | 'steam';

function other(network: WifiNetwork, failed: ReadonlyMap<string, string>): WifiRow {
    if (network.needsSteam) return { kind: 'network', network, status: 'Set up in Steam settings', actions: ['steam'] };
    // Our attempt ended with a reason: it wins over Steam still retrying, so the row is selectable again.
    if (network.state === 'connecting' && !failed.has(network.key)) return { kind: 'network', network, status: 'Connecting…', actions: [] };
    const actions: WifiAction[] = network.saved ? ['details'] : network.locked ? ['password'] : ['join'];
    return { kind: 'network', network, status: failed.get(network.key) ?? (network.saved ? 'Saved' : ''), actions };
}

export function wifiRows(snapshot: WifiSnapshot, failed: ReadonlyMap<string, string>): WifiRow[] {
    const rows: WifiRow[] = [{ kind: 'switch', on: snapshot.enabled }];
    if (!snapshot.enabled) return [...rows, { kind: 'note', text: 'Turn on Wi-Fi to see networks.' }];
    const { connected, others } = snapshot;
    if (!connected && !others.length) return [...rows, { kind: 'note', text: 'Looking for networks…' }];
    if (connected) rows.push({ kind: 'heading', text: 'Connected' },
        { kind: 'network', network: connected, status: 'Connected', actions: ['details'] });
    if (others.length) rows.push({ kind: 'heading', text: 'Other networks' }, ...others.map(n => other(n, failed)));
    return rows;
}

/** Where focus goes when the list changes under it: the same key, else the row now at its old place, else the last. */
export function nextFocusKey(before: string[], after: string[], focused: string): string | null {
    if (after.includes(focused)) return focused;
    if (!after.length) return null;
    const index = before.indexOf(focused);
    return after[Math.min(Math.max(index, 0), after.length - 1)];
}

/** After the list changed: the key to refocus when focus was lost (moved to the body or a removed node), else null. */
export function lostFocusKey({ lost, before, after, was }: { lost: boolean; before: string[]; after: string[]; was: string | null }): string | null {
    return lost && was ? nextFocusKey(before, after, was) : null;
}

/** B on the Wi-Fi page: cancels the password view; false lets the menu go back. */
export function wifiPageBack(asking: boolean, cancelAsking: () => void): boolean {
    if (asking) { cancelAsking(); return true; }
    return false;
}

export interface WifiPageDeps { wifi: WifiBindings; askPassword(network: WifiNetwork): Promise<string | null>; openSteamInternet(): void; openNetwork?(key: string): void }
const FAILED = "Couldn't connect.";
const FAILED_PASSWORD = "Couldn't connect. Check the password.";

/**
 * What the Wi-Fi page does, without React: it scans while started, joins or asks for a password on A, keeps the reason a
 * join failed until the next try or a connection; a connected or saved network opens its own page.
 * After stop nothing it started tells the page anything, so a join that resolves late sets no state.
 */
export function createWifiPage({ wifi, askPassword, openSteamInternet, openNetwork }: WifiPageDeps, changed: () => void) {
    let alive = false, snapshot = wifi.read(), joining = false;
    const failed = new Map<string, string>();
    const notify = () => { if (alive) changed(); };
    const refresh = () => {
        const wasOn = snapshot.enabled;
        snapshot = wifi.read();
        // Scanning follows the radio, whoever switched it (the page, Airplane mode, Steam).
        if (alive && wasOn !== snapshot.enabled) wifi.scan(snapshot.enabled);
        if (snapshot.connected) failed.delete(snapshot.connected.key);
    };
    async function join(network: WifiNetwork, withPassword: boolean) {
        if (joining) return;
        joining = true;
        try { await attempt(network, withPassword); } finally { joining = false; }
    }
    async function attempt(network: WifiNetwork, withPassword: boolean) {
        const password = withPassword ? await askPassword(network) : undefined;
        if (!alive || password === null) return;
        failed.delete(network.key); notify();
        const ok = await (password === undefined ? wifi.connect(network.key) : wifi.connect(network.key, password));
        if (!alive) return;
        if (ok) failed.delete(network.key); else failed.set(network.key, withPassword ? FAILED_PASSWORD : FAILED);
        refresh(); notify();
    }
    return {
        start(): Stop {
            alive = true; snapshot = wifi.read();
            const unsubscribe = wifi.subscribe(() => { refresh(); notify(); });
            if (snapshot.enabled) wifi.scan(true);
            return () => { alive = false; unsubscribe(); wifi.scan(false); };
        },
        rows: () => wifiRows(snapshot, failed),
        setEnabled(value: boolean) { wifi.setEnabled(value); if (!value) wifi.scan(false); },
        activate(row: WifiRow) {
            if (row.kind !== 'network') return;
            const { network, actions } = row;
            if (actions.includes('steam')) openSteamInternet();
            else if (actions.includes('details')) openNetwork?.(network.key);
            else if (actions.includes('join')) void join(network, false);
            else if (actions.includes('password')) void join(network, true);
        },
    };
}
export type WifiPageController = ReturnType<typeof createWifiPage>;
