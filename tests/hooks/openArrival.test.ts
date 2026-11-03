import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArrivalPhase, runArrival } from '../../src/hooks/openArrival';
import { arrivalHoldMs } from '../../src/hooks/useOpenArrival';
import { OPEN_TIMINGS } from '../../src/home/motion';

function setup(readyAt: number | null | (() => boolean)) {
    const log: string[] = [];
    const deps = {
        ready: () => typeof readyAt === 'function' ? readyAt() : readyAt !== null && Date.now() >= readyAt,
        now: () => Date.now(),
        frame: (cb: () => void) => setTimeout(cb, 16),
        cancelFrame: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
        setTimer: (cb: () => void, ms: number) => setTimeout(cb, ms),
        clearTimer: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
        onReady: () => log.push(`ready@${Date.now()}`),
        onPhase: (p: ArrivalPhase) => log.push(`${p}@${Date.now()}`),
    };
    return { log, stop: runArrival(deps) };
}

describe('runArrival', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });
    afterEach(() => vi.useRealTimers());

    it('a page ready at once: reports it, reveals after the delay, and is done once the hold is over', () => {
        const { log } = setup(0);
        vi.advanceTimersByTime(31);
        expect(log).toEqual([]);
        vi.advanceTimersByTime(1 + Math.max(1, OPEN_TIMINGS.revealDelay) + arrivalHoldMs());
        expect(log).toEqual(['ready@32', `revealing@${32 + Math.max(1, OPEN_TIMINGS.revealDelay)}`, `done@${32 + Math.max(1, OPEN_TIMINGS.revealDelay) + arrivalHoldMs()}`]);
    });

    it('checks every frame until ready', () => {
        const { log } = setup(100);
        vi.advanceTimersByTime(99);
        expect(log).toEqual([]);
        vi.advanceTimersByTime(40);
        expect(log[0]).toBe('ready@128');
    });

    it('a cold hero taking 800 ms stays covered beyond the old 500 ms cap', () => {
        const { log } = setup(800);
        vi.advanceTimersByTime(600);
        expect(log).toEqual([]);
        vi.advanceTimersByTime(220);
        expect(log[0]).toBe('ready@816');
    });

    it('a transient ready frame resets the visible-frame check', () => {
        const { log } = setup(() => Date.now() === 16 || Date.now() >= 64);
        vi.advanceTimersByTime(79);
        expect(log).toEqual([]);
        vi.advanceTimersByTime(2);
        expect(log[0]).toBe('ready@80');
    });

    it('stopping while waiting for a cold hero leaves no late reveal', () => {
        const { log, stop } = setup(800);
        vi.advanceTimersByTime(600);
        stop();
        vi.advanceTimersByTime(3000);
        expect(log).toEqual([]);
    });

    it('never ready: revealed at the cap anyway, without a report, and still finishes', () => {
        const { log } = setup(null);
        vi.advanceTimersByTime(OPEN_TIMINGS.readyCap + arrivalHoldMs() + 50);
        expect(log.some((l) => l.startsWith('ready'))).toBe(false);
        expect(log[0]).toMatch(/^revealing@/);
        expect(log[1]).toMatch(/^done@/);
    });

    it('stopped (the page left): nothing more happens', () => {
        const { log, stop } = setup(0);
        stop();
        vi.advanceTimersByTime(5000);
        expect(log).toEqual([]);
    });
});
