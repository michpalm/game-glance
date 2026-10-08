/**
 * Remembers the user's category, collection, game, and focus position in the Library view.
 * When navigating to a game page or store page, Steam's B button returns and remounts
 * SpotlightLibrary; this module-level memory restores the exact category, sub-collection,
 * game selection, and focus zone so the user never loses their place.
 */

export interface LibraryMemory {
    categoryId: string;
    subCollectionId: string | null;
    appId: number;
    focusZone: 'grid' | 'tabs';
}

export const DEFAULT_LIBRARY_MEMORY: LibraryMemory = {
    categoryId: 'installed',
    subCollectionId: null,
    appId: 0,
    focusZone: 'grid',
};

/** Restores within 30 minutes; longer absences are treated as a fresh library visit. */
export const LIBRARY_RESTORE_MAX_AGE_MS = 30 * 60_000;

let memory: LibraryMemory | null = null;
let leftAt: number | null = null;

/** Records the current position in the library (partial update). */
export function noteLibrary(patch: Partial<LibraryMemory>) {
    memory = { ...(memory ?? DEFAULT_LIBRARY_MEMORY), ...patch };
}

/** Called when navigating away to a game page or action where B will return to the library. */
export function markLeavingLibrary(now: number = Date.now()) {
    if (memory) leftAt = now;
}

/** Returns the remembered position to restore on mount, once. */
export function takeLibraryRestore(now: number = Date.now()): LibraryMemory | null {
    const at = leftAt;
    leftAt = null;
    if (!memory || at === null || now - at > LIBRARY_RESTORE_MAX_AGE_MS || now < at) return null;
    return { ...memory };
}

/** Resets memory (for testing). */
export function resetLibraryMemory() {
    memory = null;
    leftAt = null;
}
