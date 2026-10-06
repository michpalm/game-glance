import { describe, expect, it } from 'vitest';
import {
    claimsPreferredFocus, FEED_GAP, FEED_TOP_RAISED, FEED_VIEWPORT_INSET, feedCardWidth, feedCardWidthAt, feedItems, feedRows, feedScroll, feedSpace, hasSecondRow, rowPosition, secondRowTitle, wideCardWidth,
} from '../../src/home/feedLayout';

// Handoff: featured news 600, news 320, friend 230, recommended 187; gap 14; viewport 1440 - 2 x 44 = 1352.
const VIEW = 1352;
const NEWS = [600, 320, 320, 320, 320, 320];
const FRIENDS = new Array(10).fill(230);
const RECOMMENDED = new Array(6).fill(187);

describe('feedScroll', () => {
    it('feedScroll puts the focused card at the left edge', () => {
        // Friends: 10 x 230 + 9 x 14 = 2426 wide, so up to 1074 of scroll.
        expect(feedScroll(0, FRIENDS, 14, VIEW)).toBe(0);
        expect(feedScroll(1, FRIENDS, 14, VIEW)).toBe(244);
        expect(feedScroll(2, FRIENDS, 14, VIEW)).toBe(488);
        // News: the featured card is 600 wide, so the second card starts at 614.
        expect(feedScroll(1, NEWS, 14, VIEW)).toBe(614);
    });

    it('feedScroll clamps at the end so the last card ends at the viewport edge', () => {
        // News: 600 + 5 x 320 + 5 x 14 = 2270 wide; 2270 - 1352 = 918.
        expect(feedScroll(2, NEWS, 14, VIEW)).toBe(918);
        expect(feedScroll(5, NEWS, 14, VIEW)).toBe(918);
        // Friends: 2426 - 1352 = 1074; card 5 would start at 1220.
        expect(feedScroll(5, FRIENDS, 14, VIEW)).toBe(1074);
        expect(feedScroll(9, FRIENDS, 14, VIEW)).toBe(1074);
    });

    it('feedScroll is 0 when everything fits', () => {
        // Recommended: 6 x 187 + 5 x 14 = 1192 <= 1352.
        for (let i = 0; i < RECOMMENDED.length; i++) expect(feedScroll(i, RECOMMENDED, 14, VIEW)).toBe(0);
        // Exactly the viewport wide still fits.
        expect(feedScroll(1, [669, 669], 14, VIEW)).toBe(0);
    });

    it('feedScroll is 0 with no cards', () => {
        expect(feedScroll(0, [], 14, VIEW)).toBe(0);
        expect(feedScroll(3, [], 14, VIEW)).toBe(0);
    });

    it('feedScroll clamps an out-of-range or non-finite index', () => {
        expect(feedScroll(99, NEWS, 14, VIEW)).toBe(918);
        expect(feedScroll(-3, NEWS, 14, VIEW)).toBe(0);
        expect(feedScroll(Number.NaN, NEWS, 14, VIEW)).toBe(0);
        expect(feedScroll(1.6, FRIENDS, 14, VIEW)).toBe(488);
    });

    it('feedScroll never returns NaN or a negative value for bad input', () => {
        const bad = [
            feedScroll(1, [Number.NaN, 320, -50], 14, VIEW),
            feedScroll(1, NEWS, Number.NaN, VIEW),
            feedScroll(1, NEWS, -20, VIEW),
            feedScroll(1, NEWS, 14, Number.NaN),
            feedScroll(1, NEWS, 14, -100),
        ];
        for (const value of bad) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
        }
        // A broken width counts as 0 wide; a negative gap as 0.
        expect(feedScroll(2, [Number.NaN, 320, 320], 14, 100)).toBe(348);
        expect(feedScroll(1, NEWS, -20, VIEW)).toBe(600);
    });
});

describe('feedCardWidth', () => {
    it('uses the handoff widths per card type', () => {
        expect(feedCardWidth('news', true)).toBe(462);
        expect(feedCardWidth('news', false)).toBe(320);
        expect(feedCardWidth('friends', false)).toBe(230);
        expect(feedCardWidth('recommended', false)).toBe(187);
        expect(FEED_GAP).toBe(14);
        expect(FEED_VIEWPORT_INSET).toBe(88);
    });
});

