import type { CloudDetails } from './cloud';
import { AchievementFacts, readAchievementFacts } from '../logic/featuredViews';

type Unlocked = AchievementFacts['unlocked'];
/** What is remembered (and persisted) of a game's achievements: the counts, and the latest and rarest unlocked ones when Steam has sent the list. */
export interface KnownAchievements {
    achieved: number;
    total: number;
    unlocked?: Unlocked;
}

/**
 * Library assets Steam sent through `SteamClient.Apps.RegisterForAppDetails`, kept for the session.
 *
 * Steam's `appDetailsStore` only holds the details of games it loaded itself (the first few recents, and any game whose
 * page was opened), so for later recents the hero art's hashed file name (`strHeroImage`) was unknown and Home showed
 * the blurred capsule (Reddit: "after the first 4 titles it is a zoomed in capsule image"). The registration's callback
 * does carry the details; they are remembered here and read when the store has none (artwork.browserStores).
 */
export interface LibraryAssets {
    strHeroImage?: string;
    strHeaderImage?: string;
    strLogoImage?: string;
}

/** At most this many games are remembered; the oldest go first. */
export const DETAILS_MEMO_MAX = 64;

const memo = new Map<number, LibraryAssets>();
const achievementMemo = new Map<number, KnownAchievements>();
const cloudMemo = new Map<number, CloudDetails>();
const spaceMemo = new Map<number, number>();
const playtimeMemo = new Map<number, number>();
type AchievementSink = (appId: number, known: KnownAchievements) => void;
let sink: AchievementSink | null = null;

/** Where new or changed achievement counts go to be kept across restarts (Home wires it to the plugin cache); null stops it. */
export function setAchievementSink(next: AchievementSink | null) {
    sink = next;
}

/** Puts what was read from the persisted cache into the memo (no write back). A fresher value already known is kept. */
export function seedAchievements(appId: number, stored: unknown) {
    const c = stored as { achieved?: unknown; total?: unknown; unlocked?: unknown } | null | undefined;
    const total = Number(c?.total);
    if (!Number.isInteger(appId) || appId <= 0 || achievementMemo.has(appId) || !Number.isFinite(total) || total <= 0) return;
    const unlocked = readUnlocked(c?.unlocked);
    achievementMemo.set(appId, { achieved: Number(c?.achieved) || 0, total, ...(unlocked ? { unlocked } : {}) });
}

/** A persisted unlocked list, entry by entry; undefined when it is not a list (an entry cached before the list was kept). */
function readUnlocked(value: unknown): Unlocked | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.filter((u) => u && typeof u.id === 'string').map((u) => ({
        id: u.id,
        name: String(u.name ?? ''),
        image: String(u.image ?? ''),
        unlockedAt: Number(u.unlockedAt) || 0,
        globalPct: Number(u.globalPct) || 0,
    }));
}

/** The two the Achievements card shows, newest first: the latest unlocked, and the rarest (lowest known global share). Pure. */
export function keptUnlocked(unlocked: Unlocked): Unlocked {
    const latest = unlocked[0];
    if (!latest) return [];
    const rarest = unlocked.filter((u) => u.globalPct > 0).reduce<Unlocked[number] | null>((best, u) => (best === null || u.globalPct < best.globalPct ? u : best), null);
    return rarest && rarest.id !== latest.id ? [latest, rarest] : [latest];
}

/** Remembers `details.libraryAssets` for `appId`; anything without them is ignored. Never throws. */
export function noteDetails(appId: number, details: unknown) {
    try {
        if (!Number.isInteger(appId) || appId <= 0) return;
        noteAchievements(appId, details);
        noteCloud(appId, details);
        noteSpace(appId, details);
        notePlaytime(appId, details);
        const assets = (details as { libraryAssets?: unknown } | null | undefined)?.libraryAssets;
        if (!assets || typeof assets !== 'object') return;
        const { strHeroImage, strHeaderImage, strLogoImage } = assets as Record<string, unknown>;
        const kept: LibraryAssets = {};
        if (typeof strHeroImage === 'string') kept.strHeroImage = strHeroImage;
        if (typeof strHeaderImage === 'string') kept.strHeaderImage = strHeaderImage;
        if (typeof strLogoImage === 'string') kept.strLogoImage = strLogoImage;
        memo.delete(appId);
        memo.set(appId, kept);
        while (memo.size > DETAILS_MEMO_MAX) memo.delete(memo.keys().next().value as number);
    } catch {
        // keep what was there
    }
}

/**
 * Remembers the achievements the callback carries: the counts (nTotal / nAchieved; Steam's store holds none for games it
 * did not load itself) and the latest and rarest unlocked ones. An answer without the unlocked list (Steam sends the
 * counts first) keeps the list already known rather than forgetting it.
 */
function noteAchievements(appId: number, details: unknown) {
    const a = (details as { achievements?: { nTotal?: unknown; nAchieved?: unknown } } | null | undefined)?.achievements;
    const total = Number(a?.nTotal);
    if (!Number.isFinite(total) || total <= 0) return;
    const achieved = Number(a?.nAchieved) || 0;
    const before = achievementMemo.get(appId);
    const listed = readAchievementFacts(details)?.unlocked ?? [];
    const unlocked = achieved === 0 ? undefined : listed.length > 0 ? keptUnlocked(listed) : before?.unlocked;
    const next: KnownAchievements = { achieved, total, ...(unlocked ? { unlocked } : {}) };
    achievementMemo.delete(appId);
    achievementMemo.set(appId, next);
    if (!before || !sameAchievements(before, next)) {
        try {
            sink?.(appId, next);
        } catch {
            // persisting is best effort
        }
    }
    while (achievementMemo.size > DETAILS_MEMO_MAX) achievementMemo.delete(achievementMemo.keys().next().value as number);
}

