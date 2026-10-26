import { selfFamilyLabel } from '../data/family';

/** Steam decides whether copies are selectable; reuse its action rather than guessing from ownership. */
export function libraryPillState(doc: Document, selector: string | null, family: string | null): { label: string | null; link: HTMLElement | null } {
    const candidate = selector ? doc.querySelector<HTMLElement>(selector) : null;
    const link = candidate && !candidate.matches('[disabled], [aria-disabled="true"]') ? candidate : null;
    return { label: family ?? (link ? selfFamilyLabel() : null), link };
}

/** Preserve Steam's native dialog and selection handling; the original action is visually replaced. */
export function openLibraryChoice(link: HTMLElement): void {
    if (link.isConnected && !link.matches('[disabled], [aria-disabled="true"]')) link.click();
}

type RegisterOverview = (callback: () => void) => { unregister(): void } | void;
type OverviewListeners = { listeners: Set<() => void>; registered: boolean; unregister?: () => void };
const UPDATES = Symbol.for('game-glance.library-overview-updates');

/** Steam builds without an unregister API share one dispatcher across mounts and plugin reloads. */
export function subscribeLibraryUpdates(update: () => void, register?: RegisterOverview): () => void {
    const shared = globalThis as unknown as Record<symbol, OverviewListeners | undefined>;
    const state = shared[UPDATES] ?? (shared[UPDATES] = { listeners: new Set(), registered: false });
    state.listeners.add(update);
    if (register && !state.registered) {
        const registration = register(() => {
            // Steam's own handler finishes applying the new overview before we read its owner.
            void Promise.resolve().then(() => { for (const listener of state.listeners) listener(); });
        });
        state.registered = true;
        if (registration) state.unregister = () => registration.unregister();
    }
    return () => {
        state.listeners.delete(update);
        if (state.listeners.size === 0 && state.unregister) {
            state.unregister();
            state.unregister = undefined;
            state.registered = false;
        }
    };
}
