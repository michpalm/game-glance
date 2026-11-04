import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { pageCloudNeeded } from '../data/unifideckCloud';
import { unifideckCloudCss } from './unifideckCloudStyle';
import { useUnifideckCloud } from '../home/useCloud';

/** How long the page is watched for Unifideck's row (it mounts after ours). */
const FIND_FOR_MS = 10_000;

/** Unifideck's round buttons' row (its controller and settings buttons' parent) in `doc`, and a button's classes to wear. */
function findRow(doc: Document): { row: Element; className: string } | null {
    const button = doc.querySelector('.unifideck-icon-btn');
    // Its classes without Steam's focus marks (the button may hold focus as it is read).
    const className = button ? [...button.classList].filter((c) => !c.startsWith('gpfocus')).join(' ') : '';
    return button?.parentElement ? { row: button.parentElement, className } : null;
}

/**
 * A Unifideck game's cloud on its page, in Game Glance's look: Unifideck's own cloud button wears our white cloud and
 * state dot (unifideckCloudStyle), and a game Unifideck draws no button for (data/unifideckCloud.pageCloudNeeded: not
 * installed) gets our display-only circle after the settings button, in Unifideck's round-button classes so it sits like
 * its neighbours. Lives in the page's window (found from a marker element, as UnifideckRowNav).
 */
export function UnifideckCloud({ appId, installed }: { appId: number; installed: boolean | null | undefined }) {
    const marker = useRef<HTMLSpanElement>(null);
    const [row, setRow] = useState<{ row: Element; className: string } | null>(null);
    const cloud = useUnifideckCloud(appId, true);
    const ownCircle = installed === false;
    useEffect(() => {
        if (!ownCircle) return undefined;
        const doc = marker.current?.ownerDocument;
        if (!doc) return undefined;
        const found = findRow(doc);
        if (found) {
            setRow(found);
            return undefined;
        }
        const started = Date.now();
        const timer = setInterval(() => {
            const next = findRow(doc);
            if (next || Date.now() - started > FIND_FOR_MS) clearInterval(timer);
            if (next) setRow(next);
        }, 100);
        return () => clearInterval(timer);
    }, [appId, ownCircle]);
    const show = row && cloud && pageCloudNeeded(installed, cloud) && row.row.isConnected;
    return (
        <>
            <span ref={marker} style={{ display: 'none' }} />
            {cloud && <style>{unifideckCloudCss(cloud.tone)}</style>}
            {show && createPortal(<div className={`${row.className} gg-uni-cloud`} aria-label={cloud.label} role="img" />, row.row)}
        </>
    );
}
