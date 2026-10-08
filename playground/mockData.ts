import { HltbResult } from '../src/data/hltb';
import { GameInfo } from '../src/data/steam';

export interface MockGame {
    info: GameInfo;
    heroUrl: string;
    logoUrl?: string;
    source: string;
    description: string;
    hltb: HltbResult;
    accent: string;
}

export const MOCK_GAMES: MockGame[] = [
    {
        info: {
            appId: 292030,
            name: 'The Witcher 3: Wild Hunt',
            isShortcut: false,
            playedMinutes: 4890,
            achievements: { achieved: 52, total: 78 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/logo.png',
        source: 'Steam',
        description:
            'As war rages on throughout the Northern Realms, you take on the greatest contract of your life — tracking down the Child of Prophecy, a living weapon that can alter the shape of the world.',
        hltb: {
            status: 'found',
            gameId: 10270,
            times: { main: 51.5, mainExtras: 103, completionist: 173 },
        },
        accent: '#e65c5c',
    },
    {
        info: {
            appId: 1091500,
            name: 'Cyberpunk 2077',
            isShortcut: false,
            playedMinutes: 3720,
            achievements: { achieved: 38, total: 44 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/logo.png',
        source: 'Steam',
        description:
            'Cyberpunk 2077 is an open-world, action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival.',
        hltb: {
            status: 'found',
            gameId: 2127,
            times: { main: 25, mainExtras: 60, completionist: 104 },
        },
        accent: '#fcee09',
    },
    {
        info: {
            appId: 1229240,
            name: 'Chained Echoes',
            isShortcut: true,
            playedMinutes: 1980,
            achievements: null,
            heroic: { runner: 'gog', app_name: 'chained_echoes' },
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1229240/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1229240/logo.png',
        source: 'GOG',
        description:
            'Take up your sword, channel your magic or board your Mech. Chained Echoes is a 16-bit style RPG set in a fantasy world where dragons are as common as piloted mechanical suits.',
        hltb: {
            status: 'found',
            gameId: 81216,
            times: { main: 30, mainExtras: 40, completionist: 55 },
        },
        accent: '#4895ef',
    },
    {
        info: {
            appId: 1145360,
            name: 'Hades',
            isShortcut: false,
            playedMinutes: 4200,
            achievements: { achieved: 49, total: 49 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/logo.png',
        source: 'Epic',
        description:
            'Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion and Transistor.',
        hltb: {
            status: 'found',
            gameId: 62719,
            times: { main: 22.5, mainExtras: 47, completionist: 94 },
        },
        accent: '#f72585',
    },
    {
        info: {
            appId: 377160,
            name: 'Fallout 4',
            isShortcut: false,
            playedMinutes: 5460,
            achievements: { achieved: 61, total: 84 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/377160/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/377160/logo.png',
        source: 'Steam',
        description:
            'Bethesda Game Studios, the award-winning creators of Fallout 3 and Skyrim, welcome you to the world of Fallout 4 — their most ambitious game ever, and the next generation of open-world gaming.',
        hltb: {
            status: 'found',
            gameId: 26727,
            times: { main: 27, mainExtras: 81, completionist: 161 },
        },
        accent: '#3498db',
    },
    {
        info: {
            appId: 413150,
            name: 'Stardew Valley',
            isShortcut: false,
            playedMinutes: 7200,
            achievements: { achieved: 35, total: 40 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/logo.png',
        source: 'Steam',
        description:
            'You\'ve inherited your grandfather\'s old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.',
        hltb: {
            status: 'found',
            gameId: 34712,
            times: { main: 53, mainExtras: 94, completionist: 151 },
        },
        accent: '#e67e22',
    },
    {
        info: {
            appId: 1245620,
            name: 'Elden Ring',
            isShortcut: false,
            playedMinutes: 6800,
            achievements: { achieved: 42, total: 42 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/logo.png',
        source: 'Steam',
        description:
            'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
        hltb: {
            status: 'found',
            gameId: 68151,
            times: { main: 58.5, mainExtras: 101, completionist: 134 },
        },
        accent: '#c5a059',
    },
    {
        info: {
            appId: 1086940,
            name: 'Baldur\'s Gate 3',
            isShortcut: false,
            playedMinutes: 8900,
            achievements: { achieved: 48, total: 54 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/logo.png',
        source: 'Steam',
        description:
            'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
        hltb: {
            status: 'found',
            gameId: 68033,
            times: { main: 67, mainExtras: 108, completionist: 156 },
        },
        accent: '#a83232',
    },
    {
        info: {
            appId: 367520,
            name: 'Hollow Knight',
            isShortcut: false,
            playedMinutes: 3100,
            achievements: { achieved: 56, total: 63 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/logo.png',
        source: 'Steam',
        description:
            'Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes. Explore twisting caverns, battle tainted creatures and befriend bizarre bugs.',
        hltb: {
            status: 'found',
            gameId: 26286,
            times: { main: 27, mainExtras: 41, completionist: 63 },
        },
        accent: '#7f8c8d',
    },
    {
        info: {
            appId: 1174180,
            name: 'Red Dead Redemption 2',
            isShortcut: false,
            playedMinutes: 5200,
            achievements: { achieved: 32, total: 51 },
            heroic: null,
        },
        heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_hero.jpg',
        logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/logo.png',
        source: 'Steam',
        description:
            'Winner of over 175 Game of the Year Awards and recipient of over 250 perfect scores, RDR2 is the epic tale of outlaw Arthur Morgan and the infamous Van der Linde gang, on the run across America at the dawn of the modern age.',
        hltb: {
            status: 'found',
            gameId: 27100,
            times: { main: 50.5, mainExtras: 82, completionist: 181 },
        },
        accent: '#c0392b',
    },
];
