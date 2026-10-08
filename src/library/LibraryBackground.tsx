import React, { useEffect, useState } from 'react';

interface LibraryBackgroundProps {
    candidates?: string[];
    heroUrl?: string;
    fallbackUrl?: string;
}

export function LibraryBackground({ candidates, heroUrl, fallbackUrl }: LibraryBackgroundProps) {
    const list = React.useMemo(() => {
        const arr: string[] = [];
        if (Array.isArray(candidates) && candidates.length > 0) {
            arr.push(...candidates.filter((u): u is string => typeof u === 'string' && u.length > 0));
        }
        if (heroUrl) arr.push(heroUrl);
        if (fallbackUrl) arr.push(fallbackUrl);
        return [...new Set(arr)];
    }, [candidates, heroUrl, fallbackUrl]);

    const [layers, setLayers] = useState<{ current: string; previous: string | null }>({
        current: list[0] ?? '',
        previous: null,
    });

    useEffect(() => {
        if (list.length === 0) return;

        let cancelled = false;

        const tryLoad = (idx: number) => {
            if (idx >= list.length || cancelled) return;
            const url = list[idx];
            const img = new Image();
            img.src = url;
            img.onload = () => {
                if (cancelled) return;
                setLayers((prev) => {
                    if (prev.current === url) return prev;
                    return { current: url, previous: prev.current };
                });
            };
            img.onerror = () => {
                if (cancelled) return;
                // Automatically fall back to next candidate (e.g. if custom art 404s, load local hero or CDN)
                tryLoad(idx + 1);
            };
        };

        tryLoad(0);

        return () => {
            cancelled = true;
        };
    }, [list]);

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
