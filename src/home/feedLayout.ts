/** Geometry and content of the feed sheet's card row (handoff "Feed sheet", "Card types"). Pure. */
import { FriendCard, friendRing } from './friends';
import { joinQuestion } from './join';
import { LEGEND_FALLBACK } from './legend';
import type { NewsCard } from './news';
import type { RecommendedCard } from './playNext';
import type { DealCard } from './recommended';
import type { UpdatedCard } from './recentlyUpdated';
import type { TrendingCard } from './trending';

export type FeedTab = 'news' | 'friends' | 'recommended';

/** Gap between cards. */
export const FEED_GAP = 14;
/** The row's visible width is the canvas width minus 44 px on each side. */
export const FEED_VIEWPORT_INSET = 88;
/** Card height; the recommended card is portrait at 0.72 of it. */
export const FEED_CARD_H = 260;

const WIDTH: Record<FeedTab, number> = { news: 320, friends: 230, recommended: Math.round(FEED_CARD_H * 0.72) };
const FEATURED_W = 600;

/** Width of one card: featured news 600, news 320, friend 230, recommended 187. */
export function feedCardWidth(tab: FeedTab, featured: boolean): number {
    return tab === 'news' && featured ? FEATURED_W : WIDTH[tab];
}

/** Top of the card rows while the sheet is raised (tabs at 260 + 56), in logical px from the screen top. */
export const FEED_TOP_RAISED = 316;
/** Steam's legend reserve under the sheet, and the room kept above it. */
const BOTTOM_ROOM = 12;
/** Two rows: the first row's height, the gap, the second row's small header line. */
export const FEED_ROW1_H = 270;
export const FEED_ROW_GAP = 14;
export const FEED_ROW2_HEADER = 24;
/** The second row never grows past this, so it always stays shorter than row 1 (Ally/TV 128, Deck 118). */
export const FEED_ROW2_MAX_H = 128;
/** The second row's smallest height, and how far row 1 may shrink (from 270/260) to keep it when the legend is tall. */
export const FEED_ROW2_MIN_H = 80;
export const FEED_ROW1_MIN_H = 230;
/** The second row's cards are landscape at the library header's aspect. */
export const FEED_WIDE_ASPECT = 460 / 215;

/** Height the raised sheet's rows may use on a canvas `logicalHeight` tall (316 to 12 above the legend reserve). */
export function feedSpace(logicalHeight: number, legendReserve: number = LEGEND_FALLBACK, raiseDelta = 0): number {
    const h = Number.isFinite(logicalHeight) ? logicalHeight : 800;
    const legend = Number.isFinite(legendReserve) ? legendReserve : LEGEND_FALLBACK;
    return Math.max(FEED_CARD_H, Math.floor(h - legend - BOTTOM_ROOM - (FEED_TOP_RAISED - (Number.isFinite(raiseDelta) ? raiseDelta : 0))));
}

export interface FeedRows {
    /** First row's card height. */
    row1: number;
    /** Second row's card height; 0 = no second row. */
    row2: number;
    /** Second row's top, from the first row's top (the header line sits just above it). */
    row2Top: number;
    /** Everything the rows take, from the first row's top. */
    total: number;
}

/**
 * The rows of a tab. Row 1: Friends at the handoff's 260, What's new and Recommended at 270, always (the
 * same cards whether or not a second row exists; without one the rest of the sheet stays empty, showing the hero);
 * a second row sits under its header line and takes the room left, at most FEED_ROW2_MAX_H, so it is always shorter
 * than row 1.
 */
export function feedRows(tab: FeedTab, space: number, secondRow: boolean): FeedRows {
    const room = Math.max(FEED_CARD_H, Math.floor(Number.isFinite(space) ? space : FEED_CARD_H));
    const row1Full = tab === 'friends' ? FEED_CARD_H : FEED_ROW1_H;
    if (!secondRow) return { row1: row1Full, row2: 0, row2Top: 0, total: row1Full };
    // Row 2 needs at least FEED_ROW2_MIN_H; when the room is short of that (a tall legend), row 1 gives up the
    // difference, down to FEED_ROW1_MIN_H. Below that the sheet is accepted as is (row 2 stays at its minimum).
    const lacking = row1Full + FEED_ROW_GAP + FEED_ROW2_HEADER + FEED_ROW2_MIN_H - room;
    const row1 = lacking > 0 ? Math.max(FEED_ROW1_MIN_H, row1Full - lacking) : row1Full;
    const row2Top = row1 + FEED_ROW_GAP + FEED_ROW2_HEADER;
    const row2 = Math.min(FEED_ROW2_MAX_H, Math.max(FEED_ROW2_MIN_H, room - row2Top));
    return { row1, row2, row2Top, total: row2Top + row2 };
}

