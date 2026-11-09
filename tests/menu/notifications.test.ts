import { expect, it, vi } from 'vitest';
import { createNotificationBadge } from '../../src/menu/steam/notifications';
it('uses unviewed count rather than tray groups and never marks/clears notifications', () => {
    let unviewed = 0, signal!: () => void;
    const clearToasts = vi.fn(), viewed = vi.fn(), stop = vi.fn();
    const badge = createNotificationBadge({ getUnviewed: () => unviewed, subscribe: fn => { signal = fn; return stop; }, trayGroups: [{},{}], clearToasts, viewed });
    expect(badge.get()).toBe(0); const listener = vi.fn(); badge.subscribe(listener); unviewed = 3; signal(); expect(badge.get()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1); expect(clearToasts).not.toHaveBeenCalled(); expect(viewed).not.toHaveBeenCalled(); badge.dispose(); badge.dispose(); expect(stop).toHaveBeenCalledTimes(1);
});
