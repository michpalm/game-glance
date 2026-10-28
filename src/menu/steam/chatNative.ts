import { findModuleExport } from '@decky/ui';
import { mapFriends, readFriends, type RawFriend } from '../../home/friends';
import type { Stop } from '../model';
import type { ChatMessage, ChatSession, SocialBindings, SocialContext } from './social';
import { ChatDeliveryError } from './social';

interface NativeMessage {
    strMessage?: string;
    rtTimestamp?: number;
    unAccountID?: number;
    eErrorSending?: number;
    eDeleteState?: number;
    BIsLocalEcho?(): boolean;
    BHasServerAcknowledged?(): boolean;
    BIsServerMsg?(): boolean;
}
interface NativeChat {
    chat_messages: NativeMessage[];
    m_bChatLogsLoaded?: boolean;
    m_bReceivedChatLogs?: boolean;
    m_nLoadingHistoryInProgressCount?: number;
    AddChatView(view: object): void;
    RemoveChatView(view: object): void;
    LoadChatLogs(): Promise<unknown>;
    InternalLoadChatLogs?(sinceLatest?: boolean): Promise<unknown>;
    LoadMoreHistory(): Promise<unknown>;
    IsMoreHistoryAvailable(): boolean;
    SendChatMessage(text: string): Promise<unknown>;
    RetryFailedMessage(message: NativeMessage): unknown;
    OnActivate(): void;
    OnDeactivate(): void;
}
interface FriendPersona { is_blocked?: boolean; is_friend?: boolean }
interface BrowserContext { m_nBrowserID?: number; m_unPID?: number }
interface FriendsApp {
    m_bReadyToRender?: boolean;
    m_CMInterface?: { m_bConnected?: boolean; m_bLoggedOn?: boolean; logged_on?: boolean };
    FriendStore?: { self?: { accountid?: number }; m_self?: { m_unAccountID?: number }; GetFriendIfCached?(id: number): FriendPersona | undefined };
    ChatStore?: { GetFriendChat(id: number, create: boolean): NativeChat | null; TextFilterStore?: { FilterText(sender: number, text: string): string } };
    GetDefaultBrowserContext?(): BrowserContext;
}
export interface NativeChatHelpers {
    GetVisibilityState(this: unknown): number;
    ConvertMessageToBBCode(text: string): string;
}
export interface NativeSocialDependencies {
    app(): FriendsApp | undefined;
    friends(): RawFriend[];
    allowed(): boolean;
    helpers(): NativeChatHelpers | undefined;
}

/** Individual Steam IDs fit in BigInt; their account IDs fit exactly in an unsigned 32-bit number. */
export function steamAccountId(steamId: string): number | null {
    if (!/^\d{17}$/.test(steamId)) return null;
    const account = BigInt(steamId) - 76561197960265728n;
    return account > 0n && account <= 4294967295n ? Number(account) : null;
}
const unavailable = () => new Error('Embedded chat is unavailable. Open this conversation in Steam.');
const isConnected = (app: FriendsApp | undefined) => app?.m_bReadyToRender === true && app.m_CMInterface?.m_bConnected === true && (app.m_CMInterface.m_bLoggedOn === true || app.m_CMInterface.logged_on === true);
const selfId = (app: FriendsApp | undefined) => app?.FriendStore?.self?.accountid ?? app?.FriendStore?.m_self?.m_unAccountID;

