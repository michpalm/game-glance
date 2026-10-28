import { Focusable, type GamepadEvent } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { LuBell } from 'react-icons/lu';
import { pickMenuAccent, resolveMenuAccent } from '../accent';
import { shownAccent } from '../../home/shownAccent';
import { installMouseMode } from '../../home/mouseMode';
import { legibleAccent } from '../../home/accent';
import { accentMemo } from '../../home/accentMemo';
import { takeSteamFocus } from '../../home/steamFocus';
import { type MenuEvent, type MenuState, type SectionId } from '../model';
import { findMenuFocus, handleMenuButton, installOutsideMenuClick, leaveSocialConversation } from '../navigation';
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
import type { createNotificationBadge, createNotificationList } from '../steam/notifications';
import { MorePanel } from './MorePanel';
import { SocialPanel } from './SocialPanel';
import { InGamePanel } from './InGamePanel';
import { NotificationsPanel } from './NotificationsPanel';
import type { SocialService } from '../steam/social';
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
    notifications?: ReturnType<typeof createNotificationList>;
    performance?: ReturnType<typeof createPerformance>;
    social?: SocialService;
    panels?: Partial<Record<SectionId, ReactNode>>;
}
export function MenuShell({ state, preferences, dispatch, handoff, close, inputActive = () => true, unreadCount = 0, quickSettings, notificationBadge, notifications, performance, social, panels = {} }: MenuShellProps) {
    const root = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    const [cachedAccent, setCachedAccent] = useState<{ appId: number; color: string | undefined }>();
    const badgeCount = useSyncExternalStore(notificationBadge?.subscribe ?? (() => () => {}), notificationBadge?.get ?? (() => unreadCount));
    const active = state.phase === 'custom-open';
    const appId = state.game?.appId;
    const homeAccent = useSyncExternalStore(shownAccent.subscribe, shownAccent.get);
    useLayoutEffect(() => {
        const document = root.current?.ownerDocument;
        return active && document ? installMouseMode(document) : undefined;
    }, [active]);
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
            if (value.type === 'back' && leaveSocialConversation(state, social, dispatch)) continue;
            if (value.type === 'back' && !state.stack.length && (state.section === 'more' || state.section === 'in-game' || state.pins.includes(state.section))) close();
            else dispatch(value);
        }
    };
    const color = appId ? accentMemo.get(appId) ?? (cachedAccent?.appId === appId ? cachedAccent.color : undefined) : undefined;
    const owner = (globalThis as unknown as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { BIsOverlayPath?(): boolean } } } }).SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
    const accent = pickMenuAccent(color, homeAccent, owner?.BIsOverlayPath?.() === true);
    const showingNotifications = state.stack[state.stack.length - 1] === 'notifications';
    let content = showingNotifications && notifications ? <NotificationsPanel list={notifications} handoff={enterNative} /> : panels[state.section];
    if (content === undefined && state.section === 'in-game' && state.game) content = <InGamePanel game={state.game} handoff={enterNative} />;
    if (content === undefined && state.section === 'navigate') content = <NavigatePanel handoff={enterNative} />;
    if (content === undefined && state.section === 'quick-settings' && quickSettings) content = <QuickSettingsPanel controls={quickSettings.controls} />;
    if (content === undefined && state.section === 'performance' && performance) content = <PerformancePanel performance={performance} />;
    if (content === undefined && state.section === 'social' && social) content = <SocialPanel social={social} entered={state.stack[state.stack.length - 1] === 'social-chat'}
        enter={id => { if (state.stack[state.stack.length - 1] !== 'social-chat') dispatch({ type: 'push', viewId: 'social-chat' }); void social.enter(id); }}
        leave={() => { leaveSocialConversation(state, social, dispatch); }} handoff={enterNative} />;
    if (state.section === 'more' && !showingNotifications) content = <MorePanel state={state} preferences={preferences} handoff={enterNative} dispatch={dispatch} />;
    if (content === undefined) {
        const tab = NATIVE_TABS[state.section];
        content = <><h2>{state.section === 'in-game' ? state.game?.name || 'Running game' : SECTION_LABELS[state.section]}</h2><MenuAction id={`native:${state.section}`} onAction={() => enterNative(tab ? { kind: 'qam', tab } : { kind: 'main-menu' })}>Open in Steam</MenuAction></>;
    }
    return <Focusable ref={root} className="gg-menu" style={{ '--gg-accent': accent, '--gg-accent-text': legibleAccent(accent) } as CSSProperties} flow-children="column" onButtonDown={event => onButton(event)} onCancelButton={event => onButton(event, true)} onFocusCapture={event => {
        const key = (event.target as HTMLElement).closest?.<HTMLElement>('[data-gg-focus]')?.dataset.ggFocus;
        if (key) dispatch({ type: 'focus', section: state.section, key });
    }}>
        <style>{menuStyles}</style>
        <GameStatusBar menuOverlay />
        <header><div className="gg-menu-caption-actions"><MenuAction id="notifications" className="gg-menu-notifications" frostRegion="notifications" onAction={() => notifications ? dispatch(showingNotifications ? { type: 'back' } : { type: 'push', viewId: 'notifications' }) : enterNative({ kind: 'qam', tab: 'notifications' })}>{badgeCount > 0 && <span>{badgeCount}</span>}<LuBell aria-label="Notifications" /></MenuAction></div></header>
        <MenuBar state={state} dispatch={dispatch} />
        <Focusable className="gg-menu-panel" data-gg-frost-region="panel" flow-children="column" aria-label={SECTION_LABELS[state.section]}>{content}{error && <p className="gg-menu-error" role="alert">{error}</p>}</Focusable>
    </Focusable>;
}
