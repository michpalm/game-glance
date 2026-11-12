/**
 * Spotlight Home's side margin, in canvas px (the 1440-wide canvas scales to the screen, so a canvas inset is a fixed share of its
 * width). The handheld gets 28 (1.9 %: 20 css px on the Deck, where the status bar ends; the handoff's 56 left the title, buttons and pills
 * well inside the status bar and the game cards). A TV (docked, screenScale.isTvScreen)
 * gets 24 (1.7 %: the status dot's centre line, 32 of 1920 px, so the store pill ends under the dot and the title and buttons start the same distance in), as 56 read too far from the edge on a big screen.
 * The title block and the store pill sit on this inset; on the handheld the recents row, the tabs and the feed sit on it too
 * (ROW_OFFSET 0: a card set further out than the text read as misaligned on the small screen), so every edge is one line.
 */
export const SIDE_INSET = { handheld: 28, tv: 24 } as const;
export const ROW_OFFSET = 0;
/** A TV's rows reach out only 4 (the first card sat too tight to the edge at 12), so they start 20 in. */
export const TV_ROW_OFFSET = 4;
/** Where the store pill ends, from the right edge: the handheld's 28 (the status bar's end); a TV's 19, so it ends where the status dot ends (20 css px in). */
export const PILL_INSET = { handheld: 28, tv: 19 } as const;

export function sideInset(tv: boolean): number {
    return tv ? SIDE_INSET.tv : SIDE_INSET.handheld;
}

/** How far the recents row, the tabs and the feed start from the screen's left edge, for a side inset. */
export function rowInset(side: number, tv = false): number {
    return side - (tv ? TV_ROW_OFFSET : ROW_OFFSET);
}

export function pillInset(tv: boolean): number {
    return tv ? PILL_INSET.tv : PILL_INSET.handheld;
}
