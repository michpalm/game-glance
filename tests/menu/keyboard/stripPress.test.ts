import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStripPress, dpadStep, installDragGamepad, installHoldWatch, NUDGE } from '../../../src/menu/keyboard/stripPress';

function setup() {
    const deps = { cycle: vi.fn(), lift: vi.fn(), drop: vi.fn(), held: vi.fn() };
    return { deps, press: createStripPress(deps) };
}

describe('pressing A on the move strip', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('cycles the spot once for a quick press, on release, whether Steam’s click comes before or after A down', () => {
        const { deps, press } = setup();
        press.action(); press.buttonDown();
        vi.advanceTimersByTime(100);
        expect(deps.cycle).not.toHaveBeenCalled();
        press.buttonUp();
        expect(deps.cycle).toHaveBeenCalledTimes(1);
        press.action();
        vi.advanceTimersByTime(1000);
        expect(deps.cycle).toHaveBeenCalledTimes(1);
        expect(deps.lift).not.toHaveBeenCalled();
    });
    it('ignores Steam’s click while A is down and its repeated A down events', () => {
        const { deps, press } = setup();
        press.buttonDown(); press.action(); vi.advanceTimersByTime(200); press.buttonDown();
        vi.advanceTimersByTime(150);
        press.buttonUp();
        vi.advanceTimersByTime(1000);
        expect(deps.cycle).toHaveBeenCalledTimes(1);
        expect(deps.lift).not.toHaveBeenCalled();
    });
    it('lifts the panel after a 400 ms hold, never cycles, and drops it on release', () => {
        const { deps, press } = setup();
        press.buttonDown(); press.action();
        vi.advanceTimersByTime(399);
        expect(deps.lift).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(deps.lift).toHaveBeenCalledTimes(1);
        expect(press.dragging()).toBe(true);
        press.buttonUp();
        expect(deps.drop).toHaveBeenCalledTimes(1);
        expect(press.dragging()).toBe(false);
        press.action();
        vi.advanceTimersByTime(1000);
        expect(deps.cycle).not.toHaveBeenCalled();
    });
    it('cycles on a touch tap or click (no gamepad press), once', () => {
        const { deps, press } = setup();
        press.action();
        vi.advanceTimersByTime(0);
        expect(deps.cycle).toHaveBeenCalledTimes(1);
    });
    it('drops on B during the drag and then ignores the A release', () => {
        const { deps, press } = setup();
        expect(press.cancel()).toBe(false);
        press.buttonDown(); vi.advanceTimersByTime(400);
        expect(press.cancel()).toBe(true);
        expect(deps.drop).toHaveBeenCalledTimes(1);
        press.buttonUp(); press.action();
        vi.advanceTimersByTime(1000);
        expect(deps.drop).toHaveBeenCalledTimes(1);
        expect(deps.cycle).not.toHaveBeenCalled();
    });
    it('gives up the hold when focus leaves the strip before 400 ms: no lift, no cycle, the late A up and click ignored', () => {
        const { deps, press } = setup();
        press.buttonDown();
        vi.advanceTimersByTime(200);
        press.abort();
        vi.advanceTimersByTime(1000);
        press.buttonUp(); press.action();
        vi.advanceTimersByTime(1000);
        expect(deps.lift).not.toHaveBeenCalled();
        expect(deps.cycle).not.toHaveBeenCalled();
        expect(deps.drop).not.toHaveBeenCalled();
    });
    it('does not let go of a lifted panel on abort (only A up or B drop it)', () => {
        const { deps, press } = setup();
        press.buttonDown(); vi.advanceTimersByTime(400);
        press.abort();
        expect(press.dragging()).toBe(true);
        press.buttonUp();
        expect(deps.drop).toHaveBeenCalledOnce();
    });
    it('reports while a hold is pending, so a watcher can catch focus moving away', () => {
        const { deps, press } = setup();
        press.buttonDown(); expect(deps.held).toHaveBeenLastCalledWith(true);
        press.buttonUp(); expect(deps.held).toHaveBeenLastCalledWith(false);
        press.buttonDown(); vi.advanceTimersByTime(400); expect(deps.held).toHaveBeenLastCalledWith(false);
        press.buttonUp(); press.buttonDown(); press.abort(); expect(deps.held).toHaveBeenLastCalledWith(false);
        press.buttonDown(); press.dispose(); expect(deps.held).toHaveBeenLastCalledWith(false);
    });
    it('ends cleanly when the keyboard closes: no lift, cycle or drop afterwards', () => {
        const { deps, press } = setup();
        press.action(); press.dispose();
        press.buttonDown(); vi.advanceTimersByTime(400);
        expect(press.dragging()).toBe(true);
        press.dispose();
        expect(press.dragging()).toBe(false);
        press.buttonUp();
        vi.advanceTimersByTime(1000);
        expect(deps.drop).not.toHaveBeenCalled();
        expect(deps.cycle).not.toHaveBeenCalled();
        press.buttonDown(); press.dispose(); vi.advanceTimersByTime(1000);
        expect(deps.lift).toHaveBeenCalledTimes(1);
    });
});

