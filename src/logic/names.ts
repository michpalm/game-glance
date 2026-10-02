const SYMBOLS = /[™®©]/g;
const EDITION_SUFFIXES = [
    /\s*[-–—:]?\s*game of the year edition$/i,
    /\s*[-–—:]?\s*goty(\s+edition)?$/i,
    /\s*[-–—:]?\s*definitive edition$/i,
    /\s*[-–—:]?\s*complete edition$/i,
    /\s*[-–—:]?\s*remastered$/i,
];

/** Title cleaned for a second HowLongToBeat search; never empty unless the input is blank. */
export function cleanTitle(name: string): string {
    let out = name.replace(SYMBOLS, '').trim();
    let changed = true;
    while (changed) {
        changed = false;
        for (const suffix of EDITION_SUFFIXES) {
            const next = out.replace(suffix, '').trim();
            if (next !== out && next.length > 0) {
                out = next;
                changed = true;
            }
        }
    }
    out = out.replace(/\s+/g, ' ').trim();
    return out.length > 0 ? out : name.trim();
}

function titleKey(name: string): string {
    return cleanTitle(name)
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
}

/** True when two store names are the same game: equal after cleaning, ignoring case, accents and punctuation. */
export function sameTitle(a: string, b: string): boolean {
    const key = titleKey(a);
    return key.length > 0 && key === titleKey(b);
}
