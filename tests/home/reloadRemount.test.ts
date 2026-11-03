import { describe, expect, it, vi } from 'vitest';
import { Navigation, Router } from '@decky/ui';
import { parseHTML } from 'linkedom';

vi.mock('@decky/ui', () => ({ Navigation: { Navigate: vi.fn() }, Router: {} }));

import { noteLoad, remountHomeAfterReload, REMOUNT_DELAY_MS, RemountDeps } from '../../src/home/reloadRemount';

function fakeDeps(path: string | undefined) {
    const timers: Array<{ fn: () => void; ms: number; done: boolean }> = [];
    const navigated: string[] = [];
    let opening = false;
    const deps: RemountDeps = {
        path: () => path,
        opening: () => opening,
        navigate: (p) => { navigated.push(p); path = p; },
        setTimeout: (fn, ms) => timers.push({ fn, ms, done: false }) - 1,
        clearTimeout: (h) => {
            timers[h as number].done = true;
        },
    };
    const runNext = () => {
        const timer = timers.find((t) => !t.done);
        if (timer) { timer.done = true; timer.fn(); }
    };
    const runAll = () => {
        for (let i = 0; i < timers.length; i++) if (!timers[i].done) {
            timers[i].done = true;
            timers[i].fn();
        }
    };
    return { deps, timers, navigated, runAll, runNext, setOpening: (value: boolean) => { opening = value; }, setPath: (value: string) => { path = value; } };
}

describe('noteLoad', () => {
    it('the first load of a session is not a reload; later ones are', () => {
        const store: Record<string, unknown> = {};
        expect(noteLoad(store)).toBe(false);
        expect(noteLoad(store)).toBe(true);
        expect(noteLoad(store)).toBe(true);
    });
});

describe('remountHomeAfterReload', () => {
    it('a first load does nothing', () => {
        const f = fakeDeps('/library/home');
        remountHomeAfterReload(false, f.deps);
        expect(f.timers).toHaveLength(0);
    });
    it('after a reload with Home on screen, opens the library, then Home again', () => {
        const f = fakeDeps('/library/home');
        remountHomeAfterReload(true, f.deps);
        expect(f.timers[0].ms).toBe(REMOUNT_DELAY_MS);
        f.runAll();
        expect(f.navigated).toEqual(['/library', '/library/home']);
    });
    it('somewhere else (a game page, the library): leaves it there', () => {
        const f = fakeDeps('/library/app/123');
        remountHomeAfterReload(true, f.deps);
        f.runAll();
        expect(f.navigated).toEqual([]);
    });
    it('an unload before it runs cancels it', () => {
        const f = fakeDeps('/library/home');
        const cancel = remountHomeAfterReload(true, f.deps);
        cancel();
        f.runAll();
        expect(f.navigated).toEqual([]);
    });
    it('a navigation that throws is caught', () => {
        const f = fakeDeps('/library/home');
        f.deps.navigate = () => {
            throw new Error('x');
        };
        remountHomeAfterReload(true, f.deps);
        expect(() => f.runAll()).not.toThrow();
    });
});


describe('reload refresh during navigation', () => {
    it('waits through an opening, then refreshes if the opening was cancelled on Home', () => {
        const f = fakeDeps('/library/home');
        f.setOpening(true);
        remountHomeAfterReload(true, f.deps);
        f.runNext();
        expect(f.navigated).toEqual([]);
        f.runNext();
        expect(f.navigated).toEqual([]);
        expect(f.timers.filter((t) => !t.done)).toHaveLength(1);
        f.setOpening(false);
        f.runAll();
        expect(f.navigated).toEqual(['/library', '/library/home']);
    });
    it('abandons the refresh when the opening reaches the game page', () => {
        const f = fakeDeps('/library/home');
        f.setOpening(true);
        remountHomeAfterReload(true, f.deps);
        f.runNext();
        f.setPath('/library/app/123');
        f.runAll();
        expect(f.navigated).toEqual([]);
        expect(f.timers.filter((t) => !t.done)).toHaveLength(0);
    });
    it('unload cancels a deferred refresh, including a callback already queued', () => {
        const f = fakeDeps('/library/home');
        f.setOpening(true);
        const cancel = remountHomeAfterReload(true, f.deps);
        f.runNext();
        const queued = f.timers.find((t) => !t.done)!;
        expect(queued).toBeDefined();
        cancel();
        f.setOpening(false);
        queued.fn();
        f.runAll();
        expect(f.navigated).toEqual([]);
    });
    it('does not return Home if the user navigated elsewhere during the library interval', () => {
        const f = fakeDeps('/library/home');
        remountHomeAfterReload(true, f.deps);
        f.runNext();
        f.setPath('/library/app/123');
        f.runAll();
        expect(f.navigated).toEqual(['/library']);
    });
    it('unload cancels the return, including a callback already queued', () => {
        const f = fakeDeps('/library/home');
        const cancel = remountHomeAfterReload(true, f.deps);
        f.runNext();
        const queued = f.timers.find((t) => !t.done)!;
        cancel();
        queued.fn();
        f.runAll();
        expect(f.navigated).toEqual(['/library']);
    });
    it.each(['<div class="gh-root" data-gh-opening="morph"></div>', '<div class="gh-bridge"></div>'])(
        'checks opening markers in Steam’s owner document: %s', (markup) => {
            vi.useFakeTimers();
            const owner = Router as unknown as { WindowStore?: unknown };
            const { document } = parseHTML(`<html><body>${markup}</body></html>`);
            const query = vi.spyOn(document, 'querySelector');
            owner.WindowStore = { GamepadUIMainWindowInstance: {
                m_history: { location: { pathname: '/library/home' } }, BrowserWindow: { document },
            } };
            const cancel = remountHomeAfterReload(true);
            try {
                vi.advanceTimersByTime(REMOUNT_DELAY_MS);
                expect(query).toHaveBeenCalled();
                expect(Navigation.Navigate).not.toHaveBeenCalled();
            } finally {
                cancel();
                delete owner.WindowStore;
                vi.clearAllMocks();
                vi.useRealTimers();
            }
        },
    );
});
