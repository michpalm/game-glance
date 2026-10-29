import { Focusable, TextField } from '@decky/ui';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject, type UIEventHandler } from 'react';
import { LuArrowUpRight, LuGamepad2, LuSend, LuUser } from 'react-icons/lu';
import type { KeyboardSession } from '../keyboard/session';
import { FRIEND_COLOURS, friendRing } from '../../home/friends';
import { takeSteamFocus } from '../../home/steamFocus';
import type { NativeRequest } from '../steam/runtime';
import type { ChatMessage, SocialFriend, SocialService, SocialSnapshot } from '../steam/social';
import { socialStyles } from '../socialStyles';
import { captureChatAnchor, restoreChatAnchor, type ChatScrollAnchor } from '../socialScroll';
import { MenuAction } from './MenuAction';
import { MenuKeyboard, readSteamLayouts, type Layouts } from './MenuKeyboard';

function Avatar({ friend }: { friend: SocialFriend }) {
    const ring = friendRing(friend.state);
    const color = ring ? FRIEND_COLOURS[ring] : FRIEND_COLOURS.none;
    const url = friend.avatarUrl && /^https:\/\//i.test(friend.avatarUrl) ? friend.avatarUrl : null;
    return <span className="gg-social-avatar" style={{ borderColor: color, opacity: ring ? 1 : .6 }}>
        {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : <LuUser aria-hidden="true" />}
    </span>;
}
interface SocialContentsProps {
    snapshot: SocialSnapshot;
    social: SocialService;
    entered: boolean;
    enter(steamId: string): void;
    leave(): void;
    handoff(request: NativeRequest): void;
    loadMore(): void;
    latest(): void;
    atBottom?: boolean;
    timelineRef?: RefObject<HTMLDivElement | null>;
    onScroll?: UIEventHandler<HTMLDivElement>;
    joinArmed?: boolean;
    armJoin?(): void;
    /** With a session and layouts the field opens the menu keyboard, unless the current layout needs an input method. */
    keyboard?: KeyboardSession;
    layouts?: Layouts | null;
    field?(): HTMLElement | null;
}
const NO_SUBSCRIBE = () => () => {};
const RANK: Record<string, number> = { ingame: 0, online: 1 };
/** In a game first, then online, then everyone else; Steam's order within each group. */
const ordered = (friends: SocialFriend[]) => friends.map((f, i) => ({ f, i })).sort((a, b) => (RANK[a.f.state] ?? 2) - (RANK[b.f.state] ?? 2) || a.i - b.i).map(x => x.f);
const previewMessage = (message: ChatMessage) => <div key={message.id} className={`gg-social-message ${message.own ? 'gg-social-own' : ''}`}><div className="gg-social-bubble"><span>{message.rich ? 'Message with an attachment' : message.text}</span></div></div>;

/** The session our keyboard can serve: none when the current layout needs an input method (Steam's keyboard). */
const ownKeyboardFor = (keyboard: KeyboardSession | undefined, layouts: Layouts | null | undefined) => keyboard && layouts && !layouts.layouts[layouts.current]?.ime ? keyboard : null;
/** An open session with no keyboard to show (read on opening, the layout needs an input method) is closed: invisible,
 * it would swallow the next B. */
export function closeUnusableKeyboard(keyboard: KeyboardSession | undefined, layouts: Layouts | null | undefined): void {
    if (keyboard?.get().open && !ownKeyboardFor(keyboard, layouts)) keyboard.close();
}

