import { describe, expect, it } from 'vitest';
import { protonRequestKey, rememberProton } from '../../src/data/useProton';

describe('rememberProton', () => {
    it('keeps a found result with details and a "none"', () => {
        expect(rememberProton({ status: 'found', tier: 'gold', details: { total: 1, confidence: 'low', trending: null, best: null } })).toBe(true);
        expect(rememberProton({ status: 'none' })).toBe(true);
    });
    it('keeps a found result whose details ProtonDB left partly empty (a fresh fetch always writes details)', () => {
        expect(rememberProton({ status: 'found', tier: 'gold', details: { total: null, confidence: null, trending: null, best: null } })).toBe(true);
    });
    it('does not keep an unavailable result or a found one without details (asked again)', () => {
        expect(rememberProton({ status: 'unavailable' })).toBe(false);
        expect(rememberProton({ status: 'found', tier: 'gold' })).toBe(false);
    });
});

describe('protonRequestKey', () => {
    it('asks when wanted, ready, with an app id and nothing known', () => {
        expect(protonRequestKey(7, true, true, undefined)).toBe('protondb:7');
    });
    it('does not ask when not wanted, without an app id, not ready, or already known', () => {
        expect(protonRequestKey(7, false, true, undefined)).toBeNull();
        expect(protonRequestKey(null, true, true, undefined)).toBeNull();
        expect(protonRequestKey(7, true, false, undefined)).toBeNull();
        expect(protonRequestKey(7, true, true, { status: 'none' })).toBeNull();
    });
});