/** A row-1 card's width at height `h`: the handoff widths (at 260) scaled with the height; friends stay 230. */
export function feedCardWidthAt(tab: FeedTab, featured: boolean, h: number): number {
    const base = feedCardWidth(tab, featured);
    if (tab === 'friends') return base;
    return Math.round((base * h) / FEED_CARD_H);
}

/**
 * Where card `flat` (its index in feedItems' list: row 1's cards, then row 2's) sits: its row and index in the row.
 * The focus restore uses it to land on the remembered card in the right row. Out of range: clamped into the list.
 */
export function rowPosition(row1Count: number, row2Count: number, flat: number): { row: 0 | 1; index: number } {
    const n1 = Math.max(0, Math.floor(row1Count) || 0);
    const n2 = Math.max(0, Math.floor(row2Count) || 0);
    const at = Number.isFinite(flat) ? Math.min(Math.max(0, Math.floor(flat)), Math.max(0, n1 + n2 - 1)) : 0;
    return at < n1 || n2 === 0 ? { row: 0, index: Math.min(at, Math.max(0, n1 - 1)) } : { row: 1, index: at - n1 };
}

/** A second-row (wide) card's width at height `h`. */
export function wideCardWidth(h: number): number {
    return Math.round(h * FEED_WIDE_ASPECT);
}

/**
 * Whether a tab or card claims Steam's preferred focus. Only once the sheet has been entered in this mount:
 * while lowered and invisible it must not compete with the recents capsule Home opens on. Then only the
 * selected index.
 */
export function claimsPreferredFocus(entered: boolean, index: number, selected: number): boolean {
    return entered && index === selected;
}

const size = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * How far the row scrolls (a distance >= 0; the track translates by its negative) so the focused card sits at
 * the left edge, clamped so the last card ends at the viewport's right edge and never beyond. 0 when everything
 * fits. The index is rounded and clamped; broken widths, gap or viewport count as 0.
 */
export function feedScroll(index: number, widths: number[], gap: number, viewport: number): number {
    const n = widths.length;
    if (n === 0) return 0;
    const at = Number.isFinite(index) ? Math.min(n - 1, Math.max(0, Math.round(index))) : 0;
    const g = size(gap);
    let left = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
        if (i === at) left = total;
        total += size(widths[i]) + (i < n - 1 ? g : 0);
    }
    return Math.min(left, Math.max(0, total - size(viewport)));
}

/**
 * What A on a card opens: a game's page (with the open transition), the store page of a game on sale, or one
 * news event. No open transition for the store and news.
 */
export type FeedOpen =
    | { kind: 'page'; appId: number }
    /** Join a friend's game: Steam's own Join Game url, after a confirm ("Join Alex in Halo?"). */
    | { kind: 'join'; appId: number; url: string; question: string }
    | { kind: 'store'; appId: number }
    | { kind: 'news'; appId: number; gid: string };

/** One card as the feed draws it. */
export interface FeedItem {
    key: string;
    /** 0: the first row; 1: the second (small, wide cards). */
    row: 0 | 1;
    width: number;
    height: number;
    /** The featured news card (600 wide, 26px title). */
    featured: boolean;
    /** Background art, stacked: the first url that loads paints over the rest. Empty = glass only. */
    art: string[];
    /** Empty = no pill. */
    pill: string;
    title: string;
    sub: string;
    /** The game whose accent colours the pill (and a friend's ring); null = no game. */
    accentAppId: number | null;
    /** What A opens; null = A does nothing. */
    opens: FeedOpen | null;
    /** A friend's avatar: `ring` green online or in game, blue away, null offline (no ring, dimmed). */
    avatar: { url: string | null; initial: string; inGame: boolean; ring: 'online' | 'away' | null } | null;
    /**
     * A friend card with no game art: its placeholder backdrop, the friend's avatar blurred (url null: a soft accent
     * gradient), tinted faintly by presence. Never flat black.
     */
    backdrop?: { url: string | null; tone: 'online' | 'away' | null };
    /** Small avatars of friends who play the game (trending cards), and how many more ("+N"). */
    friends?: Array<{ url: string | null; initial: string }>;
    moreFriends?: number;
}

