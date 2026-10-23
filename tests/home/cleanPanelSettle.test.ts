import { describe, expect, it, vi } from 'vitest';
import { settleCleanPanel } from '../../src/home/openHome';

function fixture() {
    const node = (left: number, top: number, width: number, height: number) => ({
        getBoundingClientRect: () => ({ left, top, width, height }),
        offsetWidth: width,
        style: { setProperty: vi.fn() },
    });
    const shell = node(100, 200, 300, 80);
    const ring = node(100, 200, 300, 80);
    const canvas = node(10, 20, 1000, 800);
    const panel = node(99.5, 200.25, 300.5, 80.25);
    const copy = { ...node(10, 20, 1000, 800), querySelector: (s: string) => s === '.gh-canvas' ? canvas : s.includes('shell') ? shell : ring };
    const doc = { querySelector: () => panel, defaultView: { getComputedStyle: () => ({ left: '0px', top: '0px', width: '500px', height: '80px', getPropertyValue: () => '0px' }) } };
    return { copy, doc, panel, shell, ring };
}

describe('Clean panel handoff', () => {
    it('lands the scaled glass and unscaled border on the live card including fractional bounds', () => {
        const { copy, doc, shell, ring } = fixture();
        expect(settleCleanPanel(copy as never, doc as never)).toBe(true);
        expect(ring.style.setProperty).toHaveBeenCalledWith('left', '89.5px', 'important');
        expect(ring.style.setProperty).toHaveBeenCalledWith('width', '300.5px', 'important');
        expect(shell.style.setProperty).toHaveBeenCalledWith('left', '44.75px', 'important');
        expect(shell.style.setProperty).toHaveBeenCalledWith('top', '90.125px', 'important');
        expect(shell.style.setProperty).toHaveBeenCalledWith('height', '40.125px', 'important');
        expect(shell.style.setProperty).toHaveBeenCalledWith('transition', expect.stringContaining('width 150ms'), 'important');
    });
    it('leaves other layouts and missing/hidden Clean panels alone', () => {
        const f = fixture();
        f.doc.querySelector = () => null as never;
        expect(settleCleanPanel(f.copy as never, f.doc as never)).toBe(false);
        expect(f.shell.style.setProperty).not.toHaveBeenCalled();
        f.doc.querySelector = () => ({ ...f.panel, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
        expect(settleCleanPanel(f.copy as never, f.doc as never)).toBe(false);
    });
    it('rejects a different panel shape or invalid canvas scale', () => {
        const f = fixture();
        f.panel.getBoundingClientRect = () => ({ left: 100, top: 200, width: 500, height: 80 });
        expect(settleCleanPanel(f.copy as never, f.doc as never)).toBe(false);
        expect(f.ring.style.setProperty).not.toHaveBeenCalled();
        f.doc.defaultView.getComputedStyle = () => ({ left: '0px', top: '0px', width: '0px', height: '80px', getPropertyValue: () => '0px' });
        expect(settleCleanPanel(f.copy as never, f.doc as never)).toBe(false);
    });
});
