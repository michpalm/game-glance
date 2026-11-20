import { describe, expect, it, vi } from 'vitest';
import { libraryMemory, restoreIndex } from '../../src/library/libraryState';
import type { LibGame } from '../../src/library/libraryModel';

const g = (appId: number): LibGame => ({ appId, name: String(appId), playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false });

describe('restoreIndex (Review Focus 5)', () => {
    it('finds the cover by app id', () => expect(restoreIndex([g(1), g(2), g(3)], 3, 0)).toBe(2));
    it('a cover that is gone falls back to the nearest index', () => {
        expect(restoreIndex([g(1), g(2)], 9, 5)).toBe(1);
        expect(restoreIndex([g(1), g(2)], undefined, 0)).toBe(0);
    });
    it('an empty list gives 0', () => expect(restoreIndex([], 3, 4)).toBe(0));
});

describe('libraryMemory', () => {
    it('notifies subscribers and resets', () => {
        const fn = vi.fn();
        const stop = libraryMemory.subscribe(fn);
        libraryMemory.set({ tab: 'all', native: true });
        expect(fn).toHaveBeenCalledTimes(1);
        expect(libraryMemory.get()).toMatchObject({ tab: 'all', native: true });
        libraryMemory.reset();
        expect(libraryMemory.get()).toEqual({ tab: null, sorts: {}, focus: {}, scroll: {}, index: {}, entry: null, native: false });
        stop();
        libraryMemory.set({ tab: 'recent' });
        expect(fn).toHaveBeenCalledTimes(2);
        libraryMemory.reset();
    });
});
