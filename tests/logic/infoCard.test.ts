import { describe, expect, it } from 'vitest';
import { descriptionState } from '../../src/logic/infoCard';

describe('descriptionState', () => {
    it('shows a loading placeholder until the description arrives, for every game', () => {
        expect(descriptionState(undefined)).toEqual({ kind: 'loading' });
    });
    it('shows the description of Steam and non-Steam games alike', () => {
        expect(descriptionState('Take up your sword.')).toEqual({ kind: 'text', text: 'Take up your sword.' });
    });
    it('shows nothing when no description was found', () => {
        expect(descriptionState(null)).toEqual({ kind: 'none' });
        expect(descriptionState('')).toEqual({ kind: 'none' });
    });
});