describe('feedItems', () => {
    const art = (appId: number) => ({ hero: [`hero-${appId}`], capsule: [`cap-${appId}`] });
    const data = {
        news: [
            { gid: '1', appId: 10, title: 'Big update', pill: 'Major update', pillKey: 'major' as const, sub: 'GAME 10 - TODAY', featured: true, imageUrl: 'https://event/1.png' },
            { gid: '2', appId: 11, title: 'Patch', pill: 'News', pillKey: 'news' as const, sub: 'GAME 11', featured: false, imageUrl: null },
        ],
        friends: [
            { steamId: 'f1', name: 'friend one', avatarUrl: 'https://avatar/1.jpg', state: 'ingame' as const, appId: 20, lastAppId: null, sub: 'Playing Game 20', game: 'Game 20', gameInLibrary: true, joinUrl: null },
            { steamId: 'f2', name: 'Friend Two', avatarUrl: null, state: 'offline' as const, appId: null, lastAppId: null, sub: 'Last online 2 days ago' },
        ],
        recommended: [{ appId: 30, name: 'Game 30', pill: 'Not started', pillKey: 'notStarted' as const, sub: '' }],
    };

    it('maps news: featured 480 (16:9 at row 1\'s 270, the event art\'s shape) then 332 (the handoff 320 at 270), event art fitted over the hero, opens the news update', () => {
        const items = feedItems('news', data, art);
        expect(items.map((i) => i.width)).toEqual([480, 332]);
        expect(items.map((i) => i.featured)).toEqual([true, false]);
        expect(items[0].art).toEqual(['hero-10']);
        expect(items[0].fit).toBe('https://event/1.png');
        expect(items[1].art).toEqual(['hero-11']);
        expect(items[1]).not.toHaveProperty('fit');
        expect(items[0]).toMatchObject({ pill: 'Major update', title: 'Big update', sub: 'GAME 10 - TODAY', accentAppId: 10, avatar: null });
        expect(items[0].opens).toEqual({ kind: 'news', appId: 10, gid: '1' });
        expect(items[1].opens).toEqual({ kind: 'news', appId: 11, gid: '2' });
    });

    it('maps friends: 230 wide, art and pill only in game, avatar ring in game', () => {
        const [inGame, offline] = feedItems('friends', data, art);
        expect([inGame.width, offline.width]).toEqual([230, 230]);
        // In a game that cannot be joined: A opens that game's page (owned).
        expect(inGame).toMatchObject({ pill: 'In game', title: 'friend one', sub: 'Playing Game 20', art: ['cap-20'], accentAppId: 20, opens: { kind: 'page', appId: 20 } });
        expect(offline.opens).toBeNull();
        expect(inGame.avatar).toEqual({ url: 'https://avatar/1.jpg', initial: 'f', inGame: true, ring: 'online' });
        expect(offline).toMatchObject({ pill: '', art: [], accentAppId: null, sub: 'Last online 2 days ago' });
        expect(offline.avatar).toEqual({ url: null, initial: 'F', inGame: false, ring: null });
    });

    it('maps recommended: 194 x 270 portrait (the handoff 187 at row 1\'s 270) with capsule art, opens the game', () => {
        expect(feedItems('recommended', data, art)).toEqual([{
            key: 'recommended-30', row: 0, width: 194, height: 270, featured: false, art: ['cap-30'], pill: 'Not started', title: 'Game 30', sub: '',
            accentAppId: 30, opens: { kind: 'page', appId: 30 }, avatar: null, backdrop: { url: null, tone: null },
        }]);
    });

    it('a news card without a gid opens the game page instead', () => {
        const news = [{ ...data.news[1], gid: '' }];
        expect(feedItems('news', { ...data, news }, art)[0].opens).toEqual({ kind: 'page', appId: 11 });
    });

    it('a wishlist deal opens its store page; play-next cards keep the game page', () => {
        const recommended = [
            { appId: 40, name: 'Deal', pill: 'On sale -50%', pillKey: 'sale' as const, sub: 'On your wishlist' },
            { appId: 41, name: 'Short', pill: 'Short game', pillKey: 'short' as const, sub: '' },
            { appId: 42, name: 'Next', pill: 'Play next', pillKey: 'playNext' as const, sub: '' },
        ];
        expect(feedItems('recommended', { ...data, recommended }, art).map((i) => i.opens)).toEqual([
            { kind: 'store', appId: 40 },
            { kind: 'page', appId: 41 },
            { kind: 'page', appId: 42 },
        ]);
    });

    it('every friend card carries its placeholder backdrop: the avatar and the presence tone (none offline)', () => {
        const [inGame, offline] = feedItems('friends', data, art);
        expect(inGame.backdrop).toEqual({ url: 'https://avatar/1.jpg', tone: 'online' });
        expect(offline.backdrop).toEqual({ url: null, tone: null });
    });

    it('a joinable friend: Join tag, A asks to join with Steam\'s url; a game not owned opens its store page', () => {
        const join = { ...data.friends[0], joinUrl: 'steam://rungame/20/7656' };
        const [card] = feedItems('friends', { ...data, friends: [join] }, art);
        expect(card).toMatchObject({ pill: 'Join', opens: { kind: 'join', appId: 20, url: 'steam://rungame/20/7656', question: 'Join friend one in Game 20?' } });
        const store = { ...data.friends[0], gameInLibrary: false };
        expect(feedItems('friends', { ...data, friends: [store] }, art)[0].opens).toEqual({ kind: 'store', appId: 20 });
    });

    it('a friend with a last played library game shows its art, without pill or accent ring', () => {
        const friends = [{ steamId: 'f3', name: 'Friend Three', avatarUrl: null, state: 'online' as const, appId: null, lastAppId: 25, sub: 'Last played Game 25' }];
        const [card] = feedItems('friends', { ...data, friends }, art);
        expect(card).toMatchObject({ pill: '', art: ['cap-25'], accentAppId: null, sub: 'Last played Game 25', opens: null });
        expect(card.avatar).toEqual({ url: null, initial: 'F', inGame: false, ring: 'online' });
    });

    it('an away friend: blue ring, and the last played game\'s art and line', () => {
        const friends = [{ steamId: 'f4', name: 'Friend Four', avatarUrl: null, state: 'away' as const, appId: null, lastAppId: 26, sub: 'Last played Game 26' }];
        const [card] = feedItems('friends', { ...data, friends }, art);
        expect(card).toMatchObject({ art: ['cap-26'], sub: 'Last played Game 26', pill: '' });
        expect(card.avatar?.ring).toBe('away');
    });

    it('is empty for a tab with no cards', () => {
        expect(feedItems('friends', { ...data, friends: [] }, art)).toEqual([]);
    });
});

