import { describe, expect, it, vi } from 'vitest';
import { listenOpenCancel } from '../../src/home/openCancel';

describe('B during the opening animation', () => {
    it('cancels the transition and consumes Back before Home can also act on it', () => {
        const doc = new EventTarget();
        const cancel = vi.fn();
        const stop = listenOpenCancel(doc, cancel);
        const event = new Event('vgp_oncancel', { cancelable: true });
        expect(doc.dispatchEvent(event)).toBe(false);
        expect(cancel).toHaveBeenCalledOnce();
        stop();
        expect(doc.dispatchEvent(new Event('vgp_oncancel', { cancelable: true }))).toBe(true);
        expect(cancel).toHaveBeenCalledOnce();
    });
    it('leaves other input alone', () => {
        const doc = new EventTarget(), cancel = vi.fn();
        const stop = listenOpenCancel(doc, cancel);
        expect(doc.dispatchEvent(new Event('vgp_onbuttondown', { cancelable: true }))).toBe(true);
        expect(cancel).not.toHaveBeenCalled();
        stop();
    });
});
