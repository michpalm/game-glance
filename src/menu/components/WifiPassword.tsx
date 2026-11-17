import { Focusable } from '@decky/ui';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Stop } from '../model';
import type { KeyboardSession } from '../keyboard/session';
import type { WifiNetwork } from '../steam/wifi';
import { DraftText } from './DraftText';
import { MenuAction } from './MenuAction';
import { MenuKeyboard, type Layouts } from './MenuKeyboard';
import { RadialKeyboard } from './RadialKeyboard';
import { keyboardStyles } from '../keyboard/styles';

/**
 * A typed Wi-Fi password, held only here until the join is asked for, cancelled or the view goes away; then it is
 * forgotten. It is never logged, stored or put in a snapshot (spec 2026-11-13-console-settings-design, Part 1).
 */
export function createPasswordEntry(network: WifiNetwork, onDone: (password: string | null) => void) {
    let draft = '', shown = false, done = false, state = { draft, shown, canJoin: false };
    const listeners = new Set<Stop>();
    const publish = () => { state = { draft, shown, canJoin: !done && draft.length >= network.minPassword }; listeners.forEach(l => l()); };
    const finish = (password: string | null) => { if (done) return; done = true; draft = ''; publish(); onDone(password); };
    return {
        get: () => state,
        subscribe(listener: Stop): Stop { listeners.add(listener); return () => { listeners.delete(listener); }; },
        setDraft(text: string) { if (done) return; draft = text; publish(); },
        toggleShown() { shown = !shown; publish(); },
        join() { if (state.canJoin) finish(draft); },
        cancel() { finish(null); },
        dispose() { finish(null); },
    };
}

interface ViewProps { network: WifiNetwork; draft: string; shown: boolean; canJoin: boolean; text?(visible: string): ReactNode; keyboard?: ReactNode;
    onField(): void; onToggle(): void; onJoin(): void }

/** The password view inside the Wi-Fi page. Stateless. */
export function WifiPasswordView({ network, draft, shown, canJoin, text = visible => visible, keyboard, onField, onToggle, onJoin }: ViewProps) {
    // B is claimed by the Wi-Fi page at the menu's root (pageTakesCancel), after the keyboard's own claim.
    const visible = shown ? draft : '•'.repeat(draft.length);
    return <Focusable className="gg-menu-wifi-password" flow-children="column">
        <p className="gg-menu-wifi-password-title">Password for <strong>{network.name}</strong></p>
        {/* The keyboard's styles otherwise arrive only with the Social panel (as Home search, this view brings them). */}
        <style>{keyboardStyles}</style>
        <Focusable className="gg-menu-wifi-password-row" flow-children="row">
            <MenuAction id="wifi:password:field" className="gg-menu-wifi-password-field" ariaLabel="Password" onAction={onField}>
                {draft ? text(visible) : <span className="gg-menu-wifi-password-placeholder">Password</span>}
            </MenuAction>
            <MenuAction id="wifi:password:show" onAction={onToggle}>{shown ? 'Hide' : 'Show'}</MenuAction>
        </Focusable>
        <MenuAction id="wifi:password:join" disabled={!canJoin} onAction={onJoin}>Join</MenuAction>
        {keyboard}
    </Focusable>;
}

export function WifiPassword({ network, session, layouts, mode, ownsInput, onDone }: { network: WifiNetwork; session: KeyboardSession; layouts: Layouts | null;
    mode: 'compact' | 'radial'; ownsInput(): boolean; onDone(password: string | null): void }) {
    const done = useRef(onDone); done.current = onDone;
    const entry = useMemo(() => createPasswordEntry(network, password => { session.close(); done.current(password); }), [network.key, session]);
    useEffect(() => () => entry.dispose(), [entry]);
    const { draft, shown, canJoin } = useSyncExternalStore(entry.subscribe, entry.get);
    const host = useRef<HTMLDivElement | null>(null);
    const field = () => host.current?.querySelector<HTMLElement>('[data-gg-focus="wifi:password:field"]') ?? null;
    // The keyboard opens with the view, as the chat's field opens it.
    useEffect(() => { if (layouts) session.open(); }, [session, layouts]);
    const keyboardProps = { session, layouts: layouts!, draft, setDraft: entry.setDraft, canSend: canJoin, send: entry.join, field, completionLabel: 'Join' };
    // A radial keyboard that cannot start (no controller feed) falls back to compact for this opening, as in the chat.
    const [radialFailed, setRadialFailed] = useState(false);
    const keyboard = layouts ? mode === 'radial' && !radialFailed
        ? <RadialKeyboard {...keyboardProps} ownsInput={ownsInput} unavailable={() => setRadialFailed(true)} />
        : <MenuKeyboard {...keyboardProps} /> : null;
    return <div ref={host}>
        <WifiPasswordView network={network} draft={draft} shown={shown} canJoin={canJoin} keyboard={keyboard} text={visible => <DraftText text={visible} session={session} />}
            onField={() => { if (layouts) session.open(); }} onToggle={entry.toggleShown} onJoin={entry.join} />
    </div>;
}
