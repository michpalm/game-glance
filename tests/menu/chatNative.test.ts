import { describe, expect, it, vi } from 'vitest';
import { createNativeSocialBindings, steamAccountId } from '../../src/menu/steam/chatNative';

const steamId = '76561198000000001';
function harness() {
    let allowed = true;
    const messages: any[] = [];
    const raw = { chat_messages: messages, m_bReceivedChatLogs: false, m_bChatLogsLoaded: false,
        LoadChatLogs: vi.fn(async () => { raw.m_bReceivedChatLogs = true; }), LoadMoreHistory: vi.fn(async () => {}), IsMoreHistoryAvailable: () => true,
        AddChatView: vi.fn(), RemoveChatView: vi.fn(), OnActivate: vi.fn(), OnDeactivate: vi.fn(),
        SendChatMessage: vi.fn(async (text: string) => { messages.push(message(text, true)); }), RetryFailedMessage: vi.fn() };
    const getChat = vi.fn(() => raw);
    const filter = vi.fn((_sender: number, text: string) => text.replace('filtered-word', '♥♥♥'));
    const friend = { is_friend: true, is_blocked: false };
    const app = { m_bReadyToRender: true, m_CMInterface: { m_bConnected: true, m_bLoggedOn: true },
        FriendStore: { self: { accountid: 55 }, GetFriendIfCached: () => friend },
        ChatStore: { GetFriendChat: getChat, TextFilterStore: { FilterText: filter } },
        GetDefaultBrowserContext: () => ({ m_nBrowserID: 1, m_unPID: 2 }) };
    const view = { GetVisibilityState(this: any) { return this.m_tabset.is_popup_focused && this.m_tabset.is_popup_visible && this.m_bScrolledToBottom ? 4 : 0; }, ConvertMessageToBBCode: vi.fn((text: string) => text.replace(/\[/g, '\\[')) };
    const bindings = createNativeSocialBindings({ app: () => app, allowed: () => allowed, helpers: () => view, friends: () => [{ steamId, name: 'Synthetic player', avatarUrl: null, personaState: 1, gameAppId: 0, onlineStatus: 'Online' }] });
    return { bindings, raw, app, messages, view, filter, getChat, friend, block: () => { allowed = false; } };
}
function message(text = 'Synthetic message', ack = false) {
    return { strMessage: text, rtTimestamp: 123, unOrdinal: 1, unAccountID: 55, eErrorSending: 0, UniqueKey: () => 'echo', BIsLocalEcho: () => true, BHasServerAcknowledged: () => ack };
}
describe('native embedded chat bindings', () => {
    it('converts full string Steam IDs without losing precision or accepting invalid identities', () => {
        expect(steamAccountId(steamId)).toBe(39734273); expect(steamAccountId('76561197960265728')).toBeNull();
        expect(steamAccountId('123')).toBeNull(); expect(steamAccountId('99999999999999999')).toBeNull();
    });
    it('reads friends without creating a chat and checks availability before opening', () => {
        const h = harness(); expect(h.bindings.read()).toMatchObject({ accountId: '55', status: 'ready', canChat: true });
        expect(h.getChat).not.toHaveBeenCalled(); h.block(); expect(() => h.bindings.open(steamId)).toThrow(); expect(h.getChat).not.toHaveBeenCalled();
    });
    it('registers exactly one view and acknowledges only visible bottom-of-chat messages', () => {
        const h = harness(), session = h.bindings.open(steamId); const view = h.raw.AddChatView.mock.calls[0][0] as any;
        expect(h.getChat).toHaveBeenCalledWith(39734273, true);
        session.setVisibility(false, true); session.setVisibility(true, false); expect(h.raw.OnActivate).not.toHaveBeenCalled();
        session.setVisibility(true, true); session.setVisibility(true, true); expect(h.raw.OnActivate).toHaveBeenCalledOnce(); expect(view.GetVisibilityState()).toBe(4);
        session.setVisibility(false, false); expect(view.GetVisibilityState()).toBe(0);
        session.dispose(); session.dispose(); expect(h.raw.RemoveChatView).toHaveBeenCalledTimes(1);
    });
    it('filters display text and escapes outbound text with the native helper', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        h.messages.push({ ...message('filtered-word <script>', true), unAccountID: 99, BIsLocalEcho: () => false });
        expect(session.read().messages[0].text).toBe('♥♥♥ <script>'); expect(h.filter).toHaveBeenCalledWith(99, 'filtered-word <script>');
        await session.send('[Synthetic]'); expect(h.raw.SendChatMessage).toHaveBeenCalledWith('\\[Synthetic]'); session.dispose();
    });
    it('reports resolved-but-failed native sends as failures', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        h.raw.SendChatMessage.mockImplementation(async text => { h.messages.push({ ...message(text), eErrorSending: 2 }); });
        await expect(session.send('Synthetic text')).rejects.toThrow(/could not be sent/);
        expect(session.read().messages[0].state).toBe('failed'); session.dispose();
    });
    it('does not assume an unacknowledged echo was delivered', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        h.raw.SendChatMessage.mockImplementation(async text => { h.messages.push(message(text)); });
        await expect(session.send('Synthetic text')).rejects.toThrow(/not confirmed/); expect(session.read().messages[0].state).toBe('pending'); session.dispose();
    });
    it('tracks the actual local echo when Steam transforms a special message', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        h.raw.SendChatMessage.mockImplementation(async () => { h.messages.push(message('[plusone][/plusone]', true)); });
        await expect(session.send('+1')).resolves.toBeUndefined(); session.dispose();
    });
    it('does not submit again when a pending native echo is outside the visible history window', async () => {
        const h = harness(), session = h.bindings.open(steamId); h.messages.push(message('Pending'));
        await expect(session.send('Synthetic text')).rejects.toThrow(/still sending/); expect(h.raw.SendChatMessage).not.toHaveBeenCalled(); session.dispose();
    });
    it('does not turn a late native failure into success after the view is disposed', async () => {
        const h = harness(), session = h.bindings.open(steamId); let finish!: () => void;
        const echo = message('Synthetic');
        h.raw.SendChatMessage.mockImplementation(async () => { h.messages.push(echo); await new Promise<void>(resolve => { finish = resolve; }); echo.eErrorSending = 2; });
        const sending = session.send('Synthetic'); const result = expect(sending).rejects.toThrow(/could not be sent/);
        session.dispose(); finish(); await result;
    });
    it('recognizes a native acknowledgment even when connectivity changed before teardown', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        h.raw.SendChatMessage.mockImplementation(async text => { h.messages.push(message(text, true)); h.app.m_CMInterface.m_bConnected = false; });
        await expect(session.send('Synthetic')).resolves.toBeUndefined(); session.dispose();
    });
    it('continues observing an issued retry after disconnect', async () => {
        vi.useFakeTimers();
        try {
            const h = harness(), session = h.bindings.open(steamId); let acknowledged = false;
            const failed = { ...message('Synthetic'), eErrorSending: 2 }; h.messages.push(failed);
            const id = session.read().messages[0].id;
            h.raw.RetryFailedMessage.mockImplementation(() => { h.messages.splice(0, 1, { ...message('Synthetic'), BHasServerAcknowledged: () => acknowledged }); h.app.m_CMInterface.m_bConnected = false; });
            const retry = session.retry(id); void retry.catch(() => {});
            await vi.advanceTimersByTimeAsync(200); acknowledged = true; await vi.advanceTimersByTimeAsync(200);
            await expect(retry).resolves.toBeUndefined(); session.dispose();
        } finally { vi.useRealTimers(); }
    });
    it('retries through Steam and reports the new failed echo identity for a subsequent retry', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        const failed = { ...message('Synthetic'), eErrorSending: 2 }; h.messages.push(failed);
        const id = session.read().messages[0].id;
        h.raw.RetryFailedMessage.mockImplementation(() => { h.messages.splice(0, 1, { ...message('Synthetic'), eErrorSending: 2 }); });
        const error = await session.retry(id).catch(error => error);
        expect(h.raw.RetryFailedMessage).toHaveBeenCalledWith(failed); expect(error.messageId).toBe(session.read().messages[0].id);
        session.dispose();
    });
    it('rejects writes after connection, account, friend or policy changes', async () => {
        const h = harness(), session = h.bindings.open(steamId); h.app.FriendStore.self.accountid = 56;
        await expect(session.send('Synthetic')).rejects.toThrow(); expect(h.raw.SendChatMessage).not.toHaveBeenCalled();
        session.setVisibility(true, true); expect(h.raw.OnActivate).not.toHaveBeenCalled(); session.dispose();
    });
    it('can retry a failed initial history load without relying on the native sticky loaded flag', async () => {
        const h = harness(), session = h.bindings.open(steamId);
        h.raw.LoadChatLogs.mockImplementationOnce(async () => { h.raw.m_bChatLogsLoaded = true; throw Error('Synthetic history error'); });
        await expect(session.load()).rejects.toThrow(); await session.load(); expect(h.raw.LoadChatLogs).toHaveBeenCalledTimes(2); session.dispose();
    });
    it('keeps blocked friends unavailable for embedded chat', () => {
        const h = harness(); h.friend.is_blocked = true;
        expect(h.bindings.read().friends[0].blocked).toBe(true); expect(() => h.bindings.open(steamId)).toThrow();
    });
    it('waits for an already-running native history request before reporting readiness', async () => {
        vi.useFakeTimers();
        try {
            const h = harness(), session = h.bindings.open(steamId);
            Object.assign(h.raw, { m_bChatLogsLoaded: true, m_bReceivedChatLogs: false, m_nLoadingHistoryInProgressCount: 1 });
            h.raw.LoadChatLogs.mockImplementation(async () => {});
            let ready = false; const loading = session.load().then(() => { ready = true; }); await Promise.resolve(); await Promise.resolve(); expect(ready).toBe(false);
            Object.assign(h.raw, { m_bReceivedChatLogs: true, m_nLoadingHistoryInProgressCount: 0 }); await vi.advanceTimersByTimeAsync(200); await loading;
            expect(ready).toBe(true); session.dispose();
        } finally { vi.useRealTimers(); }
    });
    it('does not report ready when a native history refresh remains busy after timeout', async () => {
        vi.useFakeTimers();
        try {
            const h = harness(), session = h.bindings.open(steamId);
            Object.assign(h.raw, { m_bChatLogsLoaded: true, m_bReceivedChatLogs: true, m_nLoadingHistoryInProgressCount: 1 });
            const result = expect(session.load()).rejects.toThrow(/could not be loaded/);
            await vi.advanceTimersByTimeAsync(12_000); await result; session.dispose();
        } finally { vi.useRealTimers(); }
    });
});

describe('native conversation preview', () => {
    it('looks up an existing conversation without creating one, and reads its history without marking it read', async () => {
        const h = harness();
        const session = h.bindings.peek!(steamId)!;
        expect(h.getChat).toHaveBeenCalledWith(expect.any(Number), false);
        expect(h.getChat.mock.calls.some(call => (call as unknown[])[1] === true)).toBe(false);
        await session.load(); session.setVisibility(false, false);
        expect(h.raw.LoadChatLogs).toHaveBeenCalled(); expect(h.raw.OnActivate).not.toHaveBeenCalled();
        session.dispose(); expect(h.raw.RemoveChatView).toHaveBeenCalled();
    });
    it('answers null when there is no conversation yet, instead of starting one', () => {
        const h = harness(); h.getChat.mockReturnValue(null as never);
        expect(h.bindings.peek!(steamId)).toBeNull();
        expect(h.raw.AddChatView).not.toHaveBeenCalled();
    });
});