/** Stateless presentation; native operations are confined to explicit actions on the session. */
export function SocialContents({ snapshot, social, entered, enter, leave, handoff, loadMore, latest, atBottom = true, timelineRef, onScroll, joinArmed = false, armJoin = () => {}, keyboard, layouts, field = () => null }: SocialContentsProps) {
    const friend = snapshot.friends.find(f => f.steamId === (entered ? snapshot.enteredId : snapshot.selectedId));
    const native = () => handoff(entered && snapshot.enteredId ? { kind: 'friend-chat', steamId: snapshot.enteredId } : { kind: 'qam', tab: 'friends' });
    const pending = snapshot.messages.some(m => m.own && m.state === 'pending');
    const sendDisabled = snapshot.sending || snapshot.loading || pending || !snapshot.canChat || !snapshot.draft.trim();
    const ownKeyboard = ownKeyboardFor(keyboard, layouts);
    const inGame = snapshot.friends.filter(f => f.state === 'ingame').length, online = snapshot.friends.filter(f => f.state !== 'offline' && f.state !== 'ingame').length;
    const counts = [inGame && `${inGame} in game`, online && `${online} online`].filter(Boolean).join(' · ') || 'Nobody online';
    // Steam's own chat and Join game sit beside the reply, one small pill each.
    const extras = friend && <>
        {friend.joinUrl && <MenuAction id="social:join" onAction={joinArmed ? () => handoff({ kind: 'join', url: friend.joinUrl! }) : armJoin}><LuGamepad2 aria-hidden="true" />{joinArmed ? 'Press again to join' : 'Join game'}</MenuAction>}
        <MenuAction id="social:native" onAction={native}><LuArrowUpRight aria-hidden="true" />Steam</MenuAction>
    </>;
    const preview = !entered && friend && snapshot.preview?.id === friend.steamId ? snapshot.preview : null;
    const statusText = snapshot.status === 'loading' ? 'Loading friends…' : snapshot.status === 'offline' ? 'Connect to Steam to see your friends.' : snapshot.status === 'unavailable' ? 'Friends are unavailable in this Steam session.' : 'No friends to show.';
    return <div className="gg-social">
        <style>{socialStyles}</style>
        <div className="gg-menu-heading"><h2>Social</h2><span>{counts}</span></div>
        <div className="gg-social-split">
            <div className="gg-social-friends">
                <div className="gg-social-list-heading"><span>Friends</span></div>
                <Focusable className="gg-social-friend-list" flow-children="column">
                    {ordered(snapshot.friends).map(f => <div key={f.steamId} onFocus={() => social.preview(f.steamId)} onMouseEnter={() => social.preview(f.steamId)}>
                        <MenuAction id={`social:friend:${f.steamId}`} className="gg-social-friend" selected={f.steamId === snapshot.selectedId} disabled={f.blocked} onAction={() => enter(f.steamId)}>
                            <Avatar friend={f} /><span className="gg-social-identity"><strong>{f.name || 'Steam friend'}</strong><small>{f.blocked ? 'Blocked' : f.sub}</small></span>
                        </MenuAction>
                    </div>)}
                    {!snapshot.friends.length && <p className="gg-social-empty">{statusText}</p>}
                </Focusable>
            </div>
            <div className="gg-social-conversation">
                {friend ? <div className="gg-social-chat-heading"><Avatar friend={friend} /><div className="gg-social-identity"><strong>{friend.name || 'Steam friend'}</strong><small>{friend.sub}</small></div><div className="gg-social-back-slot" inert={!entered} aria-hidden={!entered}><MenuAction id="social:back" disabled={!entered} onAction={leave}>Back</MenuAction></div></div> : <p className="gg-social-empty">Select a friend to open a conversation.</p>}
                {snapshot.error && <p className="gg-menu-error gg-social-error" role="alert">{snapshot.error}</p>}
                {entered && snapshot.enteredId ? <>
                    <Focusable ref={timelineRef} className="gg-social-timeline" flow-children="column" tabIndex={0} data-gg-focus="social:history" aria-label="Conversation history" onScroll={onScroll}>
                        {(snapshot.more || snapshot.error && !snapshot.messages.length) && <MenuAction id="social:older" disabled={snapshot.loading} onAction={snapshot.messages.length ? loadMore : () => { void social.reload(); }}>Load {snapshot.messages.length ? 'older messages' : 'conversation'}</MenuAction>}
                        {snapshot.loading && <p className="gg-social-empty" role="status">Loading conversation…</p>}
                        {!snapshot.loading && !snapshot.messages.length && !snapshot.error && <p className="gg-social-empty">No messages yet.</p>}
                        {snapshot.messages.map(message => <div key={message.id} data-gg-message={message.id} className={`gg-social-message ${message.own ? 'gg-social-own' : ''}`}>
                            <div className="gg-social-bubble">{message.rich ? <MenuAction id={`social:rich:${message.id}`} onAction={native}>View this message in Steam</MenuAction> : <span>{message.text}</span>}</div>
                            <small>{message.timestamp > 0 ? new Date(message.timestamp * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}{message.own && ` · ${message.state === 'pending' ? 'Sending…' : message.state === 'failed' ? 'Not sent' : 'Sent'}`}</small>
                            {message.state === 'failed' && <MenuAction id={`social:retry:${message.id}`} disabled={snapshot.sending || pending} onAction={() => { void social.retry(message.id); }}>Retry</MenuAction>}
                        </div>)}
                    </Focusable>
                    {(!atBottom || snapshot.newer) && <MenuAction id="social:latest" disabled={snapshot.loading} onAction={latest}>Latest messages ↓</MenuAction>}
                    <div className="gg-social-compose">
                        {ownKeyboard ? <div className="gg-social-input">
                            <MenuAction id="social:compose" className="gg-social-field" ariaLabel="Message" disabled={snapshot.loading || !snapshot.canChat} onAction={ownKeyboard.open}>{snapshot.draft || <span className="gg-social-placeholder">Message</span>}</MenuAction>
                        </div> : <div className="gg-social-input" data-gg-focus="social:compose"><TextField aria-label="Message" label="Message" value={snapshot.draft} disabled={snapshot.loading || !snapshot.canChat} onChange={event => social.setDraft(event.target.value)} /></div>}
                        <MenuAction id="social:send" className="gg-social-send" disabled={sendDisabled} onAction={() => { void social.send(); }}><LuSend aria-hidden="true" />{snapshot.sending ? 'Sending…' : 'Send'}</MenuAction>
                        {extras}
                    </div>
                    {ownKeyboard && layouts && <MenuKeyboard session={ownKeyboard} layouts={layouts} draft={snapshot.draft} setDraft={text => social.setDraft(text)} canSend={!sendDisabled} send={() => { void social.send(); }} field={field} />}
                </> : friend && <>
                    <div className="gg-social-preview" aria-label="Recent messages">
                        {!snapshot.canChat ? <p className="gg-social-empty">Embedded chat is unavailable. You can open Social in Steam.</p>
                            : preview?.state === 'loading' ? <p className="gg-social-empty" role="status">Loading conversation…</p>
                            : preview?.state === 'none' || preview?.state === 'ready' && !preview.messages.length ? <p className="gg-social-empty">No messages yet.</p>
                            : preview?.messages.map(previewMessage)}
                    </div>
                    <div className="gg-social-compose">
                        <MenuAction id="social:open" className="gg-social-write" disabled={!snapshot.canChat || friend.blocked} onAction={() => enter(friend.steamId)}>Write a message…</MenuAction>
                        {extras}
                    </div>
                </>}
            </div>
        </div>
    </div>;
}

export function SocialPanel(props: { social: SocialService; entered: boolean; enter(id: string): void; leave(): void; handoff(request: NativeRequest): void; keyboard?: KeyboardSession }) {
    const { social, entered, keyboard } = props;
    const snapshot = useSyncExternalStore(social.subscribe, social.get);
    const keyboardOpen = useSyncExternalStore(keyboard?.subscribe ?? NO_SUBSCRIBE, () => keyboard?.get().open ?? false);
    // Read on entering (the field depends on the current layout) and again on each opening of the keyboard, never per render.
    const openings = useRef(0), wasOpen = useRef(false);
    if (keyboardOpen && !wasOpen.current) openings.current++;
    wasOpen.current = keyboardOpen;
    const layouts = useMemo(() => entered && keyboard ? readSteamLayouts() : null, [entered, keyboard, openings.current]);
    useEffect(() => { closeUnusableKeyboard(keyboard, layouts); }, [keyboard, keyboardOpen, layouts]);
    const timeline = useRef<HTMLDivElement>(null);
    const field = () => timeline.current?.parentElement?.querySelector<HTMLElement>('.gg-social-input') ?? null;
    const bottom = useRef(true);
    const historyAnchor = useRef<ChatScrollAnchor | null>(null);
    const focusedChat = useRef<string | null>(null);
    const [atBottom, setAtBottom] = useState(true);
    const [joinArmed, setJoinArmed] = useState(false);
    const friendKey = entered ? snapshot.enteredId : snapshot.selectedId;
    useEffect(() => { setJoinArmed(false); }, [friendKey]);
    useEffect(() => {
        if (!joinArmed) return;
        const timer = setTimeout(() => setJoinArmed(false), 4000);
        return () => clearTimeout(timer);
    }, [joinArmed]);
    const syncVisibility = () => {
        const element = timeline.current;
        if (!element) { social.setVisibility(false, false); return; }
        bottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24;
        setAtBottom(bottom.current);
        const doc = element.ownerDocument;
        social.setVisibility(entered && doc.visibilityState !== 'hidden' && doc.hasFocus(), bottom.current);
    };
    useEffect(() => {
        if (!entered) social.leave();
        return () => social.setVisibility(false, false);
    }, [entered, social]);
    useEffect(() => {
        const doc = timeline.current?.ownerDocument;
        const view = doc?.defaultView;
        if (!doc || !view || !entered) return;
        doc.addEventListener('visibilitychange', syncVisibility);
        view.addEventListener('focus', syncVisibility);
        view.addEventListener('blur', syncVisibility);
        return () => { doc.removeEventListener('visibilitychange', syncVisibility); view.removeEventListener('focus', syncVisibility); view.removeEventListener('blur', syncVisibility); social.setVisibility(false, false); };
    }, [entered, snapshot.enteredId, social]);
    useLayoutEffect(() => {
        const element = timeline.current;
        if (!element || !entered) return;
        if (historyAnchor.current && snapshot.loading) { syncVisibility(); return; }
        if (historyAnchor.current) {
            restoreChatAnchor(element, historyAnchor.current);
            historyAnchor.current = null;
        } else if (bottom.current) element.scrollTop = element.scrollHeight;
        syncVisibility();
    }, [snapshot.messages, snapshot.loading, entered]);
    useLayoutEffect(() => {
        if (!entered) { focusedChat.current = null; bottom.current = true; historyAnchor.current = null; return; }
        if (!entered || !snapshot.enteredId || snapshot.loading) return;
        if (focusedChat.current === snapshot.enteredId) return;
        focusedChat.current = snapshot.enteredId; bottom.current = true; historyAnchor.current = null;
        const compose = timeline.current?.parentElement?.querySelector<HTMLElement>('[data-gg-focus="social:compose"]');
        const input = compose?.matches('button') ? compose : compose?.querySelector<HTMLInputElement>('input');
        input?.focus({ preventScroll: true }); if (input) takeSteamFocus(input);
    }, [entered, snapshot.enteredId, snapshot.loading]);
    return <SocialContents {...props} snapshot={snapshot} layouts={layouts} field={field} atBottom={atBottom} timelineRef={timeline} onScroll={syncVisibility} joinArmed={joinArmed} armJoin={() => setJoinArmed(true)}
        loadMore={() => { const element = timeline.current; if (element) { bottom.current = false; historyAnchor.current = captureChatAnchor(element); } void social.loadMore(); }}
        latest={() => { bottom.current = true; social.latest(); }} />;
}
