import { describe, expect, it, vi } from 'vitest';
import { runDelete, runUpload } from '../../src/media/mediaState';
import type { MediaItem } from '../../src/media/mediaModel';

const shot = (h: number): MediaItem => ({ kind: 'shot', id: `7_${h}`, appId: 7, gameId: '7', handle: h, created: 100 - h, width: 1, height: 1, url: '', uploaded: false });
const clip: MediaItem = { kind: 'clip', id: 'clip_abc', appId: 1, gameId: '1', created: 1, durationMs: 1, title: '' };
const items = [shot(1), shot(2), shot(3)];

describe('runDelete (Review Focus 2, 3)', () => {
    it('success moves focus to the next', async () => {
        expect(await runDelete(items[1], items, async () => true)).toEqual({ ok: true, focusId: '7_3' });
    });
    it('the last moves focus to the previous', async () => {
        expect(await runDelete(items[2], items, async () => true)).toEqual({ ok: true, focusId: '7_2' });
    });
    it('the only item leaves no focus', async () => {
        expect(await runDelete(items[0], items.slice(0, 1), async () => true)).toEqual({ ok: true, focusId: null });
    });
    it('a failure leaves focus where it was', async () => {
        expect(await runDelete(items[1], items, async () => false)).toEqual({ ok: false, focusId: '7_2' });
        expect(await runDelete(items[1], items, async () => { throw new Error('x'); })).toEqual({ ok: false, focusId: '7_2' });
    });
});

describe('runUpload', () => {
    it("passes the privacy and returns Steam's answer", async () => {
        const upload = vi.fn(async () => true);
        expect(await runUpload(items[0], 2, upload)).toBe(true);
        expect(upload).toHaveBeenCalledWith(items[0], 2);
        expect(await runUpload(items[0], 0, async () => false)).toBe(false);
    });
    it('a recording is not uploaded', async () => {
        const upload = vi.fn(async () => true);
        expect(await runUpload(clip, 1, upload)).toBe(false);
        expect(upload).not.toHaveBeenCalled();
    });
});
