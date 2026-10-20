import { Focusable, type GamepadEvent } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { LuBell } from 'react-icons/lu';
import { resolveMenuAccent } from '../accent';
import { accentMemo } from '../../home/accentMemo';
import { takeSteamFocus } from '../../home/steamFocus';
import { type MenuEvent, type MenuState, type SectionId } from '../model';
import { findMenuFocus, handleMenuButton, installOutsideMenuClick } from '../navigation';
import type { createMenuPreferences } from '../preferences';
import type { NativeRequest, QamTab } from '../steam/runtime';
import { menuStyles } from '../styles';
import { GameStatusBar } from '../../components/GameStatusBar';
import { MenuAction } from './MenuAction';
import { MenuBar, SECTION_LABELS } from './MenuBar';
import { NavigatePanel } from './NavigatePanel';
import { QuickSettingsPanel } from './QuickSettingsPanel';
import { PerformancePanel } from './PerformancePanel';
import type { createPerformance } from '../steam/performance';
import type { createQuickSettings } from '../steam/quickSettings';
import type { createNotificationBadge } from '../steam/notifications';
import { MorePanel } from './MorePanel';
const NATIVE_TABS: Partial<Record<SectionId, QamTab>> = { 'quick-settings': 'quick-settings', performance: 'performance', social: 'friends', plugins: 'decky', help: 'help', soundtrack: 'soundtrack' };
export interface MenuShellProps {
    state: MenuState;
    preferences: ReturnType<typeof createMenuPreferences>;
    dispatch(event: MenuEvent): void;
    handoff(request: NativeRequest): Promise<void>;
    close(): void;
    inputActive?(): boolean;
    unreadCount?: number;
    quickSettings?: ReturnType<typeof createQuickSettings>;
    notificationBadge?: ReturnType<typeof createNotificationBadge>;
    performance?: ReturnType<typeof createPerformance>;
    panels?: Partial<Record<SectionId, ReactNode>>;
}
export function MenuShell({ state, preferences, dispatch, handoff, close, inputActive = () => true, unreadCount = 0, quickSettings, notificationBadge, performance, panels = {} }: MenuShellProps) {
    const root = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    const [cachedAccent, setCachedAccent] = useState<{ appId: number; color: string | undefined }>();
    const badgeCount = useSyncExternalStore(notificationBadge?.subscribe ?? (() => () => {}), notificationBadge?.get ?? (() => unreadCount));
    const active = state.phase === 'custom-open';
    const appId = state.game?.appId;
    useEffect(() => {
        if (!active || !appId) return;
        let alive = true;
        void resolveMenuAccent(appId).then(color => { if (alive) setCachedAccent({ appId, color }); });
        return () => { alive = false; };
    }, [active, appId]);
    const enterNative = (request: NativeRequest) => { void handoff(request).catch(() => setError('Could not open Steam’s view. Use the menu button to return.')); };
    useLayoutEffect(() => {
        const element = root.current;
        if (!element || !active || !inputActive()) return;
        const key = state.focus[state.section];
        const preferBar = !!element.ownerDocument.activeElement?.closest('.gg-menu-bar');
        const focus = () => {
            const target = findMenuFocus(element, key, preferBar);
            if (target) { target.focus({ preventScroll: true }); takeSteamFocus(target); }
        };
        focus();
        const view = element.ownerDocument.defaultView;
        const frame = view?.requestAnimationFrame(focus);
        return () => { if (frame !== undefined) view?.cancelAnimationFrame(frame); };
    }, [active, state.section, state.stack.length]);
    useLayoutEffect(() => {
        const element = root.current;
        const view = element?.ownerDocument.defaultView;
        if (!element || !view || !active) return;
        // Steam changes CSS viewport/DPR between Home and the in-game overlay.
        // Normalize against the approved 829px handheld viewport instead of switching layouts.
        const resize = () => element.style.setProperty('--gg-menu-scale', String(view.innerWidth * .65 / 829));
        resize(); view.addEventListener('resize', resize);
        return () => view.removeEventListener('resize', resize);
    }, [active]);
    useLayoutEffect(() => {
        const element = root.current;
        if (!element || !active) return;
        return installOutsideMenuClick(element, close, inputActive);
    }, [active, close, inputActive]);
    if (!active) return null;
    const onButton = (event: GamepadEvent, cancel = false) => {
        if (event.detail.button === 2 && !cancel) return;
        const next: MenuEvent[] = [];
        if (!handleMenuButton(event.detail, state, value => next.push(value), inputActive())) return;
        event.preventDefault(); event.stopPropagation();
        for (const value of next) {
            if (value.type === 'back' && !state.stack.length && (state.section === 'more' || state.section === 'in-game' || state.pins.includes(state.section))) close();
            else dispatch(value);
        }
    };
    const color = appId ? accentMemo.get(appId) ?? (cachedAccent?.appId === appId ? cachedAccent.color : undefined) : undefined;
    const accent = color && /^#[\da-f]{6}$/i.test(color) ? color : '#1a9fff';
    let content = panels[state.section];
    if (content === undefined && state.section === 'navigate') content = <NavigatePanel handoff={enterNative} />;
    if (content === undefined && state.section === 'quick-settings' && quickSettings) content = <QuickSettingsPanel controls={quickSettings.controls} />;
    if (content === undefined && state.section === 'performance' && performance) content = <PerformancePanel performance={performance} />;
    if (state.section === 'more') content = <MorePanel state={state} preferences={preferences} handoff={enterNative} dispatch={dispatch} />;
    if (content === undefined) {
        const tab = NATIVE_TABS[state.section];
        content = <><h2>{state.section === 'in-game' ? state.game?.name || 'Running game' : SECTION_LABELS[state.section]}</h2><MenuAction id={`native:${state.section}`} onAction={() => enterNative(tab ? { kind: 'qam', tab } : { kind: 'main-menu' })}>Open in Steam</MenuAction></>;
    }
    return <Focusable ref={root} className="gg-menu" style={{ '--gg-menu-accent': accent } as CSSProperties} flow-children="column" onButtonDown={event => onButton(event)} onCancelButton={event => onButton(event, true)} onFocusCapture={event => {
        const key = (event.target as HTMLElement).closest?.<HTMLElement>('[data-gg-focus]')?.dataset.ggFocus;
        if (key) dispatch({ type: 'focus', section: state.section, key });
    }}>
        <style>{menuStyles}</style>
        <GameStatusBar menuOverlay />
        <header><div className="gg-menu-caption-actions"><MenuAction id="notifications" className="gg-menu-notifications" onAction={() => enterNative({ kind: 'qam', tab: 'notifications' })}>{badgeCount > 0 && <span>{badgeCount}</span>}<LuBell aria-label="Notifications" /></MenuAction></div></header>
        <MenuBar state={state} dispatch={dispatch} />
        <Focusable className="gg-menu-panel" flow-children="column" aria-label={SECTION_LABELS[state.section]}>{content}{error && <p className="gg-menu-error" role="alert">{error}</p>}</Focusable>
    </Focusable>;
}
