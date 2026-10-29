import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MenuKeyboard } from '../../src/menu/components/MenuKeyboard';
import { SocialContents } from '../../src/menu/components/SocialPanel';
import { BUILTIN_QWERTY } from '../../src/menu/keyboard/layouts';
import { createKeyboardSession } from '../../src/menu/keyboard/session';
import { defaultMenuState, reduceMenu } from '../../src/menu/model';
import { leaveSocialConversation } from '../../src/menu/navigation';
import type { SocialService, SocialSnapshot } from '../../src/menu/steam/social';

vi.mock('@decky/ui', () => ({ Focusable: 'div', TextField: 'input', DialogButton: 'button', findModule: () => undefined }));
const id = '76561198000000001';
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
function harness(entered = true, change: Partial<SocialSnapshot> = {}) {
    const snapshot: SocialSnapshot = { accountId: 'test', status: 'ready', canChat: true, friends: [{ steamId: id, name: 'Synthetic player', avatarUrl: null, state: 'online', appId: null, lastAppId: null, sub: 'Online', game: '', gameInLibrary: false, joinUrl: null }],
        selectedId: id, enteredId: entered ? id : null, messages: [], more: false, loading: false, sending: false, draft: '', error: '', ...change };
    const social = { preview: vi.fn(), send: vi.fn(), retry: vi.fn(), setDraft: vi.fn(), reload: vi.fn() } as unknown as SocialService;
    const enter = vi.fn(), leave = vi.fn(), handoff = vi.fn(), loadMore = vi.fn(), latest = vi.fn();
    const element = SocialContents({ snapshot, social, entered, enter, leave, handoff, loadMore, latest });
    const nodes = tree(element);
    const action = (key: string) => nodes.find(n => n.props.id === key)!;
    return { social, snapshot, enter, leave, handoff, nodes, action };
}
describe('Social panel interaction', () => {
    it('reserves the Back action in preview without exposing an inactive navigation target', () => {
        const preview = harness(false), chat = harness(true);
        const reserved = preview.nodes.find(n => n.props.className === 'gg-social-back-slot');
        expect(reserved).toBeDefined();
        expect(reserved!.props.inert).toBe(true);
        expect(reserved!.props['aria-hidden']).toBe(true);
        expect(preview.action('social:back').props.disabled).toBe(true);
        expect(chat.action('social:back').props.disabled).toBe(false);
        chat.action('social:back').props.onAction(); expect(chat.leave).toHaveBeenCalledOnce();
    });
    it('enters a friend only on activation, leaving preview side-effect free', () => {
        const h = harness(false), row = h.action(`social:friend:${id}`);
        expect(h.enter).not.toHaveBeenCalled(); row.props.onAction(); expect(h.enter).toHaveBeenCalledWith(id);
        h.action('social:native').props.onAction(); expect(h.handoff).toHaveBeenCalledWith({ kind: 'qam', tab: 'friends' });
    });
    it('keeps native fallback and disables send for empty or pending messages', () => {
        const h = harness(true, { draft: 'Text', messages: [{ id: 'pending', text: 'Text', own: true, timestamp: 1, state: 'pending' }] });
        expect(h.action('social:send').props.disabled).toBe(true);
        h.action('social:native').props.onAction(); expect(h.handoff).toHaveBeenCalledWith({ kind: 'friend-chat', steamId: id });
    });
    it('forwards composition and explicit send to the session service', () => {
        const h = harness(true, { draft: 'Text' }); h.action('social:send').props.onAction(); expect(h.social.send).toHaveBeenCalledOnce();
        const input = h.nodes.find(n => n.props['aria-label'] === 'Message')!;
        input.props.onChange({ target: { value: 'Updated text' } }); expect(h.social.setDraft).toHaveBeenCalledWith('Updated text');
    });
    it('renders untrusted text as React text and sends rich content to Steam', () => {
        const h = harness(true, { messages: [{ id: 'text', text: '<img src=x onerror=alert(1)>', timestamp: 1, own: false, state: 'received' }, { id: 'rich', text: '[img]unsafe[/img]', timestamp: 1, own: false, state: 'received', rich: true }] });
        expect(h.nodes.every(n => n.props.dangerouslySetInnerHTML === undefined)).toBe(true);
        expect(h.nodes.some(n => n.props.children === '<img src=x onerror=alert(1)>')).toBe(true);
        h.action('social:rich:rich').props.onAction(); expect(h.handoff).toHaveBeenCalledWith({ kind: 'friend-chat', steamId: id });
    });
    it('exposes explicit retry only for failed messages', () => {
        const h = harness(true, { messages: [{ id: 'failed', text: 'Text', timestamp: 1, own: true, state: 'failed' }] });
        h.action('social:retry:failed').props.onAction(); expect(h.social.retry).toHaveBeenCalledWith('failed');
    });
    it('keeps a chat back step before closing the menu', () => {
        let state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
        state = reduceMenu(state, { type: 'open', entry: 'home' }); state = reduceMenu(state, { type: 'select', section: 'social' });
        state = reduceMenu(state, { type: 'push', viewId: 'social-chat' }); state = reduceMenu(state, { type: 'back' });
        expect(state).toMatchObject({ phase: 'custom-open', section: 'social', stack: [] });
        state = reduceMenu(state, { type: 'back' }); expect(state.phase).toBe('closed');
    });
    it('restores the selected friend focus when leaving an entered conversation', () => {
        let state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
        state = reduceMenu(state, { type: 'open', entry: 'home' }); state = reduceMenu(state, { type: 'select', section: 'social' });
        state = reduceMenu(state, { type: 'push', viewId: 'social-chat' });
        const leave = vi.fn();
        expect(leaveSocialConversation(state, { get: () => ({ selectedId: id }), leave }, event => { state = reduceMenu(state, event); })).toBe(true);
        expect(leave).toHaveBeenCalledOnce(); expect(state).toMatchObject({ phase: 'custom-open', stack: [], focus: { social: `social:friend:${id}` } });
    });
});

