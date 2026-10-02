export type DescriptionState = { kind: 'loading' } | { kind: 'text'; text: string } | { kind: 'none' };

/** What the info card shows for a description: `undefined` while loading, `null` when none was found. */
export function descriptionState(description: string | null | undefined): DescriptionState {
    if (description === undefined) return { kind: 'loading' };
    return description ? { kind: 'text', text: description } : { kind: 'none' };
}
