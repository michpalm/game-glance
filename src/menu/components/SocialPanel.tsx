import { Focusable, TextField } from '@decky/ui';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject, type UIEventHandler } from 'react';
import { LuArrowUpRight, LuSend, LuUser } from 'react-icons/lu';
import { FRIEND_COLOURS, friendRing } from '../../home/friends';
import { takeSteamFocus } from '../../home/steamFocus';
import type { NativeRequest } from '../steam/runtime';
import type { SocialFriend, SocialService, SocialSnapshot } from '../steam/social';
import { socialStyles } from '../socialStyles';
import { captureChatAnchor, restoreChatAnchor, type ChatScrollAnchor } from '../socialScroll';
import { MenuAction } from './MenuAction';

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
}

/** Stateless presentation; native operations are confined to explicit actions on the session. */
export function SocialContents({ snapshot, social, entered, enter, leave, handoff, loadMore, latest, atBottom = true, timelineRef, onScroll }: SocialContentsProps) {
    const friend = snapshot.friends.find(f => f.steamId === (entered ? snapshot.enteredId : snapshot.selectedId));
    const native = () => handoff(entered && snapshot.enteredId ? { kind: 'friend-chat', steamId: snapshot.enteredId } : { kind: 'qam', tab: 'friends' });
    const pending = snapshot.messages.some(m => m.own && m.state === 'pending');
    const statusText = snapshot.status === 'loading' ? 'Loading friends…' : snapshot.status === 'offline' ? 'Connect to Steam to see your friends.' : snapshot.status === 'unavailable' ? 'Friends are unavailable in this Steam session.' : 'No friends to show.';
    return <div className="gg-social">
        <style>{socialStyles}</style>
        <div className="gg-social-heading"><h2>Social</h2><MenuAction id="social:native" onAction={native}><LuArrowUpRight aria-hidden="true" />Open in Steam</MenuAction></div>
        <div className="gg-social-split">
            <div className="gg-social-friends">
                <div className="gg-social-list-heading"><span>Friends</span><span>{snapshot.friends.filter(f => f.state !== 'offline').length} online</span></div>
                <Focusable className="gg-social-friend-list" flow-children="column">
                    {snapshot.friends.map(f => <div key={f.steamId} onFocus={() => social.preview(f.steamId)} onMouseEnter={() => social.preview(f.steamId)}>
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
                        <div className="gg-social-input" data-gg-focus="social:compose"><TextField aria-label="Message" label="Message" value={snapshot.draft} disabled={snapshot.loading || !snapshot.canChat} onChange={event => social.setDraft(event.target.value)} /></div>
                        <MenuAction id="social:send" className="gg-social-send" disabled={snapshot.sending || snapshot.loading || pending || !snapshot.canChat || !snapshot.draft.trim()} onAction={() => { void social.send(); }}><LuSend aria-hidden="true" />{snapshot.sending ? 'Sending…' : 'Send'}</MenuAction>
                    </div>
                </> : friend && <div className="gg-social-preview"><p>{snapshot.canChat ? 'Open your conversation to see messages and chat.' : 'Embedded chat is unavailable. You can open Social in Steam.'}</p><MenuAction id="social:open" disabled={!snapshot.canChat || friend.blocked} onAction={() => enter(friend.steamId)}>Open conversation</MenuAction></div>}
            </div>
        </div>
    </div>;
}

export function SocialPanel(props: { social: SocialService; entered: boolean; enter(id: string): void; leave(): void; handoff(request: NativeRequest): void }) {
    const { social, entered } = props;
    const snapshot = useSyncExternalStore(social.subscribe, social.get);
    const timeline = useRef<HTMLDivElement>(null);
    const bottom = useRef(true);
    const historyAnchor = useRef<ChatScrollAnchor | null>(null);
    const focusedChat = useRef<string | null>(null);
    const [atBottom, setAtBottom] = useState(true);
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
        const input = timeline.current?.parentElement?.querySelector<HTMLInputElement>('[data-gg-focus="social:compose"] input');
        input?.focus({ preventScroll: true }); if (input) takeSteamFocus(input);
    }, [entered, snapshot.enteredId, snapshot.loading]);
    return <SocialContents {...props} snapshot={snapshot} atBottom={atBottom} timelineRef={timeline} onScroll={syncVisibility}
        loadMore={() => { const element = timeline.current; if (element) { bottom.current = false; historyAnchor.current = captureChatAnchor(element); } void social.loadMore(); }}
        latest={() => { bottom.current = true; social.latest(); }} />;
}
