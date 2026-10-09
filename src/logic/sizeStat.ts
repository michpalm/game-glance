import { formatBytes } from './format';

/** A size item for our info card (a Unifideck game's install or download size), shaped like the other stats. */
export interface SizeStat {
    key: 'size';
    label: string;
    value: string;
}

/**
 * The size item: labelled with Unifideck's own word for it when known (`nativeLabel`, read from its row: translated by Unifideck),
 * else our English: "Installed size" for an installed game, "Install size" for one that is not. Null when the size is unknown
 * (never "0 B"). Pure.
 */
export function sizeStat(bytes: number | null | undefined, installed: boolean, locale: string, nativeLabel: string | null = null): SizeStat | null {
    const value = formatBytes(bytes, locale);
    return value === null ? null : { key: 'size', label: nativeLabel || (installed ? 'Installed size' : 'Install size'), value };
}
