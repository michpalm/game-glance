import { ConfirmModal, Focusable, showModal } from '@decky/ui';
import { CSSProperties, useRef } from 'react';
import { LOG_PREFIX } from '../constants';
import type { FeedItem } from './feedLayout';
import { openGame, openNews, openSteamUrl, openStorePage } from './homeNav';
import { tr } from '../i18n/steamText';

/** A and a touch can both arrive for one press; one action per press. */
const REPEAT_GUARD_MS = 1000;

/** Several urls as stacked backgrounds: the first that exists paints over the rest (missing files draw nothing). */
function backgrounds(list: string[]): CSSProperties {
    if (list.length === 0) return {};
    return { backgroundImage: list.map((u) => `url("${u.replace(/"/g, '%22')}")`).join(', ') };
}

function Avatar({ avatar }: { avatar: NonNullable<FeedItem['avatar']> }) {
    return (
        <div className="gh-avatar" aria-hidden="true">
            <span>{avatar.initial}</span>
            {avatar.url && <div className="gh-avatar-img" style={backgrounds([avatar.url])} />}
        </div>
    );
}

/**
 * Asks before joining a friend's game, with Steam's own confirm modal (@decky/ui's ConfirmModal is Steam's component;
 * focusButton "secondary" puts focus on Cancel, as Steam's own restart prompt does). Yes opens Steam's Join Game url.
 */
function confirmJoin(url: string, question: string, from: HTMLElement | null) {
    try {
        const props = {
            strTitle: tr('joinGame'),
            strDescription: question,
            strOKButtonText: tr('join'),
            strCancelButtonText: tr('cancel'),
            onOK: () => openSteamUrl(url),
            focusButton: 'secondary',
        };
        showModal(<ConfirmModal {...(props as object)} />, from?.ownerDocument?.defaultView ?? undefined);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: join confirm failed`, error);
    }
}

/**
 * One feed card: full art (or glass only), the bottom shade, an optional friend avatar, and the text block
 * (pill in the card's own game accent, title, sub line). Focus: the recents edge glow plus a 4px lift.
 * A opens `item.opens`: a game's page with the open transition (homeNav.openGame), expanding from this card with
 * its own art; a wishlist deal's store page or a news event without it (homeNav.openStorePage / openNews).
 */
export function FeedCard({ item, left, accent, preferred, onFocused, setRef }: {
    item: FeedItem;
    left: number;
    accent: string;
    preferred: boolean;
    onFocused(): void;
    setRef(el: HTMLDivElement | null): void;
}) {
    const last = useRef(0);
    const self = useRef<HTMLDivElement | null>(null);
    const press = () => {
        const now = Date.now();
        if (now - last.current < REPEAT_GUARD_MS) return;
        last.current = now;
        try {
            const target = item.opens;
            if (target?.kind === 'page') openGame(target.appId, self.current, item.art);
            else if (target?.kind === 'store') openStorePage(target.appId);
            else if (target?.kind === 'news') openNews(target.appId, target.gid);
            else if (target?.kind === 'join') confirmJoin(target.url, target.question, self.current);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: feed card failed`, error);
        }
    };
    const classes = ['gh-card'];
    if (item.featured) classes.push('gh-card-featured');
    if (item.row === 1) classes.push('gh-card-wide');
    if (item.fit) classes.push('gh-card-fitted');
    if (item.avatar?.inGame) classes.push('gh-card-ingame');
    if (item.avatar) classes.push(item.avatar.ring ? `gh-card-ring-${item.avatar.ring}` : 'gh-card-offline');
    return (
        <Focusable
            ref={(el: HTMLDivElement | null) => {
                self.current = el;
                setRef(el);
            }}
            className={classes.join(' ')}
            focusClassName="gh-card-focus"
            noFocusRing
            preferredFocus={preferred}
            style={{ left: `${left}px`, width: `${item.width}px`, '--gh-card-h': `${item.height}px`, '--gh-card-accent': accent } as CSSProperties}
            onFocus={onFocused}
            onGamepadFocus={onFocused}
            onActivate={press}
            onClick={press}
            role="button"
            aria-label={item.title}
        >
            {item.backdrop && (
                // Under the art: shows wherever the game art is missing or fails to load.
                <>
                    <div className={`gh-card-backdrop${item.backdrop.url ? '' : ' gh-card-backdrop-none'}`} style={item.backdrop.url ? backgrounds([item.backdrop.url]) : undefined} />
                    {item.backdrop.tone && <div className={`gh-card-tint gh-card-tint-${item.backdrop.tone}`} />}
                </>
            )}
            {item.art.length > 0 && <div className="gh-card-art" style={backgrounds(item.art)} />}
            {item.fit && (
                // News art shown whole: a blurred copy fills the card (and covers the hero art once it loads), the image
                // itself is fitted inside it, never cropped.
                <>
                    <div className="gh-card-fit-blur" style={backgrounds([item.fit])} />
                    <div className="gh-card-fit" style={backgrounds([item.fit])} />
                </>
            )}
            <div className="gh-card-shade" />
            {item.avatar && <Avatar avatar={item.avatar} />}
            {item.friends && item.friends.length > 0 && (
                <div className="gh-card-friends" aria-hidden="true">
                    {item.friends.map((f, i) => (
                        <div key={i} className="gh-card-friend">
                            <span>{f.initial}</span>
                            {f.url && <div className="gh-avatar-img" style={backgrounds([f.url])} />}
                        </div>
                    ))}
                    {(item.moreFriends ?? 0) > 0 && <div className="gh-card-friend gh-card-friend-more">+{item.moreFriends}</div>}
                </div>
            )}
            <div className="gh-card-text">
                {item.pill && <span className="gh-pill">{item.pill}</span>}
                <div className="gh-card-title">{item.title}</div>
                {item.sub && <div className="gh-card-sub">{item.sub}</div>}
            </div>
            <div className="gh-card-bar" />
        </Focusable>
    );
}
