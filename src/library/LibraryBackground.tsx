import { useEffect, useState } from 'react';

interface LibraryBackgroundProps {
    heroUrl?: string;
    fallbackUrl?: string;
}

export function LibraryBackground({ heroUrl, fallbackUrl }: LibraryBackgroundProps) {
    const activeUrl = heroUrl || fallbackUrl || '';
    const [layers, setLayers] = useState<{ current: string; previous: string | null }>({
        current: activeUrl,
        previous: null,
    });

    useEffect(() => {
        if (!activeUrl || activeUrl === layers.current) return;

        // Preload before fading
        const img = new Image();
        img.src = activeUrl;
        img.onload = () => {
            setLayers((prev) => ({
                current: activeUrl,
                previous: prev.current,
            }));
        };
        img.onerror = () => {
            // If image fails, switch anyway
            setLayers((prev) => ({
                current: activeUrl,
                previous: prev.current,
            }));
        };
    }, [activeUrl, layers.current]);

    // Clear previous layer after transition finishes
    useEffect(() => {
        if (!layers.previous) return;
        const timer = setTimeout(() => {
            setLayers((prev) => ({ ...prev, previous: null }));
        }, 500);
        return () => clearTimeout(timer);
    }, [layers.previous]);

    return (
        <div className="sgl-bg-container" aria-hidden="true">
            {layers.previous && (
                <div
                    className="sgl-bg-layer"
                    style={{
                        backgroundImage: `url("${layers.previous.replace(/"/g, '%22')}")`,
                        opacity: 0,
                    }}
                />
            )}
            {layers.current && (
                <div
                    className="sgl-bg-layer"
                    style={{
                        backgroundImage: `url("${layers.current.replace(/"/g, '%22')}")`,
                        opacity: 1,
                    }}
                />
            )}
            <div className="sgl-bg-vignette" />
        </div>
    );
}
