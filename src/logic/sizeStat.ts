import { formatBytes } from './format';

/** A size item for our info card (a Unifideck game's install or download size), shaped like the other stats. */
export interface SizeStat {
    key: 'size';
    label: string;
    value: string;
}

/**
 * "Installed size" for an installed game, "Install size" (Unifideck's "space required") for one that is not; null
 * when the size is unknown (never "0 B"). Pure.
 */
export function sizeStat(bytes: number | null | undefined, installed: boolean, locale: string): SizeStat | null {
    const value = formatBytes(bytes, locale);
    return value === null ? null : { key: 'size', label: installed ? 'Installed size' : 'Install size', value };
}
