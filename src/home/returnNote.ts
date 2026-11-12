import type { Zone } from './focusZones';
import { RESTORE_MAX_AGE_MS } from './homeMemory';
import type { PageLook } from './openTargets';

/**
 * Whether Home's return from a game page glides (spec docs/superpowers/specs/2026-11-12-page-return-glide-design.md):
 * a morph open notes its game, page look and viewport here; Home's return mount takes the note once and glides only
 * back to that game, from the game cards or the action row, with the page at its top and the viewport unchanged.
 * Every other way out of Home clears it. Module state, never stored; like homeMemory.
 */

export type Size = { width: number; height: number };
export type ReturnWay = 'glide' | 'fade';

let note: { appId: number; look: PageLook; viewport: Size; at: number } | null = null;

const GLIDE_ZONES: readonly Zone[] = ['recents', 'actions'];

/** Home opened `appId`'s page with the morph. */
export function noteMorphOpen(appId: number, look: PageLook, viewport: Size, now: number = Date.now()): void {
    if (!Number.isInteger(appId) || appId <= 0 || !(viewport.width > 0) || !(viewport.height > 0)) return;
    note = { appId, look, viewport: { width: viewport.width, height: viewport.height }, at: now };
}

export function clearReturn(): void {
    note = null;
}

const fresh = (now: number) => note !== null && now >= note.at && now - note.at <= RESTORE_MAX_AGE_MS;

/** The pending note's look when Home is returning to `appId` in `zone` (no take): for the first render's page CSS. */
export function peekReturn(appId: number | null, zone: Zone, now: number = Date.now()): PageLook | null {
    if (!note || !fresh(now) || appId !== note.appId || !GLIDE_ZONES.includes(zone)) return null;
    return note.look;
}

/** Takes the note (once) and decides. */
export function takeReturn(q: { appId: number | null; zone: Zone; viewport: Size; atTop: boolean }, now: number = Date.now()): { way: ReturnWay; look: PageLook | null } {
    const look = peekReturn(q.appId, q.zone, now);
    const taken = note;
    note = null;
    const same = taken !== null && taken.viewport.width === q.viewport.width && taken.viewport.height === q.viewport.height;
    return look !== null && same && q.atTop ? { way: 'glide', look } : { way: 'fade', look: null };
}
