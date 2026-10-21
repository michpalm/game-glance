/** A game Lutris added to Steam: its id in Lutris's library, and whether it is the Flatpak install (which decides the database). */
export interface LutrisRef {
    gameId: number;
    flatpak: boolean;
}

/**
 * Reads the Lutris link from a Steam shortcut's launch options, as Lutris writes it (probed on the Ally, 2026-10-21,
 * Lutris 0.5.22): the Flatpak's is `run net.lutris.Lutris lutris:rungameid/<id>` with the exe `/usr/bin/flatpak`, a native
 * one's is `lutris:rungameid/<id>` with the exe `lutris`. The id pattern is Lutris's own (`matches_id`), so a launch
 * configuration after the id (`/<config>`) keeps the id.
 */
export function parseLutrisLaunch(launchOptions: string | undefined | null): LutrisRef | null {
    if (typeof launchOptions !== 'string') return null;
    const id = launchOptions.match(/lutris:rungameid\/(\d+)/)?.[1];
    const gameId = id === undefined ? 0 : Number(id);
    if (!Number.isSafeInteger(gameId) || gameId <= 0) return null;
    return { gameId, flatpak: /net\.lutris\.Lutris/.test(launchOptions) };
}
