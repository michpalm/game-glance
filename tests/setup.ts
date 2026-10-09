import { vi } from 'vitest';

vi.mock('@decky/api', () => ({
    callable: () => async () => null,
    fetchNoCors: vi.fn(),
    routerHook: { addPatch: vi.fn(), removePatch: vi.fn() },
    definePlugin: (fn: () => unknown) => fn,
    toaster: { toast: vi.fn() },
}));

// @decky/ui reads Steam's webpack chunks from `window` on import; Home components import it, and the
// Home route patch test reaches them through HomeGate. Components are not rendered in node tests.
vi.mock('@decky/ui', () => ({
    Focusable: () => null,
    Navigation: { Navigate: vi.fn(), NavigateToExternalWeb: vi.fn(), NavigateToSteamWeb: vi.fn() },
}));

// react-dom is Steam's (Decky provides it at runtime; it is an external of the bundle and not installed here). Home's status bar
// draws through a portal; nothing is rendered in node tests.
vi.mock('react-dom', () => ({ createPortal: () => null }));
