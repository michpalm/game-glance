import { describe, expect, it, beforeEach } from 'vitest';
import {
    markLeavingLibrary,
    noteLibrary,
    resetLibraryMemory,
    takeLibraryRestore,
    LIBRARY_RESTORE_MAX_AGE_MS,
} from '../../src/library/libraryMemory';

describe('libraryMemory', () => {
    beforeEach(() => {
        resetLibraryMemory();
    });

    it('returns null when no memory has been saved', () => {
        expect(takeLibraryRestore()).toBeNull();
    });

    it('saves and restores library position', () => {
        noteLibrary({ categoryId: 'collections', subCollectionId: 'col-rpg', appId: 1091500, focusZone: 'grid' });
        const now = 100000;
        markLeavingLibrary(now);

        const restored = takeLibraryRestore(now + 1000);
        expect(restored).toEqual({
            categoryId: 'collections',
            subCollectionId: 'col-rpg',
            appId: 1091500,
            focusZone: 'grid',
        });

        // Consumed once
        expect(takeLibraryRestore(now + 2000)).toBeNull();
    });

    it('returns null if memory is expired past max age', () => {
        noteLibrary({ categoryId: 'soundtracks', subCollectionId: null, appId: 1433140 });
        const now = 100000;
        markLeavingLibrary(now);

        const expired = takeLibraryRestore(now + LIBRARY_RESTORE_MAX_AGE_MS + 100);
        expect(expired).toBeNull();
    });
});