describe('claimsPreferredFocus', () => {
    it('never claims before the sheet has been entered', () => {
        expect(claimsPreferredFocus(false, 0, 0)).toBe(false);
        expect(claimsPreferredFocus(false, 2, 2)).toBe(false);
    });
    it('claims only the selected index once entered', () => {
        expect(claimsPreferredFocus(true, 0, 0)).toBe(true);
        expect(claimsPreferredFocus(true, 2, 2)).toBe(true);
    });
    it('does not claim a non-selected index even when entered', () => {
        expect(claimsPreferredFocus(true, 1, 0)).toBe(false);
        expect(claimsPreferredFocus(true, 0, 2)).toBe(false);
    });
});

describe('feed rows (raised sheet geometry)', () => {
    // Canvas heights: Deck 1280x800 -> 800; Ally handheld 828x466 -> 810.4; 1080p TV 1500x844.5 -> 810.75.
    const heights = { deck: 800, handheld: 466 / (828 / 1440), docked: 810.75 };
    it('the room under the raised tabs: from 316 to 12 above the 46 legend reserve', () => {
        expect(feedSpace(heights.deck)).toBe(426);
        expect(feedSpace(heights.handheld)).toBe(436);
        expect(feedSpace(heights.docked)).toBe(436);
        expect(feedSpace(NaN)).toBe(426);
    });
    it('two rows: row 1 is 270, row 2 takes the rest under its header (118 Deck, 128 Ally/TV), all above the legend', () => {
        for (const h of Object.values(heights)) {
            const rows = feedRows('news', feedSpace(h), true);
            expect(rows.row1).toBe(270);
            expect(rows.row2Top).toBe(270 + 14 + 24);
            expect(FEED_TOP_RAISED + rows.total).toBeLessThanOrEqual(h - 46);
        }
        expect(feedRows('news', feedSpace(heights.deck), true).row2).toBe(118);
        expect(feedRows('recommended', feedSpace(heights.docked), true).row2).toBe(128);
        expect(wideCardWidth(118)).toBe(252);
        expect(wideCardWidth(128)).toBe(274);
    });
    it('row 1 never grows: 270 with or without a second row (the rest of the sheet stays empty); friends stay at 260', () => {
        for (const space of [426, 436, 900]) {
            expect(feedRows('news', space, false)).toEqual({ row1: 270, row2: 0, row2Top: 0, total: 270 });
            expect(feedRows('recommended', space, false)).toEqual({ row1: 270, row2: 0, row2Top: 0, total: 270 });
            expect(feedRows('recommended', space, true).row1).toBe(270);
        }
        expect(feedRows('friends', 436, false)).toEqual({ row1: 260, row2: 0, row2Top: 0, total: 260 });
        expect(feedCardWidthAt('news', true, 270)).toBe(480);
        expect(feedCardWidthAt('news', true, 230)).toBe(409);
        expect(feedCardWidthAt('news', false, 270)).toBe(332);
        expect(feedCardWidthAt('recommended', false, 270)).toBe(194);
        expect(feedCardWidthAt('friends', false, 360)).toBe(230);
    });
    it('the second row is always shorter than row 1, on every screen (even a tall 4:3 canvas of 960)', () => {
        for (const h of [800, 466 / (828 / 1440), 810.75, 960, 2000]) {
            const rows = feedRows('recommended', feedSpace(h), true);
            expect(rows.row2).toBeGreaterThan(0);
            expect(rows.row2).toBeLessThan(rows.row1);
            expect(rows.row2).toBeLessThanOrEqual(128);
        }
    });
});

