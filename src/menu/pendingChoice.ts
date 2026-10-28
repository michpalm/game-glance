/** A choice shows the pressed option at once; Steam's readback takes over when the change lands, fails or is cancelled. */
export function shownChoice<T>(draft: T | null, s: { value: T | null; pending: boolean; error: string | null }): { value: T | null; spinning: boolean } {
    return { value: draft ?? s.value, spinning: draft !== null };
}
/** The local choice is dropped as soon as Steam is no longer applying a change. */
export function shouldClearDraft(s: { pending: boolean }): boolean {
    return !s.pending;
}
