import type { FriendCard } from '../../home/friends';
import type { Stop } from '../model';

export interface SocialFriend extends FriendCard { blocked?: boolean }
export interface SocialContext {
    accountId: string | null;
    status: 'loading' | 'ready' | 'offline' | 'unavailable';
    canChat: boolean;
    friends: SocialFriend[];
}
export interface ChatMessage {
    id: string;
    text: string;
    timestamp: number;
    own: boolean;
    state: 'received' | 'pending' | 'sent' | 'failed';
    rich?: boolean;
}
export interface ChatSnapshot { messages: ChatMessage[]; more: boolean }
export class ChatDeliveryError extends Error {
    constructor(message: string, public readonly messageId?: string) { super(message); }
}
export interface ChatSession {
    read(): ChatSnapshot;
    subscribe(listener: Stop): Stop;
    load(): Promise<void>;
    loadMore(): Promise<void>;
    send(text: string): Promise<void>;
    retry(messageId: string): Promise<void>;
    setVisibility(visible: boolean, atBottom: boolean): void;
    dispose(): void;
}
export interface SocialBindings {
    read(): SocialContext;
    subscribe(listener: Stop): Stop;
    open(steamId: string): ChatSession;
}
export interface SocialSnapshot extends SocialContext {
    selectedId: string | null;
    enteredId: string | null;
    messages: ChatMessage[];
    more: boolean;
    loading: boolean;
    sending: boolean;
    draft: string;
    error: string;
    newer?: boolean;
}
const EMPTY: SocialContext = { accountId: null, status: 'loading', canChat: false, friends: [] };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Chat is unavailable. Try opening it in Steam.';