export interface FeedData {
    news: NewsCard[];
    /** What's new, second row: games updated on this device recently; missing = none. */
    updated?: UpdatedCard[];
    /** Recommended, second row: wishlist sales (only with the setting on); missing = none. */
    deals?: DealCard[];
    /** Friends, second row: games friends are playing or played recently; missing = none. */
    trending?: TrendingCard[];
    friends: FriendCard[];
    recommended: RecommendedCard[];
    /** Friends online now (the Friends tab badge); missing = 0. */
    friendsOnline?: number;
}

/**
 * A game's art: `hero` = artwork.heroUrls (custom hero, hero, header, capsule), `capsule` = artwork.capsuleUrls,
 * `wide` = local landscape art (custom wide art, the library header), `store` = the store's header on Steam's CDN for
 * games not in the library. Background layers all load, so `store` is used only when nothing local exists.
 */
export type FeedArt = (appId: number) => { hero: string[]; capsule: string[]; wide?: string[]; store?: string[] };

/** Wide art for a second-row card: local landscape art, else (and only then) the store header. */
function wideArt(a: ReturnType<FeedArt>): string[] {
    if (a.wide && a.wide.length > 0) return a.wide;
    return a.store ?? [];
}

function initial(name: string): string {
    return Array.from(name.trim())[0] ?? '?';
}

/** Whether a tab has a second row now: What's new with recently updated games, Friends with trending games, Recommended with wishlist sales. */
export function hasSecondRow(tab: FeedTab, data: FeedData): boolean {
    if (tab === 'news') return (data.updated?.length ?? 0) > 0;
    if (tab === 'friends') return (data.trending?.length ?? 0) > 0;
    return (data.deals?.length ?? 0) > 0;
}

/** The second row's small header for a tab. */
export function secondRowTitle(tab: FeedTab): string {
    return tab === 'news' ? 'Recently updated' : tab === 'recommended' ? 'On sale from your wishlist' : 'Trending among friends';
}

/**
 * The selected tab's cards, row 1 first, then row 2 (`row` says which). News: the event's own art, then the game's
 * hero art; row 2: recently updated games, wide, with their update line, opening the game's page. Friends: the
 * capsule of the game being played, else of the last played game (when its name is known), else glass only.
 * Recommended: the portrait capsule; row 2: wishlist sales, wide, with the discount and price. A opens a news card's event (its game page when it has no gid), a wishlist
 * deal's store page, a play-next or updated game's page; nothing on a friend. `space`: the height the raised
 * sheet's rows may use (feedSpace); sizes follow feedRows.
 */
export function feedItems(tab: FeedTab, data: FeedData, art: FeedArt, space = FEED_CARD_H): FeedItem[] {
    // Every card has a placeholder under its art (a soft accent gradient; a friend keeps their avatar backdrop), so a
    // game with no art, or art that fails to load (tools such as Steamworks Common Redistributables), is never a dark box.
    return feedItemsRaw(tab, data, art, space).map((item) => (item.backdrop ? item : { ...item, backdrop: { url: null, tone: null } }));
}

