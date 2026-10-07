import { LOG_PREFIX } from '../constants';
import { PlaytimeDeps, unifideckKeyFor, UnifideckKey } from './unifideckPlaytime';

/**
 * Whether Unifideck has a game installed, from its own record (`get_game_info(appId)`: {success, data: {installed, ...}}).
 * Steam's install state is no use for these shortcuts (it reads installed whatever Unifideck says), and Unifideck's own
 * Play / Install row follows this record. null: not a Unifideck game, or nothing answers.
 */
export function parseInstalled(response: unknown): boolean | null {
    try {
        const r = response as { success?: unknown; data?: unknown } | null;
        if (!r || r.success !== true || !r.data || typeof r.data !== 'object') return null;
        const installed = (r.data as { installed?: unknown }).installed;
        return typeof installed === 'boolean' ? installed : null;
    } catch {
        return null;
    }
}

interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}
const deckyBackend = (): DeckyBackendLike | undefined => (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

let logged = false;

/** Forget everything (tests). */
export function resetUnifideckInstalled(): void {
    logged = false;
}

/** True or false for a Unifideck shortcut app id (asked fresh each time: it is a quick in-memory lookup there); null when unknown. */
export async function unifideckInstalled(
    appId: number,
    deps: PlaytimeDeps & { key?: (appId: number) => Promise<UnifideckKey | null> } = {},
): Promise<boolean | null> {
    try {
        if (!(await unifideckKeyFor(appId, deps.key))) return null;
        const backend = 'backend' in deps ? deps.backend : deckyBackend();
        if (!backend?.call) return null;
        return parseInstalled(await backend.call('loader/call_plugin_method', 'Unifideck', 'get_game_info', appId));
    } catch (error) {
        if (!logged) {
            logged = true;
            console.warn(`${LOG_PREFIX} Unifideck install state unavailable`, error);
        }
        return null;
    }
}
