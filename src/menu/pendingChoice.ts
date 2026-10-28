/** A choice shows the pressed option at once; Steam's readback takes over when the change lands, fails or is cancelled. */
export function shownChoice<T>(draft: T | null, s: { value: T | null; pending: boolean; error: string | null }): { value: T | null; spinning: boolean } {
    // Derived in render, so a press Steam turns down at once (never pending) shows nothing stale, not even for a frame.
    const applying = draft !== null && s.pending;
    return { value: applying ? draft : s.value, spinning: applying };
}
/** The local choice is dropped as soon as Steam is no longer applying a change. */
export function shouldClearDraft(s: { pending: boolean }): boolean {
    return !s.pending;
}
