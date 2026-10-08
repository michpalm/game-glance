import { useEffect, useMemo, useRef, useState } from 'react';
import type { Chip } from './chips';

function ChipView({ chip }: { chip: Chip }) {
    const progress = chip.progress;
    return (
        <div className="gh-chip">
            <div className="gh-chip-label">{chip.label}</div>
            <div className="gh-chip-value">{chip.value}</div>
            {progress !== undefined && Number.isFinite(progress) && (
                <div className="gh-chip-bar">
                    <div className="gh-chip-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
                </div>
            )}
        </div>
    );
}

/**
 * Title, eyebrow (accent) and stat chips. The parent `.gh-title-block` column also holds the actions. The title sits at the bottom
 * of a two-line slot and the chip row is always there at a fixed height, so a longer title only grows upward and
 * the eyebrow, chips and actions never move when the game changes (homeCss.titleBlockLayout).
 *
 * When `logoUrls` contains candidate URLs (custom art, Steam details logo, CDN fallback), the game's logo is shown in
 * place of the text title. If all logo candidates fail or none exist, it gracefully falls back to the text title.
 */
export function TitleBlock({
    eyebrow,
    title,
    chips,
    logoUrls,
    preferLogos = true,
}: {
    eyebrow: string;
    title: string;
    chips: Chip[];
    logoUrls?: string[];
    preferLogos?: boolean;
}) {
    const urls = useMemo(() => (preferLogos && logoUrls ? logoUrls.filter(Boolean) : []), [preferLogos, logoUrls]);
    const [candIndex, setCandIndex] = useState(0);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [allFailed, setAllFailed] = useState(false);
    const [showFallbackText, setShowFallbackText] = useState(urls.length === 0);

    const urlsKey = `${title}|${urls.join('|')}`;
    const prevKey = useRef(urlsKey);
    if (prevKey.current !== urlsKey) {
        prevKey.current = urlsKey;
        setCandIndex(0);
        setLogoLoaded(false);
        setAllFailed(false);
        setShowFallbackText(urls.length === 0);
    }

    useEffect(() => {
        if (urls.length === 0) {
            setShowFallbackText(true);
            return;
        }
        setShowFallbackText(false);
        const timer = setTimeout(() => {
            setShowFallbackText(true);
        }, 350);
        return () => clearTimeout(timer);
    }, [urlsKey, urls.length]);

    const currentUrl = candIndex < urls.length ? urls[candIndex] : null;

    const handleError = () => {
        if (candIndex + 1 < urls.length) {
            setCandIndex((i) => i + 1);
            setLogoLoaded(false);
        } else {
            setAllFailed(true);
            setShowFallbackText(true);
        }
    };

    const handleLoad = () => {
        setLogoLoaded(true);
        setShowFallbackText(false);
    };

    const shouldTryLogo = Boolean(currentUrl) && !allFailed;
    const shouldShowFallback = !logoLoaded && (urls.length === 0 || allFailed || showFallbackText);

    return (
        <>
            <div className="gh-title-slot">
                {shouldTryLogo && currentUrl && (
                    <img
                        key={currentUrl}
                        className="gh-logo"
                        src={currentUrl}
                        alt={title}
                        onLoad={handleLoad}
                        onError={handleError}
                        style={logoLoaded ? undefined : { position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                    />
                )}
                {shouldShowFallback && <div className="gh-title">{title}</div>}
            </div>
            <div className="gh-eyebrow">{eyebrow}</div>
            <div className="gh-chips">
                {chips.map((chip) => (
                    <ChipView key={chip.key} chip={chip} />
                ))}
            </div>
        </>
    );
}
