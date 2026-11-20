import { parseHTML } from 'linkedom';
import { expect, it } from 'vitest';
import { applyMenuStyle, menuStyled } from '../../src/contextMenus/applyMenuStyle';
import { keepTrying } from '../../src/contextMenus/keepTrying';
import { vi } from 'vitest';

const page = () => parseHTML('<html><head></head><body></body></html>').document as unknown as Document;

it('adds one stylesheet and the unit, and the remover takes both away', () => {
    const doc = page();
    applyMenuStyle(doc, 'a{}', 0.5);
    const remove = applyMenuStyle(doc, 'a{}', 0.587);
    const styles = doc.querySelectorAll('style[data-gg-context-menus]');
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toBe('a{}');
    expect(doc.documentElement.style.getPropertyValue('--gg-ctx-u')).toBe('0.587');
    remove();
    expect(doc.querySelector('style[data-gg-context-menus]')).toBeNull();
    expect(doc.documentElement.style.getPropertyValue('--gg-ctx-u')).toBe('');
});

it('knows a window is styled only while its stylesheet has rules', () => {
    const doc = page();
    const el = doc.createElement('div');
    doc.body.append(el);
    expect(menuStyled(el)).toBe(false);
    applyMenuStyle(doc, '', 1);
    expect(menuStyled(el)).toBe(false);
    const remove = applyMenuStyle(doc, 'a{}', 1);
    expect(menuStyled(el)).toBe(true);
    expect(menuStyled(null)).toBe(false);
    remove();
    expect(menuStyled(el)).toBe(false);
});
it('keeps trying a step until it succeeds, and stops when cancelled', () => {
    vi.useFakeTimers();
    try {
        let n = 0;
        const stop = keepTrying(() => ++n >= 3, 1000);
        expect(n).toBe(1);
        vi.advanceTimersByTime(5000);
        expect(n).toBe(3);
        let m = 0;
        const stop2 = keepTrying(() => { m++; return false; }, 1000);
        stop2();
        vi.advanceTimersByTime(5000);
        expect(m).toBe(1);
        stop();
    } finally { vi.useRealTimers(); }
});
