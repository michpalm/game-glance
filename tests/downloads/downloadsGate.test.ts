import { createElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', ConfirmModal: 'div', Navigation: {}, showModal: () => {} }));
import { DownloadsGate, DownloadsPage } from '../../src/downloads/DownloadsPage';
import type { DownloadsBindings } from '../../src/downloads/steamDownloads';

const native = createElement('div', { id: 'steam-downloads' });
const bindings = (available: boolean, input: unknown = { overview: null, queued: [], completed: [], history: [] }): DownloadsBindings => ({
    available: () => available, read: () => input as never, pauseAll: () => true, resume: () => true, downloadNow: () => true, moveUp: () => true, remove: () => true,
});

describe('DownloadsGate', () => {
    it('shows Steam\'s own page when Steam\'s download store is unavailable (Review Focus)', () => {
        expect(DownloadsGate({ native, bindings: bindings(false) })).toBe(native);
    });
    it('shows Steam\'s own page when the store cannot be read', () => {
        expect(DownloadsGate({ native, bindings: bindings(true, null) })).toBe(native);
    });
    it('shows Game Glance\'s page otherwise', () => {
        const out = DownloadsGate({ native, bindings: bindings(true) }) as ReactElement;
        expect(out.type).toBe(DownloadsPage);
    });
});
