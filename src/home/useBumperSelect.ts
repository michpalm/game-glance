import type { GamepadEvent } from '@decky/ui';
import { RefObject, useEffect, useRef } from 'react';
import { LOG_PREFIX } from '../constants';
import { bumperRepeatDelay, selectionForButton } from './focusZones';
import { gameStepSound, playNavSound } from './navSound';

export interface BumperHandlers {
    onButtonDown(evt: GamepadEvent): void;
    onButtonUp(evt: GamepadEvent): void;
    /** Stops a held bumper's repeat (focus left the action row). */
    stop(): void;
}

/**
 * L1/R1 on the action row (bumper navigation): each press selects the next/previous recents item through the
 * Library card (focusZones.selectionForButton). Steam repeats only the d-pad, so a held bumper repeats here: the
 * first repeat after a pause, then a steady rate (focusZones.bumperRepeatDelay). The repeat never wraps and ends at
 * the first or last item, on the bumper's release, when focus leaves `row`, or on unmount, so it can never run on
 * by itself. Each step plays Steam's tab sound (navSound.gameStepSound). `selected`/`count`: the selection now (0..count, count = the Library card); `select` applies a new one.
 */
export function useBumperSelect(row: RefObject<HTMLElement | null>, selected: number, count: number, select: (index: number) => void): BumperHandlers {
    const state = useRef({ selected, count, select });
    state.current = { selected, count, select };
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const held = useRef<number | null>(null);

    const stop = () => {
        held.current = null;
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
    };
    useEffect(() => stop, []);

    const focusInRow = (): boolean => {
        try {
            const el = row.current;
            return !!el && el.contains(el.ownerDocument.activeElement);
        } catch {
            return false;
        }
    };

    // Our handler takes the press before Steam does, so Steam plays no sound for it: each step plays its own.
    const stepSound = (at: number, next: number) => {
        const sound = gameStepSound(at, next, 'bumper');
        if (sound) playNavSound(sound);
    };

    const schedule = (button: number, repeats: number) => {
        timer.current = setTimeout(() => {
            timer.current = null;
            if (held.current !== button || !focusInRow()) return stop();
            const { selected: at, count: n, select: apply } = state.current;
            const next = selectionForButton(at, button, n, true);
            if (next === null || next === at) return stop();
            try {
                apply(next);
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home: bumper repeat failed`, error);
                return stop();
            }
            stepSound(at, next);
            schedule(button, repeats + 1);
        }, bumperRepeatDelay(repeats));
    };

    const onButtonDown = (evt: GamepadEvent) => {
        try {
            const button = Number(evt?.detail?.button);
            const { selected: at, count: n, select: apply } = state.current;
            const next = selectionForButton(at, button, n, false);
            if (next === null) return;
            evt.preventDefault?.();
            evt.stopPropagation?.();
            if (evt?.detail?.is_repeat) return; // Steam does not repeat bumpers; ours is the timer
            stop();
            apply(next);
            stepSound(at, next);
            held.current = button;
            schedule(button, 0);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: bumper selection failed`, error);
            stop();
        }
    };

    const onButtonUp = (evt: GamepadEvent) => {
        if (Number(evt?.detail?.button) === held.current) stop();
    };

    return { onButtonDown, onButtonUp, stop };
}