describe('Social chat with the menu keyboard', () => {
    const qwerty = { layouts: [BUILTIN_QWERTY], current: 0 };
    function chat(change: Partial<SocialSnapshot> = {}, layouts = qwerty, entered = true) {
        const snapshot: SocialSnapshot = { accountId: 'test', status: 'ready', canChat: true, friends: [{ steamId: id, name: 'Synthetic player', avatarUrl: null, state: 'online', appId: null, lastAppId: null, sub: 'Online', game: '', gameInLibrary: false, joinUrl: null }],
            selectedId: id, enteredId: entered ? id : null, messages: [], more: false, loading: false, sending: false, draft: '', error: '', ...change };
        const social = { preview: vi.fn(), send: vi.fn(), retry: vi.fn(), setDraft: vi.fn(), reload: vi.fn() } as unknown as SocialService;
        const keyboard = createKeyboardSession(), field = () => null;
        const nodes = tree(SocialContents({ snapshot, social, entered, enter: vi.fn(), leave: vi.fn(), handoff: vi.fn(), loadMore: vi.fn(), latest: vi.fn(), keyboard, layouts, field }));
        return { nodes, social, keyboard, field, action: (key: string) => nodes.find(n => n.props.id === key), board: nodes.find(n => n.type === MenuKeyboard) };
    }
    it('makes the message field a button that opens the keyboard, never a text input', () => {
        const c = chat();
        expect(c.nodes.some(n => n.type === 'input' || n.props['aria-label'] === 'Message' && n.props.onChange)).toBe(false);
        const compose = c.action('social:compose')!;
        expect([compose.props.children].flat()).toContainEqual(expect.objectContaining({ props: expect.objectContaining({ children: 'Message' }) }));
        compose.props.onAction(); expect(c.keyboard.get().open).toBe(true);
    });
    it('shows the draft in the field', () => {
        expect([chat({ draft: 'Hola' }).action('social:compose')!.props.children].flat()).toContain('Hola');
    });
    it('keeps Steam’s text field for a layout that needs an input method', () => {
        const c = chat({}, { layouts: [{ ...BUILTIN_QWERTY, name: 'japanese', ime: true }], current: 0 });
        expect(c.action('social:compose')).toBeUndefined();
        expect(c.nodes.find(n => n.props['aria-label'] === 'Message')?.props.onChange).toBeTypeOf('function');
        expect(c.board).toBeUndefined();
    });
    it('mounts the keyboard only in an entered chat, wired to the draft and Send', () => {
        expect(chat({}, qwerty, false).board).toBeUndefined();
        const c = chat({ draft: 'Hola' });
        expect(c.board!.props).toMatchObject({ session: c.keyboard, layouts: qwerty, draft: 'Hola', field: c.field });
        c.board!.props.setDraft('Hola!'); expect(c.social.setDraft).toHaveBeenCalledWith('Hola!');
        c.board!.props.send(); expect(c.social.send).toHaveBeenCalledOnce();
    });
    it('enables ✓ exactly when Send is enabled', () => {
        const cases: Partial<SocialSnapshot>[] = [{ draft: 'Hola' }, { draft: '  ' }, { draft: 'Hola', sending: true }, { draft: 'Hola', loading: true }, { draft: 'Hola', canChat: false },
            { draft: 'Hola', messages: [{ id: 'p', text: 'x', own: true, timestamp: 1, state: 'pending' }] }];
        for (const change of cases) {
            const c = chat(change);
            expect(c.board!.props.canSend, JSON.stringify(change)).toBe(!c.action('social:send')!.props.disabled);
        }
    });
});