function sameAchievements(a: KnownAchievements, b: KnownAchievements): boolean {
    const ids = (k: KnownAchievements) => (k.unlocked === undefined ? null : k.unlocked.map((u) => `${u.id}@${u.unlockedAt}`).join(','));
    return a.achieved === b.achieved && a.total === b.total && ids(a) === ids(b);
}

/** Whether the Achievements card can be drawn complete from memory: the counts, and the unlocked list when any are unlocked. */
export function achievementsComplete(appId: number): boolean {
    const known = achievementMemo.get(appId);
    return known !== undefined && (known.achieved === 0 || known.unlocked !== undefined);
}

/**
 * The game page's (and Home's featured card's) achievements: Steam's own when they are complete, else what is remembered,
 * so the card is not left loading, or without its latest and rarest, while Steam is still loading the details. Steam's
 * newer counts win; an answer lacking something (no record, no unlocked list) never replaces what is known.
 */
export function knownAchievementFacts(appId: number, fresh: AchievementFacts | undefined): AchievementFacts | undefined {
    const known = achievementMemo.get(appId);
    if (!known) return fresh;
    const remembered: AchievementFacts = { achieved: known.achieved, total: known.total, unlocked: known.unlocked ?? [] };
    if (fresh === undefined || fresh.total <= 0) return remembered;
    if (fresh.achieved > 0 && fresh.unlocked.length === 0 && known.unlocked?.length) return { ...fresh, unlocked: known.unlocked };
    return fresh;
}

/** The cloud fields the callback carries (not persisted: the state is live, and the focused game's registration keeps it current). */
function noteCloud(appId: number, details: unknown) {
    const d = details as Record<string, unknown> | null | undefined;
    if (typeof d?.bCloudEnabledForApp !== 'boolean') return;
    const { bCloudEnabledForApp, bCloudEnabledForAccount, bHasAnyLocalContent, eCloudStatus, nCloudProgressPercent } = d;
    cloudMemo.delete(appId);
    cloudMemo.set(appId, { bCloudEnabledForApp, bCloudEnabledForAccount, bHasAnyLocalContent, eCloudStatus, nCloudProgressPercent });
    while (cloudMemo.size > DETAILS_MEMO_MAX) cloudMemo.delete(cloudMemo.keys().next().value as number);
}

/** The remembered cloud fields for `appId` (Home's cloud button when Steam's store has none for the game), or undefined. */
export function memoCloud(appId: number): CloudDetails | undefined {
    return cloudMemo.get(appId);
}

/** The remembered achievement counts for `appId` (Home's Achievements chip when Steam's store has none), or undefined. */
export function memoAchievements(appId: number): KnownAchievements | undefined {
    return achievementMemo.get(appId);
}

/**
 * `game` with the remembered achievement counts when Steam's store has none for it (a game Steam did not load itself, or
 * a game page's first frame before Steam has loaded its details); Steam's own counts and shortcuts are left as they are.
 */
export function withKnownAchievements<T extends { appId: number; isShortcut: boolean; achievements: { achieved: number; total: number } | null }>(game: T): T {
    if (game.achievements || game.isShortcut) return game;
    const known = memoAchievements(game.appId);
    return known ? { ...game, achievements: { achieved: known.achieved, total: known.total } } : game;
}

/**
 * The space a game needs to install: Steam's details (`lDiskSpaceRequiredBytes`) when they have it, else the noted one.
 * Home and the game page both read it this way (Home read only the memo, empty for games whose callback it never got). Pure
 * apart from the memo.
 */
export function spaceRequiredOf(appId: number, details: unknown): number | undefined {
    const bytes = (details as { lDiskSpaceRequiredBytes?: unknown } | null | undefined)?.lDiskSpaceRequiredBytes;
    return typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : memoSpaceRequired(appId);
}

/** The space Steam says a game needs to install (`lDiskSpaceRequiredBytes`, from the details callback), if it was noted. */
export function memoSpaceRequired(appId: number): number | undefined {
    return spaceMemo.get(appId);
}

/** Remembers the space a game needs; anything but a positive number is ignored. Bounded like the other memos. */
function noteSpace(appId: number, details: unknown) {
    const bytes = (details as { lDiskSpaceRequiredBytes?: unknown } | null | undefined)?.lDiskSpaceRequiredBytes;
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return;
    spaceMemo.delete(appId);
    spaceMemo.set(appId, bytes);
    while (spaceMemo.size > DETAILS_MEMO_MAX) spaceMemo.delete(spaceMemo.keys().next().value as number);
}

/** Steam's local play time (minutes) from the game's details, the only one a non-Steam shortcut has (#52), or undefined. */
export function memoPlaytime(appId: number): number | undefined {
    return playtimeMemo.get(appId);
}

/** Remembers a game's `nPlaytimeForever`; anything but a positive number is ignored. Bounded like the other memos. */
function notePlaytime(appId: number, details: unknown) {
    const minutes = (details as { nPlaytimeForever?: unknown } | null | undefined)?.nPlaytimeForever;
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return;
    playtimeMemo.delete(appId);
    playtimeMemo.set(appId, minutes);
    while (playtimeMemo.size > DETAILS_MEMO_MAX) playtimeMemo.delete(playtimeMemo.keys().next().value as number);
}

/** The remembered assets for `appId`, or undefined. */
export function memoDetails(appId: number): LibraryAssets | undefined {
    return memo.get(appId);
}

/** Forgets everything (tests). */
export function resetDetailsMemo() {
    sink = null;
    memo.clear();
    achievementMemo.clear();
    cloudMemo.clear();
    spaceMemo.clear();
    playtimeMemo.clear();
}