/** One lazy, account-scoped session. Only explicit enter/send commands have chat side effects. */
export function createSocial(bindings: SocialBindings) {
    let current: SocialSnapshot = { ...EMPTY, selectedId: null, enteredId: null, messages: [], more: false, loading: false, sending: false, draft: '', error: '' };
    let disposed = false;
    let generation = 0;
    let accountGeneration = 0;
    let chat: ChatSession | undefined;
    let historyReady = false;
    let windowEndId: string | null = null;
    let stopChat: Stop | undefined;
    let stopSource: Stop | undefined;
    const listeners = new Set<Stop>();
    const drafts = new Map<string, string>();
    const failedDrafts = new Map<string, string>();
    const emit = (change: Partial<SocialSnapshot>) => {
        current = { ...current, ...change };
        for (const listener of listeners) listener();
    };
    function releaseChat() {
        generation++;
        const owned = chat;
        chat = undefined;
        historyReady = false;
        windowEndId = null;
        const unsubscribe = stopChat;
        stopChat = undefined;
        for (const release of [unsubscribe, () => owned?.setVisibility(false, false), () => owned?.dispose()]) {
            try { release?.(); } catch { /* Release every resource even if a native view vanished. */ }
        }
    }
    function leave() {
        releaseChat();
        emit({ enteredId: null, messages: [], loading: false, sending: false, more: false, newer: false, draft: '', error: '' });
    }
    function readChat(owned: ChatSession, ticket: number) {
        if (disposed || owned !== chat || ticket !== generation) return;
        try {
            const snapshot = owned.read();
            const anchored = windowEndId ? snapshot.messages.findIndex(m => m.id === windowEndId) : -1;
            const end = anchored >= 0 ? anchored + 1 : snapshot.messages.length;
            const start = Math.max(0, end - 200);
            emit({ messages: snapshot.messages.slice(start, end), more: snapshot.more || start > 0, newer: end < snapshot.messages.length });
        } catch (error) {
            refresh();
            if (owned === chat && ticket === generation) emit({ error: errorText(error) });
        }
    }
    function refresh() {
        if (disposed) return;
        let context: SocialContext;
        try { context = bindings.read(); }
        catch { context = { ...EMPTY, status: 'unavailable' }; }
        if (current.accountId !== context.accountId) {
            releaseChat(); drafts.clear(); failedDrafts.clear(); accountGeneration++;
            current = { ...current, enteredId: null, selectedId: null, messages: [], draft: '', loading: false, sending: false, more: false, newer: false, error: '' };
        }
        const entered = context.friends.find(f => f.steamId === current.enteredId);
        if (current.enteredId && (context.status !== 'ready' || !context.canChat || !entered || entered.blocked)) leave();
        const selectedId = context.friends.some(f => f.steamId === current.selectedId) ? current.selectedId : context.friends[0]?.steamId ?? null;
        emit({ ...context, selectedId });
    }
    function stop() {
        const unsubscribe = stopSource;
        stopSource = undefined;
        try { unsubscribe?.(); } finally { leave(); }
    }
    async function history(more: boolean) {
        if (!chat || current.loading || disposed) return;
        const owned = chat, ticket = generation;
        const firstId = current.messages[0]?.id;
        emit({ loading: true, error: '' });
        try {
            if (more) {
                const cached = owned.read();
                if (!firstId || cached.messages.findIndex(m => m.id === firstId) <= 0) await owned.loadMore();
                if (owned !== chat || ticket !== generation) return;
                const loaded = owned.read();
                const previousFirst = loaded.messages.findIndex(m => m.id === firstId);
                const start = Math.max(0, previousFirst - 50);
                const end = Math.min(loaded.messages.length, start + 200);
                windowEndId = end < loaded.messages.length ? loaded.messages[end - 1]?.id ?? null : null;
            } else await owned.load();
            if (owned === chat && ticket === generation) historyReady = true;
            readChat(owned, ticket);
        } catch (error) { if (chat === owned && ticket === generation) emit({ error: errorText(error) }); }
        finally { if (chat === owned && ticket === generation) emit({ loading: false }); }
    }
    return {
        get: () => current,
        subscribe(listener: Stop): Stop {
            if (disposed) return () => {};
            listeners.add(listener);
            if (listeners.size === 1) {
                refresh();
                try { stopSource = bindings.subscribe(refresh); }
                catch { emit({ status: 'unavailable', canChat: false, error: 'Friends are unavailable. Open Social in Steam.' }); }
            }
            let active = true;
            return () => { if (!active) return; active = false; listeners.delete(listener); if (!listeners.size) stop(); };
        },
        preview(steamId: string) {
            if (disposed || current.enteredId || !current.friends.some(f => f.steamId === steamId)) return;
            emit({ selectedId: steamId, error: '' });
        },
        async enter(steamId: string) {
            if (disposed) return;
            refresh();
            const friend = current.friends.find(f => f.steamId === steamId);
            if (current.status !== 'ready' || !current.canChat || !friend || friend.blocked) {
                emit({ error: 'Chat is unavailable for this friend. Open Social in Steam.' }); return;
            }
            if (current.enteredId === steamId && chat) return;
            releaseChat();
            try {
                chat = bindings.open(steamId);
                const owned = chat, ticket = generation;
                owned.setVisibility(false, false);
                emit({ enteredId: steamId, selectedId: steamId, messages: [], more: false, newer: false, loading: false, sending: false, error: '', draft: drafts.get(steamId) ?? '' });
                stopChat = owned.subscribe(() => readChat(owned, ticket));
                await history(false);
            } catch (error) { releaseChat(); emit({ enteredId: null, loading: false, error: errorText(error) }); }
        },
        leave,
        setDraft(text: string) {
            if (!current.enteredId || disposed) return;
            const value = text.slice(0, 2000);
            drafts.set(current.enteredId, value);
            emit({ draft: value });
        },
        setVisibility(visible: boolean, atBottom: boolean) {
            if (!disposed) chat?.setVisibility(visible && historyReady && current.status === 'ready' && !current.loading, atBottom && !current.newer);
        },
        loadMore: () => history(true),
        reload: () => history(false),
        latest() {
            if (current.loading) return;
            windowEndId = null;
            if (chat) readChat(chat, generation);
        },
        async send() {
            if (!chat || !current.enteredId || current.sending || current.loading || !current.draft.trim() || disposed) return;
            refresh();
            if (!chat) return;
            if (current.messages.some(m => m.own && m.state === 'pending')) {
                emit({ error: 'A message is still sending. Wait for its delivery status before sending again.' }); return;
            }
            const owned = chat, ticket = generation, accountTicket = accountGeneration, text = current.draft, friendId = current.enteredId!;
            emit({ sending: true, error: '' });
            try {
                await owned.send(text);
                if (accountTicket === accountGeneration && drafts.get(friendId) === text) {
                    drafts.delete(friendId);
                    if (current.enteredId === friendId && current.draft === text) emit({ draft: '' });
                }
                if (owned === chat && ticket === generation) {
                    readChat(owned, ticket);
                }
            } catch (error) {
                if (!disposed && accountTicket === accountGeneration && error instanceof ChatDeliveryError && error.messageId) {
                    failedDrafts.set(`${friendId}:${error.messageId}`, text);
                    if (failedDrafts.size > 100) failedDrafts.delete(failedDrafts.keys().next().value!);
                }
                if (owned === chat && ticket === generation) {
                    emit({ error: errorText(error) });
                }
            }
            finally { if (owned === chat && ticket === generation) emit({ sending: false }); }
        },
        async retry(messageId: string) {
            refresh();
            if (!chat || current.sending || disposed || !current.messages.some(m => m.id === messageId && m.state === 'failed')) return;
            const owned = chat, ticket = generation, accountTicket = accountGeneration, friendId = current.enteredId!;
            const failureKey = `${friendId}:${messageId}`;
            const originalDraft = failedDrafts.get(failureKey);
            emit({ sending: true, error: '' });
            try {
                await owned.retry(messageId);
                if (accountTicket === accountGeneration && originalDraft !== undefined && drafts.get(friendId) === originalDraft) {
                    drafts.delete(friendId);
                    if (current.enteredId === friendId && current.draft === originalDraft) emit({ draft: '' });
                }
                if (owned === chat && ticket === generation) {
                    failedDrafts.delete(failureKey); readChat(owned, ticket);
                }
            }
            catch (error) {
                if (!disposed && accountTicket === accountGeneration && originalDraft !== undefined && error instanceof ChatDeliveryError && error.messageId) failedDrafts.set(`${friendId}:${error.messageId}`, originalDraft);
                if (owned === chat && ticket === generation) emit({ error: errorText(error) });
            }
            finally { if (owned === chat && ticket === generation) emit({ sending: false }); }
        },
        dispose() {
            if (disposed) return;
            disposed = true; listeners.clear(); stop(); drafts.clear(); failedDrafts.clear();
        },
    };
}
export type SocialService = ReturnType<typeof createSocial>;
