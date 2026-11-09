import { describe, expect, it, vi } from 'vitest';
import { pickMenuAccent, resolveMenuAccent } from '../../src/menu/accent';

const deps = () => ({ memo: new Map<number, string>(), version: vi.fn(() => 0), cache: { get: vi.fn<() => Promise<unknown>>(async () => null) } });
describe('reuse Home accent in the menu', () => {
    it('reuses the warm Home color without reading storage', async () => {
        const d = deps(); d.memo.set(7, '#7733ee');
        expect(await resolveMenuAccent(7, d)).toBe('#7733ee'); expect(d.cache.get).not.toHaveBeenCalled();
    });
    it('hydrates the art-versioned Home cache after a plugin reload', async () => {
        const d = deps(); d.version.mockReturnValue(3); d.cache.get.mockResolvedValue({ color: '#ee6633' });
        expect(await resolveMenuAccent(7, d)).toBe('#ee6633');
        expect(d.cache.get).toHaveBeenCalledWith('accent:7:3'); expect(d.memo.get(7)).toBe('#ee6633'); expect(d.memo.has(8)).toBe(false);
    });
    it.each([null, { color: null }, { color: 'bad' }])('keeps unknown colors unavailable for Steam-blue fallback: %j', async value => {
        const d = deps(); d.cache.get.mockResolvedValue(value);
        expect(await resolveMenuAccent(7, d)).toBeUndefined(); expect(d.memo.has(7)).toBe(false);
    });
    it('never adopts a cached color for artwork changed while the read was pending', async () => {
        const d = deps(); let finish!: (value: unknown) => void;
        d.cache.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        const pending = resolveMenuAccent(7, d); d.version.mockReturnValue(1); finish({ color: '#ee6633' });
        expect(await pending).toBeUndefined(); expect(d.memo.has(7)).toBe(false);
    });
    it('prefers a newer Home result and survives cache errors', async () => {
        const d = deps(); let finish!: (value: unknown) => void;
        d.cache.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        const pending = resolveMenuAccent(7, d); d.memo.set(7, '#123456'); finish({ color: '#ee6633' });
        expect(await pending).toBe('#123456');
        d.memo.clear(); d.cache.get.mockRejectedValue(Error('offline')); expect(await resolveMenuAccent(7, d)).toBeUndefined();
    });
});

describe('one accent for the visible screen', () => {
    it('follows Home artwork while a different game is running in the background', () => {
        expect(pickMenuAccent('#112233', '#3d33cd', false)).toBe('#3d33cd');
    });
    it('follows the running game in its overlay and uses teal when its artwork has no accent', () => {
        expect(pickMenuAccent('#112233', '#3d33cd', true)).toBe('#112233');
        expect(pickMenuAccent(undefined, '#3d33cd', true)).toBe('#5fd1ae');
    });
    it('uses teal without valid screen artwork', () => {
        expect(pickMenuAccent(undefined, undefined, false)).toBe('#5fd1ae');
        expect(pickMenuAccent('bad', 'red;display:none', false)).toBe('#5fd1ae');
    });
});