describe('What\'s new second row', () => {
    const art = (appId: number) => ({ hero: [`hero-${appId}`], capsule: [`cap-${appId}`] });
    const base = { news: [{ gid: '1', appId: 10, title: 'Big', pill: 'News', pillKey: 'news' as const, sub: 'S', featured: true, imageUrl: null }], friends: [], recommended: [] };
    it('recently updated games become wide row-2 cards that open the game page; row 1 is 270 then', () => {
        const data = { ...base, updated: [{ appId: 50, name: 'Updated Game', rtLastUpdated: 1, label: 'Updated today' }] };
        expect(hasSecondRow('news', data)).toBe(true);
        const items = feedItems('news', data, art, 426);
        expect(items.map((i) => [i.key, i.row, i.height, i.width])).toEqual([['news-1', 0, 270, 480], ['updated-50', 1, 118, 252]]);
        expect(items[1]).toMatchObject({ art: ['hero-50'], title: 'Updated Game', sub: 'Updated today', pill: '', opens: { kind: 'page', appId: 50 }, accentAppId: 50 });
    });
    it('Steam\'s recently completed cards show the update line and the size, as stock', () => {
        const data = { ...base, updated: [{ appId: 51, name: 'Cryptmaster', rtLastUpdated: 1, label: 'Updated Today at 11:22 AM', size: '1.7 GB' }] };
        expect(feedItems('news', data, art, 426)[1].sub).toBe('Updated Today at 11:22 AM - 1.7 GB');
    });
    it('without updated games there is no second row; the news cards keep their 270 size', () => {
        expect(hasSecondRow('news', base)).toBe(false);
        const items = feedItems('news', { ...base, updated: [] }, art, 426);
        expect(items.map((i) => [i.row, i.height, i.width])).toEqual([[0, 270, 480]]);
    });
});

describe('Recommended second row: wishlist sales', () => {
    const art = (appId: number) => ({ hero: [`hero-${appId}`], capsule: [`cap-${appId}`], wide: [`wide-${appId}`] });
    const play = [{ appId: 30, name: 'Game 30', pill: 'Play next', pillKey: 'playNext' as const, sub: '' }];
    const deals = [
        { appId: 70, name: 'Big Sale', pill: '-75%', sub: '$4.99 - was $19.99' },
        { appId: 71, name: 'Small Sale', pill: '-20%', sub: 'On your wishlist' },
    ];
    it('wide row-2 deal cards under Play next (row 1 at 270), discount badge and price, opening the store page', () => {
        const data = { news: [], friends: [], recommended: play, deals };
        expect(hasSecondRow('recommended', data)).toBe(true);
        expect(secondRowTitle('recommended')).toBe('On sale from your wishlist');
        const items = feedItems('recommended', data, art, 436);
        expect(items.map((i) => [i.key, i.row, i.height, i.width])).toEqual([
            ['recommended-30', 0, 270, 194],
            ['deal-70', 1, 128, 274],
            ['deal-71', 1, 128, 274],
        ]);
        expect(items[1]).toMatchObject({ art: ['wide-70'], pill: '-75%', title: 'Big Sale', sub: '$4.99 - was $19.99', opens: { kind: 'store', appId: 70 } });
    });
    it('no deals (setting off, private wishlist or none): one row, Play next keeps its 270 size', () => {
        const items = feedItems('recommended', { news: [], friends: [], recommended: play, deals: [] }, art, 436);
        expect(items.map((i) => [i.row, i.height, i.width])).toEqual([[0, 270, 194]]);
    });
});

