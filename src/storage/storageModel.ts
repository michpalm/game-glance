import type { MoveStart, StorageDrive, StorageGame, StorageSnapshot } from '../menu/steam/storage';

/**
 * The Storage page as data: drive cards, the picked drive's games, and what A, X and Y do on each
 * (spec 2026-11-13-console-settings-design, Part 2; Michael's pick C — buttons act on the focused game).
 * Pure: no React, no Steam.
 */
export interface DriveCard { index: number; name: string; kind: StorageDrive['kind']; free: string; line: string; usedRatio: number; moving: string | null }
export type GameButton = { label: string; run: 'page' | 'move' | 'pick-drive' | 'cancel' | 'uninstall' };
export interface GameRow { appId: number; name: string; status: string; size: string; progress: number | null;
    a: GameButton; x: GameButton | null; y: GameButton | null }
export interface StorageView { available: boolean; loading: boolean; cards: DriveCard[]; picked: number | null; eyebrow: string; rows: GameRow[]; empty: string | null; note: string | null }

const GB = 1e9, DAY = 86_400_000;
const PAGE: GameButton = { label: 'Game page', run: 'page' }, UNINSTALL: GameButton = { label: 'Uninstall', run: 'uninstall' };

/** As Steam shows sizes: decimal GB with one decimal, MB below 1 GB. */
export function sizeText(bytes: number): string {
    return bytes >= GB ? `${(bytes / GB).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
}
const wholeGb = (bytes: number) => String(Math.round(bytes / GB));

/** `lastPlayed` in unix seconds, `now` in ms; buckets by calendar day. */
export function lastPlayedText(lastPlayed: number, now: number): string {
    if (!lastPlayed) return 'Not played yet';
    const day = (ms: number) => { const d = new Date(ms); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY; };
    const days = Math.max(0, Math.round(day(now) - day(lastPlayed * 1000)));
    if (days === 0) return 'Played today';
    if (days === 1) return 'Played yesterday';
    if (days < 7) return `Played ${days} days ago`;
    if (days < 14) return 'Played last week';
    if (days < 60) return `Played ${Math.floor(days / 7)} weeks ago`;
    if (days <= 365) return `Played ${Math.floor(days / 30)} months ago`;
    return 'Played over a year ago';
}

function card(drive: StorageDrive, snapshot: StorageSnapshot): DriveCard {
    const used = Math.max(0, drive.capacityBytes - drive.freeBytes), count = drive.games.length;
    const move = snapshot.move;
    let moving: string | null = null;
    if (move && drive.games.some(g => g.appId === move.appId)) moving = `Moving out · ${(move.movedBytes / GB).toFixed(1)} of ${(move.totalBytes / GB).toFixed(1)} GB`;
    else if (move && move.toIndex === drive.index) moving = `Moving in · ${sizeText(Math.max(0, move.totalBytes - move.movedBytes))} to go`;
    return { index: drive.index, name: drive.name, kind: drive.kind, free: wholeGb(drive.freeBytes),
        line: `${wholeGb(used)} of ${wholeGb(drive.capacityBytes)} GB used · ${count} ${count === 1 ? 'game' : 'games'}`,
        usedRatio: drive.capacityBytes > 0 ? Math.min(1, used / drive.capacityBytes) : 0, moving };
}

function row(game: StorageGame, drive: StorageDrive, snapshot: StorageSnapshot, now: number): GameRow {
    const base = { appId: game.appId, name: game.name, size: sizeText(game.bytes), a: PAGE };
    const move = snapshot.move;
    if (game.appId === snapshot.runningAppId) return { ...base, status: 'Running now · Close the game first', progress: null, x: null, y: null };
    if (move?.appId === game.appId) {
        const share = move.totalBytes > 0 ? Math.min(1, move.movedBytes / move.totalBytes) : 0;
        const target = snapshot.drives.find(d => d.index === move.toIndex);
        const time = move.secondsLeft !== null ? ` · about ${Math.max(1, Math.round(move.secondsLeft / 60))} min left` : '';
        return { ...base, status: `${target ? `Moving to ${target.name}` : 'Moving'} · ${Math.round(share * 100)}%${time}`, progress: share,
            x: { label: 'Cancel move', run: 'cancel' }, y: null };
    }
    const others = snapshot.drives.filter(d => d.index !== drive.index);
    // One move at a time: while one runs, no other game offers X.
    const x: GameButton | null = move || !others.length ? null : others.length === 1 ? { label: `Move to ${others[0].name}`, run: 'move' } : { label: 'Move to…', run: 'pick-drive' };
    const status = snapshot.failedMove === game.appId ? `Couldn't move ${game.name}.` : lastPlayedText(game.lastPlayed, now);
    return { ...base, status, progress: null, x, y: UNINSTALL };
}

export function storageView(snapshot: StorageSnapshot, picked: number | null, now: number, note: string | null): StorageView {
    if (!snapshot.available || !snapshot.drives.length) return { available: false, loading: snapshot.loading, cards: [], picked: null, eyebrow: '', rows: [], empty: null, note };
    const drive = snapshot.drives.find(d => d.index === picked) ?? snapshot.drives[0];
    return {
        available: true, loading: false, picked: drive.index, note,
        cards: snapshot.drives.map(d => card(d, snapshot)),
        eyebrow: `On ${drive.kind === 'internal' ? 'the internal drive' : drive.name} · biggest first`,
        rows: drive.games.map(g => row(g, drive, snapshot, now)),
        empty: drive.games.length ? null : 'No games on this drive',
    };
}

/** The note shown when a move is turned down before it starts. */
export function refusal(result: MoveStart, game: StorageGame, target: StorageDrive): string | null {
    switch (result) {
        case 'no-space': return `Not enough space on ${target.name}: needs ${sizeText(game.bytes)}, ${sizeText(target.freeBytes)} free.`;
        case 'busy': return 'One move at a time.';
        case 'running': return 'Close the game first.';
        case 'failed': return `Couldn't move ${game.name}.`;
        case 'started': case 'cancelled': return null;
    }
}

/** After the list changed: the same game, else the one now in its place, else the last one, else null (the drive card). */
export function nextGameFocus(before: number[], after: number[], was: number | null): number | null {
    if (was === null || !after.length) return null;
    if (after.includes(was)) return was;
    const index = before.indexOf(was);
    return after[Math.min(Math.max(index, 0), after.length - 1)];
}

/** After a render: the focus key to restore, only when the list of games changed and focus was lost; the drive card when no game is left. */
export function refocusKey(before: number[], after: number[], was: number | null, lost: boolean, picked: number | null): string | null {
    if (!lost || before.join() === after.join()) return null;
    const next = nextGameFocus(before, after, was);
    return next !== null ? `storage:game:${next}` : picked !== null ? `storage:drive:${picked}` : null;
}

export interface Question { title: string; text: string; ok: string }
/** Asked before a move starts (Michael, 2026-11-17). */
export function moveQuestion(game: StorageGame, from: StorageDrive, to: StorageDrive): Question {
    return { title: `Move ${game.name} to ${to.name}?`, text: `${sizeText(game.bytes)} moves from ${from.name} to ${to.name}. You can keep playing other games while it moves.`, ok: 'Move' };
}
/** Asked before an uninstall: Steam's own dialog is not reachable from a plugin. */
export function uninstallQuestion(game: StorageGame, drive: StorageDrive): Question {
    return { title: `Uninstall ${game.name}?`, text: `${sizeText(game.bytes)} on ${drive.name} will be freed.`, ok: 'Uninstall' };
}
