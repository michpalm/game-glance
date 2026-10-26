import { describe, expect, it, vi } from 'vitest';
import { ChatDeliveryError, createSocial, type ChatMessage, type ChatSession, type SocialBindings, type SocialContext } from '../../src/menu/steam/social';

const id = '76561198000000001';
const other = '76561198000000002';
const friend = (steamId = id) => ({ steamId, name: 'Synthetic player', avatarUrl: null, state: 'online' as const, appId: null, lastAppId: null, sub: 'Online', game: '', gameInLibrary: false, joinUrl: null });
function harness() {
    let context: SocialContext = { accountId: 'account-a', status: 'ready', canChat: true, friends: [friend(), friend(other)] };
    let change = () => {};
    const sessions: Array<ChatSession & { messages: ChatMessage[]; notify(): void }> = [];
    const open = vi.fn(() => {
        let update = () => {};
        const session = { messages: [] as ChatMessage[], read: () => ({ messages: session.messages, more: true }), subscribe: (fn: () => void) => { update = fn; return vi.fn(); },
            load: vi.fn(async () => {}), loadMore: vi.fn(async () => {}), send: vi.fn(async (_text: string) => {}), retry: vi.fn(async (_id: string) => {}),
            setVisibility: vi.fn(), dispose: vi.fn(), notify: () => update() };
        sessions.push(session); return session;
    });
    const stop = vi.fn();
    const bindings: SocialBindings = { read: () => context, subscribe: fn => { change = fn; return stop; }, open };
    const social = createSocial(bindings);
    const unsubscribe = social.subscribe(() => {});
    return { social, open, sessions, stop, unsubscribe, change(value: Partial<SocialContext>, notify = true) { context = { ...context, ...value }; if (notify) change(); } };
}

