import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOpenTransition, TIMINGS } from '../../src/home/openTransition';

const RECT = { left: 44, top: 495, width: 311, height: 175 };
const ART = 'url("https://steamloopback.host/assets/620/header.jpg")';

function setup(navigate: (path: string) => void = () => undefined) {
    const remove = vi.fn();
    const mount = vi.fn((_rect: unknown, _art: string) => remove);
    const nav = vi.fn(navigate);
    const transition = createOpenTransition({
        navigate: nav,
        mount,
        setTimer: (fn, ms) => setTimeout(fn, ms),
        clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
    });
    return { transition, mount, remove, nav };
}

describe('openTransition', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps the handoff timings', () => {
        expect(TIMINGS).toEqual({ expand: 480, homeFade: 300, navigateAt: 520, overlayFade: 450, removeAt: 1000 });
    });

    it('open navigates to the app page at 520 ms and removes the overlay at 1000 ms', () => {
        const { transition, mount, remove, nav } = setup();
        transition.open(620, RECT, ART);
        expect(mount).toHaveBeenCalledTimes(1);
        expect(mount).toHaveBeenCalledWith(RECT, ART);
        vi.advanceTimersByTime(519);
        expect(nav).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(nav).toHaveBeenCalledTimes(1);
        expect(nav).toHaveBeenCalledWith('/library/app/620');
        vi.advanceTimersByTime(479);
        expect(remove).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(remove).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(5000);
        expect(nav).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('open removes the overlay immediately when navigate throws and Home stays usable', () => {
        const { transition, mount, remove, nav } = setup(() => {
            throw new Error('router gone');
        });
        transition.open(620, RECT, ART);
        expect(() => vi.advanceTimersByTime(520)).not.toThrow();
        expect(nav).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(5000);
        expect(remove).toHaveBeenCalledTimes(1);
        // Usable again: a new press starts a new transition.
        transition.open(730, RECT, ART);
        expect(mount).toHaveBeenCalledTimes(2);
    });

    it('open ignores a second call while running', () => {
        const { transition, mount, remove, nav } = setup();
        transition.open(620, RECT, ART);
        transition.open(730, RECT, ART);
        vi.advanceTimersByTime(600);
        transition.open(840, RECT, ART);
        vi.advanceTimersByTime(5000);
        expect(mount).toHaveBeenCalledTimes(1);
        expect(nav).toHaveBeenCalledTimes(1);
        expect(nav).toHaveBeenCalledWith('/library/app/620');
        expect(remove).toHaveBeenCalledTimes(1);
        // Once the first has finished, A works again.
        transition.open(730, RECT, ART);
        expect(mount).toHaveBeenCalledTimes(2);
    });

    it('cancel removes the overlay and stops pending timers', () => {
        const { transition, mount, remove, nav } = setup();
        transition.open(620, RECT, ART);
        vi.advanceTimersByTime(200);
        transition.cancel();
        expect(remove).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(5000);
        expect(nav).not.toHaveBeenCalled();
        expect(remove).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
        transition.cancel();
        expect(remove).toHaveBeenCalledTimes(1);
        transition.open(730, RECT, ART);
        expect(mount).toHaveBeenCalledTimes(2);
    });

    it('open navigates at once without an overlay when the rect is unusable', () => {
        for (const rect of [{ left: 0, top: 0, width: 0, height: 175 }, { left: Number.NaN, top: 0, width: 10, height: 10 }, null]) {
            const { transition, mount, nav } = setup();
            transition.open(620, rect as never, ART);
            expect(mount).not.toHaveBeenCalled();
            expect(nav).toHaveBeenCalledWith('/library/app/620');
            expect(vi.getTimerCount()).toBe(0);
        }
    });

    it('open navigates at once when mount throws', () => {
        const nav = vi.fn();
        const transition = createOpenTransition({
            navigate: nav,
            mount: () => {
                throw new Error('no document');
            },
            setTimer: (fn, ms) => setTimeout(fn, ms),
            clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        });
        expect(() => transition.open(620, RECT, ART)).not.toThrow();
        expect(nav).toHaveBeenCalledWith('/library/app/620');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('open never throws when navigate throws on the fallback path', () => {
        const transition = createOpenTransition({
            navigate: () => {
                throw new Error('router gone');
            },
            mount: () => {
                throw new Error('no document');
            },
            setTimer: (fn, ms) => setTimeout(fn, ms),
            clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        });
        expect(() => transition.open(620, RECT, ART)).not.toThrow();
    });
});
