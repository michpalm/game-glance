import { vi } from 'vitest';

vi.mock('@decky/api', () => ({
    callable: () => async () => null,
    fetchNoCors: vi.fn(),
    routerHook: { addPatch: vi.fn(), removePatch: vi.fn() },
    definePlugin: (fn: () => unknown) => fn,
    toaster: { toast: vi.fn() },
}));
