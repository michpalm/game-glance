/**
 * The ProtonDB chip's mark: an atom (three orbits round a nucleus), drawn only in lines in the text colour, which
 * homeCss sets to the rating's. Simple Icons' ProtonDB logo is a filled tile with the atom cut out of it, which read
 * as a coloured square at chip size (seen on the Deck, 2026-11-10).
 */
export function ProtonMark() {
    return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.6">
                <ellipse cx="12" cy="12" rx="10.4" ry="4" />
                <ellipse cx="12" cy="12" rx="10.4" ry="4" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="10.4" ry="4" transform="rotate(-60 12 12)" />
            </g>
            <circle cx="12" cy="12" r="2.1" fill="currentColor" />
        </svg>
    );
}