describe('Social session', () => {
    it('lists every friend and previews without creating a conversation', () => {
        const h = harness(); h.change({ friends: Array.from({ length: 30 }, (_, i) => friend(String(76561198000000000n + BigInt(i)))) });
        h.social.preview(id);
        expect(h.social.get().friends).toHaveLength(30); expect(h.social.get().selectedId).toBe(id);
        expect(h.open).not.toHaveBeenCalled(); h.social.dispose();
    });
    it('enters only by explicit action and does not acknowledge on initial load', async () => {
        const h = harness(); await h.social.enter(id);
        expect(h.open).toHaveBeenCalledWith(id); expect(h.social.get().enteredId).toBe(id);
        expect(h.sessions[0].load).toHaveBeenCalledOnce(); expect(h.sessions[0].setVisibility).toHaveBeenLastCalledWith(false, false);
        h.social.setVisibility(true, true); expect(h.sessions[0].setVisibility).toHaveBeenLastCalledWith(true, true);
        h.social.dispose();
    });
    it('ignores late history from the previous selection and releases each owned session once', async () => {
        const h = harness(); let finish!: () => void;
        h.open.mockImplementationOnce(() => { const s = { ...h.open.getMockImplementation()!() }; s.load = vi.fn(() => new Promise<void>(r => { finish = r; })); return s; });
        // Restore the default implementation after the one-shot wrapper has acquired a session.
        const first = h.social.enter(id); await h.social.enter(other); finish(); await first;
        expect(h.social.get().enteredId).toBe(other); expect(h.sessions[0].dispose).toHaveBeenCalledOnce();
        h.social.dispose(); expect(h.sessions[1].dispose).toHaveBeenCalledOnce();
    });
    it('retains a draft after a resolved native failure reported by the adapter', async () => {
        const h = harness(); await h.social.enter(id); h.social.setDraft('Synthetic draft');
        h.sessions[0].send = vi.fn(async () => { throw Error('Message could not be sent.'); });
        await h.social.send();
        expect(h.social.get().draft).toBe('Synthetic draft'); expect(h.social.get().error).toMatch(/could not be sent/);
        h.social.dispose();
    });
    it('does not send twice while pending or clear edits made while sending', async () => {
        const h = harness(); await h.social.enter(id); let finish!: () => void;
        h.sessions[0].send = vi.fn(() => new Promise<void>(r => { finish = r; }));
        h.social.setDraft('First draft'); const pending = h.social.send(); await h.social.send();
        expect(h.sessions[0].send).toHaveBeenCalledTimes(1); h.social.setDraft('Next draft'); finish(); await pending;
        expect(h.social.get().draft).toBe('Next draft'); h.social.dispose();
    });
    it('does not resubmit a draft while Steam still has an unacknowledged message', async () => {
        const h = harness(); await h.social.enter(id); h.social.setDraft('Synthetic draft');
        h.sessions[0].messages = [{ id: 'pending', text: 'Synthetic draft', own: true, timestamp: 1, state: 'pending' }]; h.sessions[0].notify();
        await h.social.send(); expect(h.sessions[0].send).not.toHaveBeenCalled(); h.social.dispose();
    });
    it('does not acknowledge a conversation whose history failed to load', async () => {
        const h = harness(); h.open.mockImplementationOnce(() => { const s = h.open.getMockImplementation()!(); s.load = vi.fn(async () => { throw Error('History failed'); }); return s; });
        await h.social.enter(id); h.social.setVisibility(true, true);
        expect(h.sessions[0].setVisibility).toHaveBeenLastCalledWith(false, true); h.social.dispose();
    });
    it('preserves per-friend drafts but clears them on account change', async () => {
        const h = harness(); await h.social.enter(id); h.social.setDraft('Private draft'); h.social.leave();
        await h.social.enter(other); expect(h.social.get().draft).toBe(''); h.social.leave();
        await h.social.enter(id); expect(h.social.get().draft).toBe('Private draft');
        h.change({ accountId: 'account-b' }); expect(h.social.get()).toMatchObject({ enteredId: null, messages: [], draft: '' });
        expect(h.sessions[2].dispose).toHaveBeenCalledOnce(); h.social.dispose();
    });
    it('leaves removed, blocked or disconnected friends without acknowledging their chats', async () => {
        const h = harness(); await h.social.enter(id); h.change({ friends: [friend(other)] });
        expect(h.social.get().enteredId).toBeNull(); expect(h.social.get().selectedId).toBe(other);
        await h.social.enter(other); h.change({ status: 'offline' }); expect(h.social.get().enteredId).toBeNull();
        h.change({ status: 'ready', friends: [{ ...friend(), blocked: true }] }); await h.social.enter(id);
        expect(h.open).toHaveBeenCalledTimes(2); h.social.dispose();
    });
    it('bounds history and refreshes incoming messages without clearing drafts', async () => {
        const h = harness(); await h.social.enter(id); h.social.setDraft('Keep me');
        h.sessions[0].messages = Array.from({ length: 250 }, (_, n) => ({ id: String(n), text: 'Synthetic message', timestamp: n, own: false, state: 'received' as const }));
        h.sessions[0].notify(); expect(h.social.get().messages).toHaveLength(200); expect(h.social.get().draft).toBe('Keep me');
        await h.social.loadMore(); expect(h.social.get().messages[0].id).toBe('0'); expect(h.sessions[0].loadMore).not.toHaveBeenCalled();
        expect(h.social.get().newer).toBe(true); h.social.setVisibility(true, true); expect(h.sessions[0].setVisibility).toHaveBeenLastCalledWith(true, false);
        h.social.latest(); expect(h.social.get().messages[0].id).toBe('50'); expect(h.social.get().newer).toBe(false); h.social.dispose();
    });
    it('unsubscribes and releases conversation when its last mounted view leaves', async () => {
        const h = harness(); await h.social.enter(id); h.unsubscribe(); h.social.dispose(); h.social.dispose();
        expect(h.stop).toHaveBeenCalledOnce(); expect(h.sessions[0].dispose).toHaveBeenCalledOnce();
    });
    it.each([false, true])('clears only an unchanged failed-send draft after retry (edited=%s)', async edited => {
        const h = harness(); await h.social.enter(id); h.social.setDraft('Original');
        h.sessions[0].send = vi.fn(async () => { h.sessions[0].messages = [{ id: 'failed', text: 'Original', timestamp: 1, own: true, state: 'failed' }]; h.sessions[0].notify(); throw new ChatDeliveryError('Not sent', 'failed'); });
        await h.social.send(); if (edited) h.social.setDraft('Edited');
        await h.social.retry('failed'); expect(h.social.get().draft).toBe(edited ? 'Edited' : ''); h.social.dispose();
    });
    it('removes an acknowledged draft even if the user left the conversation while sending', async () => {
        const h = harness(); await h.social.enter(id); let finish!: () => void;
        h.sessions[0].send = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
        h.social.setDraft('Synthetic draft'); const sending = h.social.send(); h.social.leave(); finish(); await sending;
        await h.social.enter(id); expect(h.social.get().draft).toBe(''); h.social.dispose();
    });
    it('clears the unchanged failed draft after leaving, reentering and retrying', async () => {
        const h = harness(); await h.social.enter(id); h.social.setDraft('Original');
        h.sessions[0].send = vi.fn(async () => { h.sessions[0].messages = [{ id: 'failed', text: 'Original', timestamp: 1, own: true, state: 'failed' }]; h.sessions[0].notify(); throw new ChatDeliveryError('Not sent', 'failed'); });
        await h.social.send(); h.social.leave(); await h.social.enter(id);
        h.sessions[1].messages = [{ id: 'failed', text: 'Original', timestamp: 1, own: true, state: 'failed' }]; h.sessions[1].notify();
        await h.social.retry('failed'); expect(h.social.get().draft).toBe(''); h.social.dispose();
    });
    it('clears stale account content as soon as the native conversation invalidates', async () => {
        const h = harness(); await h.social.enter(id);
        h.sessions[0].messages = [{ id: 'old', text: 'Private synthetic text', timestamp: 1, own: false, state: 'received' }]; h.sessions[0].notify();
        h.change({ accountId: 'account-b' }, false); h.sessions[0].read = () => { throw Error('Account changed'); }; h.sessions[0].notify();
        expect(h.social.get()).toMatchObject({ accountId: 'account-b', enteredId: null, messages: [] }); h.social.dispose();
    });
});