function feedItemsRaw(tab: FeedTab, data: FeedData, art: FeedArt, space: number): FeedItem[] {
    const rows = feedRows(tab, space, hasSecondRow(tab, data));
    if (tab === 'news') {
        const news: FeedItem[] = data.news.map((c) => ({
            key: `news-${c.gid || c.appId}`,
            row: 0,
            width: feedCardWidthAt('news', c.featured, rows.row1),
            height: rows.row1,
            featured: c.featured,
            art: [...(c.imageUrl ? [c.imageUrl] : []), ...art(c.appId).hero],
            pill: c.pill,
            title: c.title,
            sub: c.sub,
            accentAppId: c.appId,
            opens: c.gid ? { kind: 'news', appId: c.appId, gid: c.gid } : { kind: 'page', appId: c.appId },
            avatar: null,
        }));
        const updated: FeedItem[] = rows.row2 > 0 ? (data.updated ?? []).map((c) => ({
            key: `updated-${c.appId}`,
            row: 1,
            width: wideCardWidth(rows.row2),
            height: rows.row2,
            featured: false,
            art: art(c.appId).hero,
            pill: '',
            title: c.name,
            sub: c.size ? `${c.label} - ${c.size}` : c.label,
            accentAppId: c.appId,
            opens: { kind: 'page', appId: c.appId },
            avatar: null,
        })) : [];
        return [...news, ...updated];
    }
    if (tab === 'friends') {
        const cards: FeedItem[] = data.friends.map((c) => {
            const inGame = c.state === 'ingame' && c.appId !== null;
            const artId = inGame ? c.appId : c.lastAppId ?? null;
            return {
                key: `friend-${c.steamId}`,
                row: 0,
                width: feedCardWidth('friends', false),
                height: rows.row1,
                featured: false,
                art: artId !== null && artId > 0 ? art(artId).capsule : [],
                backdrop: { url: c.avatarUrl, tone: friendRing(c.state) },
                pill: inGame ? (c.joinUrl ? 'Join' : 'In game') : '',
                title: c.name,
                sub: c.sub,
                accentAppId: inGame ? c.appId : null,
                // A: join a joinable friend (after a confirm); else open the game they play (its page when owned, else
                // the store page); nothing for a friend not in a game.
                opens: !inGame || c.appId === null ? null
                    : c.joinUrl ? { kind: 'join', appId: c.appId, url: c.joinUrl, question: joinQuestion(c.name, c.game) }
                        : c.gameInLibrary ? { kind: 'page', appId: c.appId } : { kind: 'store', appId: c.appId },
                avatar: { url: c.avatarUrl, initial: initial(c.name), inGame, ring: friendRing(c.state) },
            };
        });
        // Trending: small wide cards under the friends (tag, friends' avatars, the line); A opens the game page when it is
        // in the library, else the store page. Art: local for owned games, Steam's store header otherwise.
        const trending: FeedItem[] = rows.row2 > 0 ? (data.trending ?? []).map((c) => ({
            key: `trend-${c.appId}`,
            row: 1,
            width: wideCardWidth(rows.row2),
            height: rows.row2,
            featured: false,
            art: c.inLibrary ? (art(c.appId).wide?.length ? art(c.appId).wide! : art(c.appId).hero) : c.storeArt ? [c.storeArt] : wideArt(art(c.appId)),
            pill: c.tag,
            title: c.name,
            sub: c.label,
            accentAppId: c.inLibrary ? c.appId : null,
            opens: c.inLibrary ? { kind: 'page', appId: c.appId } : { kind: 'store', appId: c.appId },
            avatar: null,
            friends: c.avatars,
            moreFriends: c.moreFriends,
        })) : [];
        return [...cards, ...trending];
    }
    const playNext: FeedItem[] = data.recommended.map((c) => ({
        key: `recommended-${c.appId}`,
        row: 0,
        width: feedCardWidthAt('recommended', false, rows.row1),
        height: rows.row1,
        featured: false,
        art: art(c.appId).capsule,
        pill: c.pill,
        title: c.name,
        sub: c.sub,
        accentAppId: c.appId,
        opens: c.pillKey === 'sale' ? { kind: 'store', appId: c.appId } : { kind: 'page', appId: c.appId },
        avatar: null,
    }));
    // Wishlist sales: smaller, wide cards under Play next, biggest discount first (recommended.dealCards); A opens the store page.
    const deals: FeedItem[] = rows.row2 > 0 ? (data.deals ?? []).map((c) => {
        const a = art(c.appId);
        return {
            key: `deal-${c.appId}`,
            row: 1,
            width: wideCardWidth(rows.row2),
            height: rows.row2,
            featured: false,
            art: wideArt(a),
            pill: c.pill,
            title: c.name,
            sub: c.sub,
            accentAppId: c.appId,
            opens: { kind: 'store', appId: c.appId },
            avatar: null,
        };
    }) : [];
    return [...playNext, ...deals];
}
