/**
 * The space uninstalled games need, for the Library's "Required space" (PS5 check 2026-11-19). Steam's details store keeps
 * only games Steam loaded itself; for the rest Steam's RegisterForAppDetails callback carries the details. Home's details
 * loop asks each game once per session and keeps 64 in its memo, so sizes were lost: the Library asks on its own and keeps
 * every size for the session (a number per game).
 */
const sizes = new Map<number, number>();

export const knownSpace = (appId: number): number | undefined => sizes.get(appId);
export function rememberSpace(appId: number, bytes: unknown): void {
    const n = Number(bytes);
    if (n > 0) sizes.set(appId, n);
}

export interface SpaceWarmDeps {
    register(appId: number, onDetails: (details: unknown) => void): { unregister(): void } | undefined;
    sleep(ms: number): Promise<void>;
    /** How long to wait for one game's details. */
    waitMs?: number;
}

/** Steam's details for `ids` one at a time, keeping each size; skips known ones, stops when cancelled; never rejects. */
export async function warmSpace(ids: number[], deps: SpaceWarmDeps, isCancelled: () => boolean, onSpace: (appId: number) => void): Promise<void> {
    for (const id of ids) {
        if (isCancelled()) return;
        if (sizes.has(id)) continue;
        let registration: { unregister(): void } | undefined;
        await new Promise<void>(resolve => {
            const timer = setTimeout(resolve, deps.waitMs ?? 1500);
            try {
                registration = deps.register(id, details => {
                    const bytes = (details as { lDiskSpaceRequiredBytes?: unknown } | null | undefined)?.lDiskSpaceRequiredBytes;
                    rememberSpace(id, bytes);
                    if (sizes.has(id)) {
                        clearTimeout(timer);
                        resolve();
                    }
                });
            } catch {
                clearTimeout(timer);
                resolve();
            }
        });
        try { registration?.unregister(); } catch { /* already gone */ }
        if (sizes.has(id)) onSpace(id);
        await deps.sleep(0);
    }
}