describe('rowPosition (focus restore across the two rows)', () => {
    it('maps a flat index to its row and place', () => {
        expect(rowPosition(3, 2, 0)).toEqual({ row: 0, index: 0 });
        expect(rowPosition(3, 2, 2)).toEqual({ row: 0, index: 2 });
        expect(rowPosition(3, 2, 3)).toEqual({ row: 1, index: 0 });
        expect(rowPosition(3, 2, 4)).toEqual({ row: 1, index: 1 });
    });
    it('clamps, and stays in row 1 without a second row', () => {
        expect(rowPosition(3, 2, 99)).toEqual({ row: 1, index: 1 });
        expect(rowPosition(3, 0, 5)).toEqual({ row: 0, index: 2 });
        expect(rowPosition(0, 0, 1)).toEqual({ row: 0, index: 0 });
        expect(rowPosition(3, 2, NaN)).toEqual({ row: 0, index: 0 });
    });
});

describe('Friends second row: trending amongst friends', () => {
    const art = (appId: number) => ({ hero: [`hero-${appId}`], capsule: [`cap-${appId}`], wide: appId === 81 ? [] : [`wide-${appId}`], store: [`store-${appId}`] });
    const friends = [{ steamId: 'f1', name: 'Friend One', avatarUrl: null, state: 'online' as const, appId: null, lastAppId: null, sub: 'Online' }];
    const trending = [
        { appId: 80, name: 'Owned Game', playing: 2, played: 0, label: '2 friends playing', inLibrary: true, avatars: [{ url: 'a.jpg', initial: 'A' }], moreFriends: 1, tag: 'In library', storeArt: null },
        { appId: 81, name: 'Store Game', playing: 0, played: 1, label: '1 friend played recently', inLibrary: false, avatars: [], moreFriends: 0, tag: '', storeArt: null },
        { appId: 82, name: 'Sale Game', playing: 0, played: 1, label: '1 friend plays - 3,99€ (was 19,99€)', inLibrary: false, avatars: [], moreFriends: 0, tag: '-80%', storeArt: 'https://cdn/82/header.jpg' },
    ];
    it('rows on every screen: friends stay 260; trending under its header is shorter (at most 128) and fits above the legend', () => {
        for (const h of [800, 810, 810.75, 960, 2000]) {
            const rows = feedRows('friends', feedSpace(h), true);
            expect(rows.row1).toBe(260);
            expect(rows.row2Top).toBe(260 + 14 + 24);
            expect(rows.row2).toBeLessThan(rows.row1);
            expect(rows.row2).toBeLessThanOrEqual(128);
            expect(FEED_TOP_RAISED + rows.total).toBeLessThanOrEqual(h - 46);
        }
        expect(feedRows('friends', feedSpace(800), true).row2).toBe(128);
    });
    it('trending cards: wide, the friends line, the game page when owned, else the store page with the store header only then', () => {
        const data = { news: [], recommended: [], friends, trending };
        expect(hasSecondRow('friends', data)).toBe(true);
        expect(secondRowTitle('friends')).toBe('Trending among friends');
        const items = feedItems('friends', data, art, 426);
        expect(items.map((i) => [i.key, i.row, i.height, i.width])).toEqual([['friend-f1', 0, 260, 230], ['trend-80', 1, 128, 274], ['trend-81', 1, 128, 274], ['trend-82', 1, 128, 274]]);
        expect(items[1]).toMatchObject({ art: ['wide-80'], title: 'Owned Game', pill: 'In library', sub: '2 friends playing', opens: { kind: 'page', appId: 80 }, accentAppId: 80, friends: [{ url: 'a.jpg', initial: 'A' }], moreFriends: 1 });
        expect(items[2]).toMatchObject({ art: ['store-81'], sub: '1 friend played recently', opens: { kind: 'store', appId: 81 }, accentAppId: null });
        // Steam's own store header for a game not in the library, with its discount tag.
        expect(items[3]).toMatchObject({ art: ['https://cdn/82/header.jpg'], pill: '-80%', opens: { kind: 'store', appId: 82 } });
    });
    it('no trending games: no header and no row, the friend cards keep their size', () => {
        const items = feedItems('friends', { news: [], recommended: [], friends, trending: [] }, art, 426);
        expect(items.map((i) => [i.row, i.height])).toEqual([[0, 260]]);
        expect(hasSecondRow('friends', { news: [], recommended: [], friends })).toBe(false);
    });
});

describe('feedItems placeholders', () => {
    it('every non-friend card has a backdrop placeholder under its art (never a bare dark box)', () => {
        const data = { news: [], friends: [], recommended: [], updated: [{ appId: 5, name: 'Tool', rtLastUpdated: 1, label: 'Updated Today', size: '1 MB' }] } as unknown as Parameters<typeof feedItems>[1];
        const items = feedItems('news', data, () => ({ hero: [], capsule: [] }), 420);
        expect(items).toHaveLength(1);
        expect(items[0].backdrop).toEqual({ url: null, tone: null });
    });
});
