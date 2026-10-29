/** Whether the menu's small on-screen keyboard is showing. One per menu shell. */
export function createKeyboardSession() {
    let state = { open: false };
    let mode: 'compact' | 'radial' | null = null;
    const listeners = new Set<() => void>();
    const set = (open: boolean) => {
        if (state.open === open) return;
        state = { open };
        if (!open) mode = null;
        for (const listener of [...listeners]) listener();
    };
    return {
        get: () => state,
        mode: () => mode,
        setMode(value: 'compact' | 'radial' | null) { mode = state.open ? value : null; },
        subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
        open: () => set(true),
        close: () => set(false),
    };
}
export type KeyboardSession = ReturnType<typeof createKeyboardSession>;
