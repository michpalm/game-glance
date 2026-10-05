import { describe, expect, it, vi } from 'vitest';
import { memoLookup } from '../../src/home/moduleLookup';

describe('memoLookup', () => {
    it('keeps a success for good, with one lookup', () => {
        const find = vi.fn(() => ({ ok: true }));
        const get = memoLookup('x', find, () => 0);
        expect(get()).toBe(get());
        expect(find).toHaveBeenCalledTimes(1);
    });
    it('a miss is not retried within 60 s, then is, and a later success sticks', () => {
        let t = 1_000;
        let result: string | null = null;
        const find = vi.fn(() => result);
        const get = memoLookup('x', find, () => t);
        expect(get()).toBeNull();
        t += 59_000;
        expect(get()).toBeNull();
        expect(find).toHaveBeenCalledTimes(1);
        t += 1_000;
        result = 'module';
        expect(get()).toBe('module');
        expect(find).toHaveBeenCalledTimes(2);
        t += 500_000;
        expect(get()).toBe('module');
        expect(find).toHaveBeenCalledTimes(2);
    });
    it('a throw counts as a miss and never escapes', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        let t = 0;
        const find = vi.fn(() => { throw new Error('boom'); });
        const get = memoLookup('x', find, () => t);
        expect(get()).toBeNull();
        expect(get()).toBeNull();
        expect(find).toHaveBeenCalledTimes(1);
        t = 60_000;
        expect(get()).toBeNull();
        expect(find).toHaveBeenCalledTimes(2);
    });
});
