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
];
