import { useEffect, useState } from 'react';
import { unavailableMessageSelectors } from '../styles/theme';
import { readUnavailableMessage, UnavailableMessage } from '../styles/unavailableMessage';

/** Last played and Steam's installation restriction share one wrapping metadata line below the title. */
export function GameMetadata({ doc, eyebrow }: { doc: Document | null; eyebrow: string | null }) {
    const [message, setMessage] = useState<UnavailableMessage | null>(null);
    useEffect(() => {
        if (!doc) return undefined;
        const selectors = unavailableMessageSelectors();
        if (!selectors.message) return undefined;
        const update = () => {
            const next = readUnavailableMessage(doc, selectors.message);
            setMessage((old) => JSON.stringify(old) === JSON.stringify(next) ? old : next);
        };
        update();
        // Observe Steam's action row, not our mirrored text. Fallback covers a row mounted after our marker.
        const target = selectors.container ? doc.querySelector(selectors.container) ?? doc.body : doc.body;
        const observer = new MutationObserver(update);
        observer.observe(target, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'src', 'alt'] });
        return () => observer.disconnect();
    }, [doc]);
    if (!eyebrow && !message) return null;
    return (
        <div className="gg-metadata">
            {eyebrow && <div className="gg-eyebrow">{eyebrow}</div>}
            {message && <div className="gg-availability">
                {message.text}
                {message.icons.map((icon, i) => <img key={`${icon.src}:${i}`} src={icon.src} alt={icon.alt} />)}
            </div>}
        </div>
    );
}