/** Injection boundary for tests; no conversation lookup occurs while reading/polling the friends list. */
export function createNativeSocialBindings(deps: NativeSocialDependencies): SocialBindings {
    let serial = 0;
    const ids = new WeakMap<NativeMessage, string>();
    const messageKey = (message: NativeMessage) => {
        let id = ids.get(message);
        if (!id) { id = `message-${++serial}`; ids.set(message, id); }
        return id;
    };
    function read(): SocialContext {
        const app = deps.app();
        const account = selfId(app);
        const accountId = account ? String(account) : null;
        if (!app || !app.m_bReadyToRender) return { accountId, status: 'loading', canChat: false, friends: [] };
        if (!isConnected(app) || !accountId) return { accountId, status: 'offline', canChat: false, friends: [] };
        if (!deps.allowed()) return { accountId, status: 'unavailable', canChat: false, friends: [] };
        const friends = mapFriends(deps.friends().filter(f => steamAccountId(f.steamId) !== null), () => '', Number.MAX_SAFE_INTEGER)
            .map(friend => {
                const persona = app.FriendStore?.GetFriendIfCached?.(steamAccountId(friend.steamId)!);
                return { ...friend, blocked: !persona?.is_friend || persona.is_blocked === true };
            });
        return { accountId, status: 'ready', friends, canChat: !!deps.helpers() && typeof app.ChatStore?.TextFilterStore?.FilterText === 'function' && typeof app.ChatStore?.GetFriendChat === 'function' && typeof app.GetDefaultBrowserContext === 'function' };
    }
    return {
        read,
        subscribe(listener: Stop): Stop {
            const timer = setInterval(listener, 1000);
            return () => clearInterval(timer);
        },
        open: (steamId: string): ChatSession => openChat(steamId, true)!,
        peek: (steamId: string): ChatSession | null => { try { return openChat(steamId, false); } catch { return null; } },
    };
    function openChat(steamId: string, create: boolean): ChatSession | null {
            const context = read();
            const account = steamAccountId(steamId);
            const app = deps.app(), helpers = deps.helpers();
            if (!context.canChat || !account || !app || !helpers || context.friends.find(f => f.steamId === steamId)?.blocked !== false) throw unavailable();
            const browser = app.GetDefaultBrowserContext!();
            if (!browser || !Number.isFinite(browser.m_nBrowserID) || !Number.isFinite(browser.m_unPID)) throw unavailable();
            // The creating lookup runs only for an explicit user entry; previews never create a chat.
            const raw = app.ChatStore!.GetFriendChat(account, create);
            if (!raw && !create) return null;
            if (!raw || ['AddChatView', 'RemoveChatView', 'LoadChatLogs', 'LoadMoreHistory', 'IsMoreHistoryAvailable', 'SendChatMessage', 'RetryFailedMessage', 'OnActivate', 'OnDeactivate'].some(name => typeof (raw as unknown as Record<string, unknown>)[name] !== 'function')) throw unavailable();
            let disposed = false;
            let visible = false;
            let atBottom = false;
            const messagesById = new Map<string, NativeMessage>();
            const listeners = new Set<Stop>();
            let interval: ReturnType<typeof setInterval> | undefined;
            let fingerprint = '';
            const valid = () => !disposed && deps.app() === app && isConnected(app) && String(selfId(app)) === context.accountId && deps.allowed() && app.FriendStore?.GetFriendIfCached?.(account)?.is_friend === true && app.FriendStore.GetFriendIfCached(account)?.is_blocked !== true;
            const requireValid = () => { if (!valid()) throw unavailable(); };
            const view = {
                m_bScrolledToBottom: false,
                m_tabset: { is_popup_active: false, is_popup_visible: false, is_popup_focused: false, activeTab: { GetChatView: (): unknown => view } },
                get is_scrolled_to_bottom() { return atBottom; },
                BIsInBrowserContext(other: BrowserContext) { return other.m_nBrowserID === browser.m_nBrowserID && other.m_unPID === browser.m_unPID; },
                GetVisibilityState() { if (!valid()) hide(); return helpers.GetVisibilityState.call(view); },
            };
            function hide() {
                visible = false; atBottom = false; view.m_bScrolledToBottom = false;
                view.m_tabset.is_popup_active = false; view.m_tabset.is_popup_visible = false; view.m_tabset.is_popup_focused = false;
            }
            function snapshot() {
                requireValid();
                messagesById.clear();
                const messages: ChatMessage[] = [];
                for (const message of raw!.chat_messages ?? []) {
                    if (!message || typeof message !== 'object' || typeof message.strMessage !== 'string') continue;
                    const id = messageKey(message);
                    messagesById.set(id, message);
                    const removed = !!message.eDeleteState;
                    const text = removed ? 'Message removed.' : app!.ChatStore!.TextFilterStore!.FilterText(message.unAccountID ?? 0, message.strMessage);
                    if (typeof text !== 'string') throw unavailable();
                    const own = message.unAccountID === selfId(app);
                    const echo = message.BIsLocalEcho?.() === true;
                    const failed = echo && (message.eErrorSending ?? 0) !== 0;
                    const acknowledged = !echo || message.BHasServerAcknowledged?.() === true;
                    messages.push({ id, text: text.replace(/\\([\[\]\\])/g, '$1'), own, timestamp: Number.isFinite(message.rtTimestamp) ? message.rtTimestamp! : 0,
                        rich: !removed && (message.BIsServerMsg?.() === true || /(?<!\\)\[\/?[a-z][^\]]*\]/i.test(text)),
                        state: !own ? 'received' : failed ? 'failed' : acknowledged ? 'sent' : 'pending' });
                }
                return { messages, more: raw!.IsMoreHistoryAvailable() };
            }
            function poll() {
                if (!valid()) hide();
                let next: string;
                try { next = JSON.stringify(snapshot()); } catch { next = 'unavailable'; }
                if (next !== fingerprint) { fingerprint = next; for (const listener of listeners) listener(); }
            }
            const hasPending = () => raw!.chat_messages.some(message => message.unAccountID === selfId(app) && message.BIsLocalEcho?.() && !message.BHasServerAcknowledged?.() && !message.eErrorSending);
            async function send(text: string) {
                requireValid();
                if (hasPending()) throw Error('A message is still sending. Wait for its delivery status.');
                if (!text.trim() || text.length > 2000) throw Error('Write a message of up to 2,000 characters.');
                const encoded = helpers!.ConvertMessageToBBCode(text);
                if (typeof encoded !== 'string') throw unavailable();
                const previous = new Set(raw!.chat_messages);
                const sending = raw!.SendChatMessage(encoded);
                // The native path appends its local echo synchronously before awaiting transport.
                const echo = raw!.chat_messages.find(m => !previous.has(m) && m.BIsLocalEcho?.() && m.unAccountID === Number(context.accountId));
                const echoId = echo ? messageKey(echo) : undefined;
                poll();
                await sending;
                if (!disposed) poll();
                if (echo && (echo.eErrorSending ?? 0) !== 0) throw new ChatDeliveryError('Message could not be sent. Your draft is kept.', echoId);
                if (!echo?.BHasServerAcknowledged?.()) throw new ChatDeliveryError('Delivery is not confirmed. Check the pending message before sending again.', echoId);
            }
            raw.AddChatView(view);
            return {
                read: snapshot,
                subscribe(listener) {
                    if (disposed) return () => {};
                    listeners.add(listener);
                    if (!interval) interval = setInterval(poll, 200);
                    return () => { listeners.delete(listener); if (!listeners.size && interval) { clearInterval(interval); interval = undefined; } };
                },
                async load() {
                    requireValid();
                    if (raw.m_bChatLogsLoaded && !raw.m_bReceivedChatLogs && !raw.m_nLoadingHistoryInProgressCount && raw.InternalLoadChatLogs) await raw.InternalLoadChatLogs(false);
                    else await raw.LoadChatLogs();
                    const started = Date.now();
                    while (raw.m_nLoadingHistoryInProgressCount && Date.now() - started < 12_000) {
                        await new Promise(resolve => setTimeout(resolve, 100)); requireValid();
                    }
                    if (!raw.m_bReceivedChatLogs || raw.m_nLoadingHistoryInProgressCount) throw Error('Conversation history could not be loaded. Try again or open it in Steam.');
                    requireValid(); poll();
                },
                async loadMore() { requireValid(); await raw.LoadMoreHistory(); requireValid(); poll(); },
                send,
                async retry(messageId) {
                    requireValid();
                    const message = messagesById.get(messageId);
                    if (hasPending()) throw Error('A message is still sending. Wait before retrying.');
                    if (!message || message.BIsLocalEcho?.() !== true || !message.eErrorSending || message.unAccountID !== selfId(app)) throw Error('This message cannot be retried.');
                    // The native retry delegates to SendChatMessage but does not return its promise.
                    // Remove/resubmit through the native operation and observe the new echo instead.
                    const previous = new Set(raw.chat_messages);
                    raw.RetryFailedMessage(message);
                    const echo = raw.chat_messages.find(m => !previous.has(m) && m.BIsLocalEcho?.() && m.unAccountID === Number(context.accountId));
                    if (!echo) throw Error('Retry could not be started. Open the conversation in Steam.');
                    const echoId = messageKey(echo);
                    poll();
                    const started = Date.now();
                    while (!echo.BHasServerAcknowledged?.() && !echo.eErrorSending && Date.now() - started < 90_000) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        if (!disposed) poll();
                    }
                    if (echo.eErrorSending) throw new ChatDeliveryError('Message could not be sent.', echoId);
                    if (!echo.BHasServerAcknowledged?.()) throw new ChatDeliveryError('Delivery is not confirmed. Check the pending message in Steam.', echoId);
                },
                setVisibility(show, bottom) {
                    const wasVisible = visible;
                    const wasReading = visible && atBottom;
                    visible = show && valid(); atBottom = visible && bottom;
                    view.m_bScrolledToBottom = atBottom;
                    view.m_tabset.is_popup_active = visible; view.m_tabset.is_popup_visible = visible; view.m_tabset.is_popup_focused = visible;
                    if (atBottom && !wasReading) raw.OnActivate();
                    else if (wasVisible && !visible) raw.OnDeactivate();
                },
                dispose() {
                    if (disposed) return;
                    const wasVisible = visible;
                    disposed = true; hide(); listeners.clear(); messagesById.clear();
                    if (interval) clearInterval(interval); interval = undefined;
                    try { if (wasVisible) raw.OnDeactivate(); } finally { raw.RemoveChatView(view); }
                },
            };
    }
}

/** Shape discovery deliberately avoids Steam's changing webpack module numbers. */
export function discoverSocialBindings(): SocialBindings {
    const root = globalThis as unknown as { g_FriendsUIApp?: FriendsApp };
    let helpers: NativeChatHelpers | undefined;
    let policy: { BIsFeatureBlocked(feature: number): boolean } | undefined;
    return createNativeSocialBindings({
        app: () => root.g_FriendsUIApp,
        friends: readFriends,
        allowed() {
            try { policy ??= findModuleExport(value => typeof value?.BIsFeatureBlocked === 'function'); return !!policy && !policy.BIsFeatureBlocked(4); }
            catch { return false; }
        },
        helpers() {
            try {
                helpers ??= findModuleExport(value => typeof value?.prototype?.GetVisibilityState === 'function' && typeof value.prototype.ConvertMessageToBBCode === 'function' && typeof value.prototype.GetChatView === 'function')?.prototype;
                return helpers;
            } catch { return undefined; }
        },
    });
}
