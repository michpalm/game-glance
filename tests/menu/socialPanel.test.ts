import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SocialContents } from '../../src/menu/components/SocialPanel';
import { defaultMenuState, reduceMenu } from '../../src/menu/model';
import { leaveSocialConversation } from '../../src/menu/navigation';
import type { SocialService, SocialSnapshot } from '../../src/menu/steam/social';

vi.mock('@decky/ui', () => ({ Focusable: 'div', TextField: 'input', DialogButton: 'button' }));
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
