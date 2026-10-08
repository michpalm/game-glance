import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getGameCollections } from '../../src/data/gameCollections';

describe('getGameCollections', () => {
    beforeEach(() => {
        delete (globalThis as any).collectionStore;
        delete (globalThis as any).__mockCollections;
    });

    afterEach(() => {
        delete (globalThis as any).collectionStore;
        delete (globalThis as any).__mockCollections;
    });

    it('returns empty array for invalid app IDs', () => {
        expect(getGameCollections(0)).toEqual([]);
        expect(getGameCollections(-1)).toEqual([]);
    });

    it('returns empty array when no collectionStore exists', () => {
        expect(getGameCollections(292030)).toEqual([]);
    });

    it('finds collections from userCollections containing the app', () => {
        (globalThis as any).collectionStore = {
            userCollections: [
                {
                    id: 'col-1',
                    name: 'RPG Classics',
                    apps: [{ appid: 292030 }, { appid: 1091500 }],
                },
                {
                    id: 'col-2',
                    name: 'Action & Adventure',
                    allApps: [{ appid: 292030 }],
                },
                {
                    id: 'col-3',
                    name: 'Platformers',
                    apps: [{ appid: 504230 }],
                },
            ],
        };

        const cols = getGameCollections(292030);
        expect(cols).toEqual(['RPG Classics', 'Action & Adventure']);
    });

    it('detects favorites via BIsFavorite or favorite collection', () => {
        (globalThis as any).collectionStore = {
            BIsFavorite: (appId: number) => appId === 292030,
            userCollections: [
                {
                    id: 'col-1',
                    name: 'RPG Classics',
                    apps: [{ appid: 292030 }],
                },
            ],
        };

        const cols = getGameCollections(292030);
        expect(cols).toEqual(['Favorites', 'RPG Classics']);
    });

    it('ignores system collections like Installed, Soundtracks, and All Games', () => {
        (globalThis as any).collectionStore = {
            userCollections: [
                {
                    id: 'all_games',
                    name: 'All Games',
                    apps: [{ appid: 292030 }],
                },
                {
                    id: 'soundtracks',
                    name: 'Soundtracks',
                    apps: [{ appid: 292030 }],
                },
                {
                    id: 'local_games',
                    name: 'Installed',
                    apps: [{ appid: 292030 }],
                },
                {
                    id: 'col-rpg',
                    name: 'RPG',
                    apps: [{ appid: 292030 }],
                },
            ],
        };

        const cols = getGameCollections(292030);
        expect(cols).toEqual(['RPG']);
    });

    it('supports m_setAppIDs (Set) in Steam collection structure', () => {
        const set = new Set([292030, 1091500]);
        (globalThis as any).collectionStore = {
            userCollections: [
                {
                    id: 'col-rpg',
                    name: 'RPG Masters',
                    m_setAppIDs: set,
                },
            ],
        };

        const cols = getGameCollections(292030);
        expect(cols).toEqual(['RPG Masters']);
        expect(getGameCollections(999)).toEqual([]);
    });
});
