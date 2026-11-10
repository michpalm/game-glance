import { menuScale } from '../menuScale';
import { Focusable, type GamepadEvent } from '@decky/ui';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { LuArrowUpRight, LuBell } from 'react-icons/lu';
import { pickMenuAccent, resolveMenuAccent } from '../accent';
import { shownAccent } from '../../home/shownAccent';
import { installMouseMode } from '../../home/mouseMode';
import { legibleAccent } from '../../home/accent';
import { accentMemo } from '../../home/accentMemo';
import { takeSteamFocus } from '../../home/steamFocus';
import { type MenuEvent, type MenuState, type SectionId } from '../model';
import { createKeyboardSession } from '../keyboard/session';
import { findMenuFocus, focusPrefersBar, handleMenuButton, installOutsideMenuClick, keyboardHome, keyboardTakesCancel, radialOwnsButton, leaveSocialConversation, openSocialChat, rememberFocusKey, openFocusKey } from '../navigation';
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
import { PluginsSection } from './PluginsSection';
import { pluginStyles } from '../pluginStyles';
import { soundtrackStyles } from '../soundtrackStyles';
import { SoundtrackSection } from './SoundtrackSection';
import type { SoundtrackService } from '../steam/soundtrack';
import type { SocialService } from '../steam/social';
import type { NotificationReads } from '../notificationReads';
import { unreadCount as countUnread, type TrayRow } from '../notificationsList';
import type { NotificationActions } from '../steam/notificationActions';
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
    notificationReads?: NotificationReads;
    notificationActions?: NotificationActions;
    performance?: ReturnType<typeof createPerformance>;
    social?: SocialService;
    soundtrack?: SoundtrackService;
    panels?: Partial<Record<SectionId, ReactNode>>;
}
const NO_SUBSCRIBE = () => () => {};
const EMPTY_ROWS: TrayRow[] = [];
const NO_ROWS = () => EMPTY_ROWS;
const EMPTY_READS: ReadonlySet<string> = new Set();
const NO_READS = () => EMPTY_READS;
export function MenuShell({ state, preferences, dispatch, handoff, close, inputActive = () => true, unreadCount = 0, quickSettings, notificationBadge, notifications, notificationReads, notificationActions, performance, social, soundtrack, panels = {} }: MenuShellProps) {
    const root = useRef<HTMLDivElement>(null);
    const menuPreference = useSyncExternalStore(preferences.subscribe, preferences.get);
    const [error, setError] = useState('');
    const [cachedAccent, setCachedAccent] = useState<{ appId: number; color: string | undefined }>();
    const unviewed = useSyncExternalStore(notificationBadge?.subscribe ?? (() => () => {}), notificationBadge?.get ?? (() => unreadCount));
    const trayRows = useSyncExternalStore(notifications?.subscribe ?? NO_SUBSCRIBE, notifications?.get ?? NO_ROWS);
    const remembered = useSyncExternalStore(notificationReads?.subscribe ?? NO_SUBSCRIBE, notificationReads?.get ?? NO_READS);
    // The bell keeps a notification until it is read; Steam's unviewed count only when the tray cannot be read.
    const badgeCount = notifications ? countUnread(trayRows, remembered) : unviewed;
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
    const focusedSinceOpen = useRef(false);
    useLayoutEffect(() => {
        const element = root.current;
        if (!active) focusedSinceOpen.current = false;
        if (!element || !active || !inputActive()) return;
        const key = openFocusKey(state.section, state.focus[state.section]);
        const preferBar = focusPrefersBar(focusedSinceOpen.current, !!element.ownerDocument.activeElement?.closest('.gg-menu-bar'));
        focusedSinceOpen.current = true;
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
        const resize = () => element.style.setProperty('--gg-menu-scale', String(menuScale(view.innerWidth)));
        resize(); view.addEventListener('resize', resize);
        return () => view.removeEventListener('resize', resize);
    }, [active]);
    useLayoutEffect(() => {
        const element = root.current;
        if (!element || !active) return;
        return installOutsideMenuClick(element, close, inputActive);
    }, [active, close, inputActive]);
    const keyboard = useMemo(createKeyboardSession, []);
    // Only an open menu follows the chat: subscribing may start the social service.
    const enteredId = useSyncExternalStore(active && social ? social.subscribe : NO_SUBSCRIBE, () => active ? social?.get().enteredId ?? null : null);
    const keyboardFriend = keyboardHome(state, active, enteredId);
    useEffect(() => { keyboard.close(); }, [keyboard, keyboardFriend]);
    if (!active) return null;
    const onButton = (event: GamepadEvent, cancel = false) => {
        if (inputActive() && radialOwnsButton(event.detail, keyboard)) { event.preventDefault(); event.stopPropagation(); return; }
        if (event.detail.button === 2 && !cancel) return;
        if (keyboardTakesCancel(event.detail, cancel, keyboard)) { event.preventDefault(); event.stopPropagation(); return; }
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
    let content = showingNotifications && notifications ? <NotificationsPanel list={notifications} reads={notificationReads} actions={notificationActions} handoff={handoff} close={close}
        openChat={steamId => openSocialChat(social, dispatch, steamId)} social={social} failed={() => setError('Could not open Steam’s view. Use the menu button to return.')} /> : panels[state.section];
    if (content === undefined && state.section === 'in-game' && state.game) content = <InGamePanel game={state.game} handoff={enterNative} />;
    if (content === undefined && state.section === 'navigate') content = <NavigatePanel handoff={enterNative} />;
    if (content === undefined && state.section === 'quick-settings' && quickSettings) content = <QuickSettingsPanel controls={quickSettings.controls} />;
    if (content === undefined && state.section === 'performance' && performance) content = <PerformancePanel performance={performance} />;
    if (content === undefined && state.section === 'social' && social) content = <SocialPanel social={social} entered={state.stack[state.stack.length - 1] === 'social-chat'} keyboard={keyboard} keyboardMode={menuPreference.socialKeyboard} ownsInput={inputActive}
        enter={id => { if (state.stack[state.stack.length - 1] !== 'social-chat') dispatch({ type: 'push', viewId: 'social-chat' }); void social.enter(id); }}
        leave={() => { leaveSocialConversation(state, social, dispatch); }} handoff={enterNative} />;
    if (content === undefined && state.section === 'plugins') content = <PluginsSection state={state} dispatch={dispatch} handoff={enterNative} close={close} />;
    if (content === undefined && state.section === 'soundtrack' && soundtrack) content = <SoundtrackSection service={soundtrack} handoff={enterNative} />;
    if (state.section === 'more' && !showingNotifications) content = <MorePanel state={state} preferences={preferences} handoff={enterNative} dispatch={dispatch} />;
    if (content === undefined) {
        const tab = NATIVE_TABS[state.section];
        content = <div className="gg-menu-heading"><h2>{state.section === 'in-game' ? state.game?.name || 'Running game' : SECTION_LABELS[state.section]}</h2><MenuAction id={`native:${state.section}`} onAction={() => enterNative(tab ? { kind: 'qam', tab } : { kind: 'main-menu' })}><LuArrowUpRight aria-hidden="true" />Open in Steam</MenuAction></div>;
    }
    return <Focusable ref={root} className="gg-menu" style={{ '--gg-accent': accent, '--gg-accent-text': legibleAccent(accent) } as CSSProperties} flow-children="column" onButtonDown={event => onButton(event)} onCancelButton={event => onButton(event, true)} onFocusCapture={event => {
        const key = (event.target as HTMLElement).closest?.<HTMLElement>('[data-gg-focus]')?.dataset.ggFocus;
        if (rememberFocusKey(key)) dispatch({ type: 'focus', section: state.section, key });
    }}>
        <style>{menuStyles + pluginStyles + soundtrackStyles}</style>
        <GameStatusBar menuOverlay />
        <header><div className="gg-menu-caption-actions"><MenuAction id="notifications" className="gg-menu-notifications" frostRegion="notifications" ariaLabel={badgeCount > 0 ? `${badgeCount} unread notifications` : 'Notifications'} selected={showingNotifications} onAction={() => notifications ? dispatch(showingNotifications ? { type: 'back' } : { type: 'push', viewId: 'notifications' }) : enterNative({ kind: 'qam', tab: 'notifications' })}><span className="gg-menu-notification-count" aria-hidden="true">{badgeCount > 99 ? '99+' : badgeCount > 0 ? badgeCount : ''}</span><LuBell aria-hidden="true" /></MenuAction></div></header>
        <MenuBar state={state} dispatch={dispatch} />
        <Focusable className="gg-menu-panel" data-gg-frost-region="panel" flow-children="column" aria-label={SECTION_LABELS[state.section]}>{content}{error && <p className="gg-menu-error" role="alert">{error}</p>}</Focusable>
    </Focusable>;
}
