import { DownloadState, fillPercent, pillToggle, pillWords } from './downloadProgress';
import { tr } from '../i18n/steamText';

/** Small pure helpers behind the Spotlight Home components. */

export function eyebrowText(lastPlayedLabel: string | null, onLibrary = false, isNew = false): string {
    if (onLibrary) return tr('myGames');
    // A game new to the library: when it was added ("New to library · Yesterday"), as on Steam's Home.
    if (isNew) return lastPlayedLabel ? `${tr('newToLibrary')} · ${lastPlayedLabel}` : tr('newToLibrary');
    return lastPlayedLabel ? `${tr('lastPlayed')} · ${lastPlayedLabel}` : tr('recentGames');
}

/**
 * Which art fills the screen. Only real hero art is shown full-bleed; a game without it gets the
 * handoff's fallback (blurred capsule plus a masked sharp capsule), never a stretched header.
 * `hero` and `capsule` come from artwork.ts (`heroUrls` lists custom hero, hero, header, capsule; `capsuleUrls`
 * custom portrait, capsule, header). `full`: the hero candidates in order (custom art first; Steam lists custom
 * files that may not exist, so each is tried before the next), [] when the game has no hero art.
 */
export function heroSources(hero: string[], capsule: string[]): { full: string[]; fallback: string[] } {
    const fallback = [...new Set(capsule)];
    const full = [...new Set(hero)].filter((u) => typeof u === 'string' && u.length > 0 && !fallback.includes(u));
    return { full, fallback };
}

/**
 * Art for the expanded recents card, as stacked layers (the first that loads paints on top). Steam's own landscape
 * art first (`landscape`, from artwork.landscapeUrls: custom/SteamGridDB art, then the library header), as stock
 * Home's first Recently Played card; the hero under it as a last resort. Null with neither: the capsule keeps its
 * own fallback (blurred base plus the sharp capsule at the right), matching the full-screen hero's fallback.
 */
export function wideArt(landscape: string[], hero: string[], capsule: string[]): string[] | null {
    const full = heroSources(hero, capsule).full;
    const layers = [...new Set([...landscape, ...full])];
    return layers.length > 0 ? layers : null;
}

/**
 * Art for the open transition's clone: the wide card's layers (`wide`, from wideArt), then the capsule as the
 * last resort (the handoff: wide || hero || cover). Empty when nothing is known; the clone is then ink only.
 */
export function openArtLayers(wide: string[] | null, capsule: string[]): string[] {
    return [...new Set([...(wide ?? []), ...capsule])].filter((u) => typeof u === 'string' && u.length > 0);
}

/** Urls as one CSS background-image value, stacked (the first that loads paints on top); '' without urls. */
export function cssLayers(list: string[]): string {
    return list
        .filter((u) => typeof u === 'string' && u.length > 0)
        .map((u) => `url("${u.replace(/"/g, '%22')}")`)
        .join(', ');
}

/** Steam's RunGame takes the 64-bit game id for non-Steam shortcuts, the app id otherwise. */
export function runGameId(appId: number, gameId: string | undefined): string {
    return typeof gameId === 'string' && /^\d+$/.test(gameId) ? gameId : String(appId);
}

/**
 * The Play pill. The running game resumes: its page is opened (Steam's own Resume lives there) rather
 * than calling RunGame again. An installed game launches; one that is not installed opens its page,
 * where Steam offers the install. While Steam installs, updates or downloads the game the pill is Steam's own
 * (downloadProgress.pillWords: Pause / Download / Update), fills by `fill` percent, and A pauses or resumes the
 * transfer (`toggle`), as Steam's button on the game page does.
 */
export function playAction(installed: boolean, running: boolean, download: DownloadState | null = null): { label: string; launch: boolean; fill: number | null; toggle: 'pause' | 'resume' | null } {
    if (running) return { label: 'Resume', launch: false, fill: null, toggle: null };
    if (download) return { label: pillWords(download, installed), launch: false, fill: fillPercent(download), toggle: pillToggle(download) };
    return installed ? { label: 'Play', launch: true, fill: null, toggle: null } : { label: 'Install', launch: false, fill: null, toggle: null };
}

/**
 * Whether a resolved hero art may be kept for the session. Only once Steam's details for the game are
 * loaded (before that `strHeroImage` is unknown); a game with hero art keeps only the hero itself
 * (a fallback then means a slow or failed load); a game without hero art keeps its fallback. Misses never.
 */
export function shouldMemoArt(detailsLoaded: boolean, hasHeroImage: boolean, mode: 'full' | 'fallback' | 'none'): boolean {
    if (mode === 'none' || !detailsLoaded) return false;
    return hasHeroImage ? mode === 'full' : true;
}

/** "Play a game…" only when recents are empty and the boot-time retries are over. */
export function showEmptyMessage(gameCount: number, recentsSettled: boolean): boolean {
    return gameCount === 0 && recentsSettled;
}

const MIN_BOX_PX = 64;

/** A measure of Home's box worth scaling to (SharedJSContext's 1x1 window and unlaid-out 0x0 boxes are not). */
export function usableSize(width: number, height: number): boolean {
    return Number.isFinite(width) && Number.isFinite(height) && width >= MIN_BOX_PX && height >= MIN_BOX_PX;
}

/**
 * Reads the ids not yet in `known`, at most `batchSize` at a time, and stores each result there.
 * A failing read stores `onError`; never rejects.
 */
export async function fillMissing<T>(
    ids: number[],
    known: Map<number, T>,
    read: (id: number) => Promise<T>,
    batchSize = 8,
    onError?: T,
): Promise<void> {
    const missing = [...new Set(ids)].filter((id) => !known.has(id));
    const size = Math.max(1, Math.floor(batchSize));
    for (let i = 0; i < missing.length; i += size) {
        await Promise.all(missing.slice(i, i + size).map(async (id) => {
            try {
                known.set(id, await read(id));
            } catch {
                if (onError !== undefined) known.set(id, onError);
            }
        }));
    }
}
