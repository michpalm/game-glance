import { describe, expect, it } from 'vitest';
import { gateChoice } from '../../src/library/libraryGate';
import type { LibrarySnapshot } from '../../src/library/libraryModel';

const snapshot: LibrarySnapshot = { games: [{ appId: 1, name: 'a', playedMin: 1, lastPlayed: 5, sizeBytes: 0, installed: true, shortcut: false }], installedIds: [1], collections: [] };
const base = { enabled: true, snapshot, path: '/library/tab/AllGames', native: false };

describe('gateChoice', () => {
    it('shows ours on a Library path it handles', () => expect(gateChoice(base)).toEqual({ kind: 'ours', tab: 'all' }));
    it('Steam\'s when the setting is off', () => expect(gateChoice({ ...base, enabled: false })).toEqual({ kind: 'native' }));
    it('Steam\'s when the library cannot be read', () => expect(gateChoice({ ...base, snapshot: null })).toEqual({ kind: 'native' }));
    it('Steam\'s on a path it leaves to Steam', () => expect(gateChoice({ ...base, path: '/library/tab/Soundtracks' })).toEqual({ kind: 'native' }));
    it('Steam\'s when the user chose Steam\'s library', () => expect(gateChoice({ ...base, native: true })).toEqual({ kind: 'native' }));
    it('Steam\'s when the path is unknown', () => expect(gateChoice({ ...base, path: null })).toEqual({ kind: 'native' }));
});
