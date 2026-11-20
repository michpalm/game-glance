import { formatBytes } from './format';

/** A size item for our info card (a Unifideck game's install or download size), shaped like the other stats. */
export interface SizeStat {
    key: 'size';
    label: string;
    value: string;
}

/**
 * The size item: labelled with Unifideck's own word for it when known (`nativeLabel`, read from its row: translated by Unifideck),
 * else Unifideck's English: "Installed size" for an installed game, "Space required" for one that is not. Null when the size
 * is unknown (never "0 B"). Pure.
 */
export function sizeStat(bytes: number | null | undefined, installed: boolean, locale: string, nativeLabel: string | null = null): SizeStat | null {
    const value = formatBytes(bytes, locale);
    return value === null ? null : { key: 'size', label: nativeLabel || (installed ? 'Installed size' : 'Space required'), value };
}

/** Unifideck's own words for the size, as read from its row on a game page (they are translated by Unifideck), by install state. */
const sizeLabels = new Map<boolean, string>();

/** Keeps Unifideck's word (read on a game page) so Home's open draws the page's label. */
export function rememberSizeLabel(installed: boolean, label: string | null | undefined) {
    if (typeof label === 'string' && label.trim()) sizeLabels.set(installed, label.trim());
}

/** Unifideck's word for the size in this install state, when a page has shown it this session; else null. */
export function knownSizeLabel(installed: boolean): string | null {
    return sizeLabels.get(installed) ?? null;
}

export function resetSizeLabels() {
    sizeLabels.clear();
}

/**
 * A Steam game's "Space Required" item on its page (`label`: Steam's own word, in its language): shown only for a game Steam
 * reports as not installed (no size on disk), from the space Steam says it needs. Null when installed or unknown. Pure.
 */
export function steamSpaceStat(overview: unknown, spaceBytes: number | null | undefined, locale: string, label: string): SizeStat | null {
    const onDisk = Number((overview as { size_on_disk?: unknown } | null | undefined)?.size_on_disk ?? 0);
    if (onDisk > 0) return null;
    return sizeStat(spaceBytes ?? null, false, locale, label);
}

/**
 * What Home's Install pill shows at its right end (as the page's, themeCss.buildInstallSizeCss): the space the game needs
 * while it is not installed and not downloading, formatted; null otherwise or when unknown. A Unifideck game uses
 * Unifideck's own install state and size (`unifideck`), a Steam game Steam's. Pure.
 */
export function installSizeText(
    g: { installed: boolean; downloading: boolean; steamBytes: number | null | undefined; unifideck?: { installed: boolean; bytes: number | null | undefined } | null },
    locale: string,
): string | null {
    if (g.downloading) return null;
    if (g.unifideck) return g.unifideck.installed ? null : formatBytes(g.unifideck.bytes, locale);
    return g.installed ? null : formatBytes(g.steamBytes, locale);
}
