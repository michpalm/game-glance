import React, { useMemo } from 'react';
import { SpotlightLibrary } from '../src/library/SpotlightLibrary';
import { LibraryGameItem } from '../src/library/libraryData';
import { MOCK_GAMES } from './mockData';

interface Props {
    deviceMode?: 'handheld' | 'tv';
    customAccent?: string | null;
}

export function SpotlightLibraryPreview({ deviceMode = 'handheld', customAccent }: Props) {
    const mockLibraryGames: LibraryGameItem[] = useMemo(() => {
        const list: LibraryGameItem[] = MOCK_GAMES.map((g, idx) => ({
            appId: g.info.appId,
            name: g.info.name,
            isShortcut: g.info.isShortcut,
            isSoundtrack: false,
            gameId: g.info.isShortcut ? String(g.info.appId) : undefined,
            installed: true,
            running: idx === 0, // First game is simulated as currently running
            playedMinutes: g.info.playedMinutes,
            achievements: g.info.achievements,
            heroic: g.info.heroic,
            source: g.source,
            accent: customAccent ?? g.accent,
            lastPlayed: Date.now() - idx * 86400000 * 2,
            sizeOnDisk: 45000000000,
            capsuleUrl: `https://shared.steamstatic.com/store_item_assets/steam/apps/${g.info.appId}/library_600x900.jpg`,
            landscapeUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.info.appId}/header.jpg`,
            heroUrl: g.heroUrl,
            logoUrl: g.logoUrl,
            description: g.description,
        }));

        // Sample Soundtrack for testing soundtrack layout and tab
        list.push({
            appId: 1091500,
            name: 'Cyberpunk 2077: Original Soundtrack',
            isShortcut: false,
            isSoundtrack: true,
            installed: true,
            running: false,
            playedMinutes: 145,
            achievements: null,
            heroic: null,
            source: 'Soundtrack',
            accent: '#00e5ff',
            lastPlayed: Date.now() - 3600000 * 5,
            sizeOnDisk: 1200000000,
            capsuleUrl: 'https://shared.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg',
            landscapeUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
            heroUrl: 'https://shared.steamstatic.com/store_item_assets/steam/apps/1091500/library_hero.jpg',
            description: 'The official Cyberpunk 2077 soundtrack featuring original music composed by Marcin Przybyłowicz, P.T. Adamczyk and Paul Leonard-Morgan.',
        });

        return list;
    }, [customAccent]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <SpotlightLibrary mockGames={mockLibraryGames} />
        </div>
    );
}
