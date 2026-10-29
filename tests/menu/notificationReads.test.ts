import { expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createNotificationReads } from '../../src/menu/notificationReads';

it('loads the remembered local read ids from the menu preferences and keeps only valid ones', async () => {
    const kv = memoryKv(); await kv.set('menu:notifications-read', ['7', 3, 'plugin:2']);
    const reads = createNotificationReads(kv);
    expect(reads.ready()).toBe(false); await reads.load();
    expect(reads.ready()).toBe(true); expect([...reads.get()]).toEqual(['7', 'plugin:2']);
});
it('remembers ids, tells listeners, and saves at most the newest 200', async () => {
    const kv = memoryKv(), reads = createNotificationReads(kv); await reads.load();
    const listener = vi.fn(); reads.subscribe(listener);
    await reads.remember(Array.from({ length: 205 }, (_, i) => String(i)));
    expect(listener).toHaveBeenCalledTimes(1); expect(reads.get().has('4')).toBe(false); expect(reads.get().has('204')).toBe(true);
    expect(await kv.get('menu:notifications-read')).toHaveLength(200);
    await reads.remember(['204']); expect(listener).toHaveBeenCalledTimes(1);
});
it('is ready with nothing remembered when storage fails, and a failed save keeps the ids for this session', async () => {
    const kv = { get: vi.fn(async () => { throw Error('down'); }), set: vi.fn(async () => { throw Error('down'); }) };
    const reads = createNotificationReads(kv as never); await reads.load();
    expect(reads.ready()).toBe(true); await expect(reads.remember(['1'])).resolves.toBeUndefined(); expect(reads.get().has('1')).toBe(true);
});
