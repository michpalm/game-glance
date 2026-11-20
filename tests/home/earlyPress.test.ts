import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { catchEarlyPress, EARLY_PRESS_GUARD_MS, EARLY_PRESS_CAP_MS } from '../../src/home/earlyPress';

afterEach(() => vi.useRealTimers());

function fixture() {
    vi.useFakeTimers();
    const { document, window } = parseHTML('<div id="home"><div class="gh-recents" id="card"></div></div><div class="ps_PlaySection" id="play-row"></div>');
    let clock = 1000;
    const press = vi.fn();
    const send = (type: string, button: number, target = document.getElementById('card')!) => {
        const event = new window.CustomEvent(type, { bubbles: true, cancelable: true, detail: { button } }) as unknown as Event;
        const stopped = vi.spyOn(event, 'stopPropagation');
        target.dispatchEvent(event);
        return { event, stopped };
    };
    const focusPlay = () => { const b = document.createElement('div'); b.id = 'play'; b.className = 'gpfocus'; document.getElementById('play-row')!.appendChild(b); return b; };
    const stop = catchEarlyPress({ doc: document as unknown as Document, now: () => clock, focused: () => document.querySelector<HTMLElement>('.ps_PlaySection .gpfocus'), press });
    return { document, send, focusPlay, press, stop, advance: (ms: number) => { clock += ms; vi.advanceTimersByTime(ms); } };
}

describe('catchEarlyPress (A during the open from Home)', () => {
    it('keeps the timings', () => {
        expect(EARLY_PRESS_GUARD_MS).toBe(200);
        expect(EARLY_PRESS_CAP_MS).toBe(3000);
    });
    it("catches an A before the page's Play is focused (Home's stale card never gets it) and presses Play once it is", () => {
        const f = fixture();
        f.advance(300);
        const down = f.send('vgp_onbuttondown', 1), ok = f.send('vgp_onok', 1);
        expect(down.stopped).toHaveBeenCalled(); expect(ok.stopped).toHaveBeenCalled();
        expect(down.event.defaultPrevented).toBe(true);
        f.send('vgp_onbuttondown', 1); // a second early A: still one press
        expect(f.press).not.toHaveBeenCalled();
        const play = f.focusPlay(); f.advance(16);
        expect(f.press).toHaveBeenCalledTimes(1);
        expect(f.press).toHaveBeenCalledWith(play);
        const later = f.send('vgp_onbuttondown', 1, play); // after hand-over A is Steam's again
        expect(later.stopped).not.toHaveBeenCalled();
    });
    it('ignores the A right after the opening press (a double press must not launch the game)', () => {
        const f = fixture();
        f.advance(120);
        const quick = f.send('vgp_onbuttondown', 1);
        expect(quick.stopped).not.toHaveBeenCalled();
        f.focusPlay(); f.advance(16);
        expect(f.press).not.toHaveBeenCalled();
    });
    it('without an early A, Play is left alone and the catcher ends', () => {
        const f = fixture();
        f.focusPlay(); f.advance(16);
        expect(f.press).not.toHaveBeenCalled();
        f.advance(300);
        expect(f.send('vgp_onbuttondown', 1).stopped).not.toHaveBeenCalled();
    });
    it('B (going back, cancelling the open) drops a caught A', () => {
        const f = fixture();
        f.advance(300); f.send('vgp_onbuttondown', 1);
        f.send('vgp_onbuttondown', 2);
        f.focusPlay(); f.advance(16);
        expect(f.press).not.toHaveBeenCalled();
    });
    it('gives up after the cap: a caught A is dropped, nothing is pressed late', () => {
        const f = fixture();
        f.advance(300); f.send('vgp_onbuttondown', 1);
        f.advance(3000);
        f.focusPlay(); f.advance(16);
        expect(f.press).not.toHaveBeenCalled();
    });
    it('stop() removes it', () => {
        const f = fixture();
        f.stop(); f.advance(300);
        expect(f.send('vgp_onbuttondown', 1).stopped).not.toHaveBeenCalled();
    });
});