describe('Social panel layout (direction A)', () => {
    const person = (steamId: string, state: 'ingame' | 'online' | 'offline', extra: Record<string, unknown> = {}) => ({ steamId, name: `Friend ${steamId.slice(-1)}`, avatarUrl: null, state, appId: state === 'ingame' ? 1057090 : null, lastAppId: null,
        sub: state === 'ingame' ? 'Ori and the Will of the Wisps' : state === 'online' ? 'Online' : 'Last online 1 day ago', game: state === 'ingame' ? 'Ori and the Will of the Wisps' : '', gameInLibrary: true, joinUrl: null, ...extra });
    const strings = (nodes: ReturnType<typeof tree>) => nodes.flatMap(n => [n.props.children].flat().filter((c: unknown) => typeof c === 'string')).join(' | ');
    function view(change: Partial<SocialSnapshot> = {}, extra: Record<string, unknown> = {}) {
        const friends = [person('76561198000000003', 'offline'), person('76561198000000002', 'online'), person(id, 'ingame')];
        const snapshot: SocialSnapshot = { accountId: 'test', status: 'ready', canChat: true, friends: friends as SocialSnapshot['friends'], selectedId: id, enteredId: null, messages: [], more: false, loading: false, sending: false, draft: '', error: '', ...change };
        const social = { preview: vi.fn(), send: vi.fn(), retry: vi.fn(), setDraft: vi.fn(), reload: vi.fn() } as unknown as SocialService;
        const enter = vi.fn(), handoff = vi.fn(), armJoin = vi.fn();
        const nodes = tree(SocialContents({ snapshot, social, entered: !!snapshot.enteredId, enter, leave: vi.fn(), handoff, loadMore: vi.fn(), latest: vi.fn(), armJoin, ...extra }));
        return { nodes, enter, handoff, armJoin, action: (key: string) => nodes.find(n => n.props.id === key) };
    }
    it('lists friends in a game first, then online, then the rest, with the counts in the heading', () => {
        const v = view();
        const order = v.nodes.filter(n => typeof n.props.id === 'string' && n.props.id.startsWith('social:friend:')).map(n => n.props.id.slice(-1));
        expect(order).toEqual(['1', '2', '3']);
        expect(strings(v.nodes)).toContain('1 in game · 1 online');
        const heading = v.nodes.find(n => n.props.className === 'gg-menu-heading')!;
        expect(strings(tree(heading))).toBe('Social | 1 in game · 1 online');
        expect(strings(tree(v.nodes.find(n => n.props.className === 'gg-social-list-heading')!))).toBe('Friends');
    });
    it('previews the last messages read-only and enters on Write a message', () => {
        const v = view({ preview: { id, state: 'ready', messages: [{ id: 'p1', text: 'Example hello', timestamp: 1, own: false, state: 'received' }] } });
        expect(strings(v.nodes)).toContain('Example hello');
        expect(v.action('social:back')!.props.disabled).toBe(true); expect(v.action('social:send')).toBeUndefined();
        v.action('social:open')!.props.onAction(); expect(v.enter).toHaveBeenCalledWith(id);
        expect(strings(v.nodes)).toContain('Write a message…');
        v.action('social:native')!.props.onAction(); expect(v.handoff).toHaveBeenCalledWith({ kind: 'qam', tab: 'friends' });
    });
    it('says when there is no conversation yet', () => {
        expect(strings(view({ preview: { id, state: 'none', messages: [] } }).nodes)).toContain('No messages yet.');
    });
    it('offers Join game only when Steam would, and asks once first', () => {
        expect(view().action('social:join')).toBeUndefined();
        const url = `steam://rungame/1057090/${id}`;
        const joinable = (armed: boolean) => view({ friends: [person(id, 'ingame', { joinUrl: url })] as SocialSnapshot['friends'] }, { joinArmed: armed });
        const first = joinable(false); first.action('social:join')!.props.onAction();
        expect(first.armJoin).toHaveBeenCalled(); expect(first.handoff).not.toHaveBeenCalled();
        const armed = joinable(true); expect(strings(armed.nodes)).toContain('Press again to join');
        armed.action('social:join')!.props.onAction(); expect(armed.handoff).toHaveBeenCalledWith({ kind: 'join', url });
    });
});
