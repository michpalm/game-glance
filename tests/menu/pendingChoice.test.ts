import { expect, it } from 'vitest';
import { shouldClearDraft, shownChoice } from '../../src/menu/pendingChoice';

it('shows the pressed option at once, with a spinner, while Steam applies it', () => {
    expect(shownChoice(3, { value: 1, pending: true, error: null })).toEqual({ value: 3, spinning: true });
    expect(shouldClearDraft({ pending: true })).toBe(false);
});
it('shows Steam’s value once the change has landed', () => {
    expect(shouldClearDraft({ pending: false })).toBe(true);
    expect(shownChoice(null, { value: 3, pending: false, error: null })).toEqual({ value: 3, spinning: false });
});
it('reverts to Steam’s value when the change fails', () => {
    expect(shouldClearDraft({ pending: false })).toBe(true);
    expect(shownChoice(null, { value: 1, pending: false, error: 'Steam could not apply this change' })).toEqual({ value: 1, spinning: false });
});
it('drops the local choice when Steam cancels it', () => {
    // A context change settles the receipt with no error: pending false, value unchanged.
    expect(shouldClearDraft({ pending: false })).toBe(true);
    expect(shownChoice(null, { value: 1, pending: false, error: null }).spinning).toBe(false);
});
it('never spins when Steam turns the press down before applying anything', () => {
    // An unavailable control rejects at once and never reports pending; a repeat press repeats the same error.
    expect(shownChoice(3, { value: 1, pending: false, error: 'This control is unavailable' })).toEqual({ value: 1, spinning: false });
});
