/** Whether the menu's small on-screen keyboard is showing. One per menu shell. */
export function createKeyboardSession() {
    let state = { open: false };
    let mode: 'compact' | 'radial' | null = null;
    // Where the cursor sits in the field being typed into; null means the end.
    let cursor: number | null = null;
    const listeners = new Set<() => void>();
    const notify = () => { for (const listener of [...listeners]) listener(); };
    const set = (open: boolean) => {
        if (state.open === open) return;
        state = { open };
        if (!open) { mode = null; cursor = null; }
        notify();
    };
    return {
        get: () => state,
        mode: () => mode,
        setMode(value: 'compact' | 'radial' | null) { mode = state.open ? value : null; },
        cursor: () => cursor,
        setCursor(value: number | null) {
            if (cursor === value) return;
            cursor = value;
            notify();
        },
        subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
        open: () => set(true),
        close: () => set(false),
    };
}
export type KeyboardSession = ReturnType<typeof createKeyboardSession>;
