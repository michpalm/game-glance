import { useEffect, useState } from 'react';
import { readSizeLabel } from '../data/unifideckLabel';

const QUICK_MS = 100;
const QUICK_TICKS = 30; // 3 s, as the page opens
const SLOW_MS = 1500; // then the install state may change it (Installed size / Space required)

/** Labels read this session, by game and install state, so a revisit shows Unifideck's word at once. */
const seen = new Map<string, string>();

/**
 * Unifideck's own word for its size item (data/unifideckLabel), read from its hidden row in the page `doc`; null until it has
 * been seen (the caller then uses our English). During a download the row has no meta items: the last label stays.
 * `doc` is the page's document (a marker in the page tells which window it is: this code runs in another one).
 */
export function useUnifideckSizeLabel(doc: Document | null, appId: number, installed: boolean | null | undefined, active: boolean): string | null {
    const key = `${appId}:${installed ? 1 : 0}`;
    const [label, setLabel] = useState<{ key: string; text: string } | null>(null);
    useEffect(() => {
        if (!active || !doc || typeof installed !== 'boolean') return undefined;
        const read = () => {
            const text = readSizeLabel(doc);
            if (text === null) return;
            seen.set(key, text);
            setLabel((old) => (old && old.key === key && old.text === text ? old : { key, text }));
        };
        read();
        let ticks = 0;
        let timer = setInterval(() => {
            read();
            if (++ticks === QUICK_TICKS) {
                clearInterval(timer);
                timer = setInterval(read, SLOW_MS);
            }
        }, QUICK_MS);
        return () => clearInterval(timer);
    }, [doc, key, active, installed]);
    if (!active || typeof installed !== 'boolean') return null;
    return label && label.key === key ? label.text : seen.get(key) ?? null;
}