describe('watching a pending hold', () => {
    it('gives up the hold on any direction, letting it move focus as usual, until removed', () => {
        const doc = new EventTarget(), abort = vi.fn();
        const remove = installHoldWatch(doc, abort);
        const event = new CustomEvent('vgp_ondirection', { detail: { button: 10 }, cancelable: true });
        doc.dispatchEvent(event);
        expect(abort).toHaveBeenCalledOnce();
        expect(event.defaultPrevented).toBe(false);
        remove();
        doc.dispatchEvent(new CustomEvent('vgp_ondirection', { detail: { button: 10 } }));
        expect(abort).toHaveBeenCalledOnce();
    });
});

describe('the controller during a drag', () => {
    const fire = (doc: EventTarget, type: string, button: number) => {
        const event = new CustomEvent(type, { detail: { button }, cancelable: true });
        doc.dispatchEvent(event);
        return event;
    };
    function install(stickBusy = false) {
        const doc = new EventTarget(), later = vi.fn();
        const handlers = { nudge: vi.fn(), cancel: vi.fn(() => true), release: vi.fn(), stickBusy: () => stickBusy };
        const remove = installDragGamepad(doc, handlers);
        // Listeners added after ours stand for Steam's and the menu's own (in the DOM they run after document capture).
        for (const type of ['vgp_ondirection', 'vgp_oncancel', 'vgp_onbuttondown']) doc.addEventListener(type, later);
        return { doc, later, handlers, remove };
    }
    it('maps the d-pad to 8 px nudges', () => {
        expect(NUDGE).toBe(8);
        expect([9, 10, 11, 12].map(dpadStep)).toEqual([{ x: 0, y: -8 }, { x: 0, y: 8 }, { x: -8, y: 0 }, { x: 8, y: 0 }]);
        expect(dpadStep(1)).toBeNull();
    });
    it('nudges on each direction and keeps it from moving focus', () => {
        const { doc, later, handlers } = install();
        const event = fire(doc, 'vgp_ondirection', 12);
        expect(event.defaultPrevented).toBe(true);
        expect(later).not.toHaveBeenCalled();
        expect(handlers.nudge).toHaveBeenCalledWith({ x: 8, y: 0 });
    });
    it('does not nudge for the stick’s own direction events while the stick feed moves the panel', () => {
        const { doc, later, handlers } = install(true);
        expect(fire(doc, 'vgp_ondirection', 9).defaultPrevented).toBe(true);
        expect(later).not.toHaveBeenCalled();
        expect(handlers.nudge).not.toHaveBeenCalled();
    });
    it('drops on B and keeps B from closing the keyboard', () => {
        const { doc, later, handlers } = install();
        expect(fire(doc, 'vgp_oncancel', 2).defaultPrevented).toBe(true);
        expect(later).not.toHaveBeenCalled();
        expect(handlers.cancel).toHaveBeenCalledOnce();
    });
    it('releases on A up wherever focus is, and leaves other buttons alone', () => {
        const { doc, later, handlers } = install();
        fire(doc, 'vgp_onbuttonup', 1);
        expect(handlers.release).toHaveBeenCalledTimes(1);
        expect(fire(doc, 'vgp_onbuttondown', 3).defaultPrevented).toBe(false);
        expect(later).toHaveBeenCalledTimes(1);
    });
    it('stops listening when removed', () => {
        const { doc, later, handlers, remove } = install();
        remove();
        fire(doc, 'vgp_ondirection', 12); fire(doc, 'vgp_oncancel', 2);
        expect(handlers.nudge).not.toHaveBeenCalled();
        expect(later).toHaveBeenCalledTimes(2);
    });
});

describe('pad drop commit ordering',()=>{
 it('saves the live position before flag clearing can synchronously render the stale starting state',async()=>{
  const {finishPadDrop}=await import('../../../src/menu/keyboard/stripPress');
  const live={position:{x:320,y:210}},start={x:10,y:10};let saved:typeof start|null=null;
  finishPadDrop({lifted:true,finish:()=>{saved={...live.position};},release:()=>{live.position=start;},idle:()=>{throw Error('not idle');}});
  expect(saved).toEqual({x:320,y:210});
 });
 it('releases flags even if finishing fails and never saves an unlifted drag',async()=>{
  const {finishPadDrop}=await import('../../../src/menu/keyboard/stripPress');let released=0,idle=0;
  expect(()=>finishPadDrop({lifted:true,finish:()=>{throw Error('retired');},release:()=>released++,idle:()=>idle++})).toThrow('retired');
  finishPadDrop({lifted:false,finish:()=>{throw Error('not lifted');},release:()=>released++,idle:()=>idle++});
  expect([released,idle]).toEqual([2,1]);
 });
});
