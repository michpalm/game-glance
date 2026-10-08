import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import type { GameTrailer } from './trailers';

interface TrailerPlayerProps {
    trailer: GameTrailer;
    active: boolean;
}

export function TrailerPlayer({ trailer, active }: TrailerPlayerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !active) return undefined;

        let hls: Hls | null = null;

        try {
            if (trailer.isHls && Hls.isSupported()) {
                hls = new Hls({
                    autoStartLoad: true,
                    startLevel: -1, // automatic quality selection
                    capLevelToPlayerSize: true,
                });
                hls.loadSource(trailer.url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(() => {});
                });
            } else if (trailer.isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = trailer.url;
                video.play().catch(() => {});
            } else {
                video.src = trailer.url;
                video.play().catch(() => {});
            }
        } catch {
            // video fallback handled gracefully
        }

        return () => {
            try {
                if (hls) {
                    hls.destroy();
                    hls = null;
                }
                if (video) {
                    video.pause();
                    video.removeAttribute('src');
                    video.load();
                }
            } catch {
                // cleanup
            }
        };
    }, [trailer.url, trailer.isHls, active]);

    return (
        <div className={`gh-trailer${active ? ' gh-trailer-active' : ''}`} aria-hidden="true">
            <video
                ref={videoRef}
                className="gh-trailer-video"
                autoPlay
                muted
                loop
                playsInline
            />
        </div>
    );
}
