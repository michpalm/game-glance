import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { useSettled } from '../../src/library/useSettled';
vi.unmock('react-dom');

let seen: number[] = [];
function Probe({ value }: { value: number }) { seen.push(useSettled(value, 150)); return null; }

describe('useSettled', () => {
    beforeEach(() => { vi.useFakeTimers(); seen = []; (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true; });
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
    it('keeps the old value until the new one has rested', async () => {
        const { window, document } = parseHTML('<div id="app"></div>');
        vi.stubGlobal('window', window);
        vi.stubGlobal('document', document);
        const root = createRoot(document.getElementById('app') as unknown as HTMLElement);
        await act(() => root.render(createElement(Probe, { value: 1 })));
        await act(() => root.render(createElement(Probe, { value: 2 })));
        await act(() => { vi.advanceTimersByTime(100); });
        await act(() => root.render(createElement(Probe, { value: 3 })));
        await act(() => { vi.advanceTimersByTime(100); });
        expect(seen.at(-1)).toBe(1);
        await act(() => { vi.advanceTimersByTime(60); });
        expect(seen.at(-1)).toBe(3);
        expect(seen).not.toContain(2);
        await act(() => root.unmount());
    });
});
