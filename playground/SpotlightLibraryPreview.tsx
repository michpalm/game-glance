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
        return MOCK_GAMES.map((g, idx) => ({
            appId: g.info.appId,
            name: g.info.name,
            isShortcut: g.info.isShortcut,
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
    }, [customAccent]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <SpotlightLibrary mockGames={mockLibraryGames} />
        </div>
    );
}
