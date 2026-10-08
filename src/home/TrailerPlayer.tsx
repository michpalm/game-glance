import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { GameTrailer } from './trailers';

interface TrailerPlayerProps {
    trailer: GameTrailer;
    active: boolean;
    onDismiss?(): void;
}

export function TrailerPlayer({ trailer, active, onDismiss }: TrailerPlayerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const hlsRef = useRef<Hls | null>(null);

    // Reset playing state when inactive or trailer URL changes
    useEffect(() => {
        if (!active) {
            setIsPlaying(false);
        }
    }, [active, trailer.url]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !active) return undefined;

        // Force browser muted state for strict autoplay compliance
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;

        let destroyed = false;

        const cleanup = () => {
            destroyed = true;
            if (hlsRef.current) {
                try {
                    hlsRef.current.destroy();
                } catch {
                    // ignore
                }
                hlsRef.current = null;
            }
            if (video) {
                try {
                    video.pause();
                    video.removeAttribute('src');
                    video.load();
                } catch {
                    // ignore
                }
            }
        };

        const handlePlaying = () => {
            if (!destroyed) {
                setIsPlaying(true);
            }
        };

        const handleError = (e?: unknown) => {
            console.warn('[game-glance] Trailer video error, attempting fallback or dismiss', e);
            if (destroyed) return;

            // Try fallback URL if HLS errored and fallback exists
            if (trailer.fallbackUrl && video.src !== trailer.fallbackUrl) {
                if (hlsRef.current) {
                    try {
                        hlsRef.current.destroy();
                    } catch {
                        // ignore
                    }
                    hlsRef.current = null;
                }
                video.src = trailer.fallbackUrl;
                video.play().catch(() => {
                    setIsPlaying(false);
                    onDismiss?.();
                });
                return;
            }

            setIsPlaying(false);
            onDismiss?.();
        };

        video.addEventListener('playing', handlePlaying);
        video.addEventListener('error', handleError);

        try {
            if (trailer.isHls && Hls.isSupported()) {
                const hls = new Hls({
                    autoStartLoad: true,
                    startLevel: -1,
                    enableWorker: false, // safer in CEF environment
                    lowLatencyMode: false,
                });
                hlsRef.current = hls;

                hls.loadSource(trailer.url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (!destroyed) {
                        video.play().catch(() => {
                            setTimeout(() => {
                                if (!destroyed) video.play().catch(handleError);
                            }, 100);
                        });
                    }
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        console.warn('[game-glance] HLS fatal error:', data.type, data.details);
                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                            hls.startLoad();
                        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                            hls.recoverMediaError();
                        } else {
                            handleError(data);
                        }
                    }
                });
            } else if (trailer.fallbackUrl) {
                video.src = trailer.fallbackUrl;
                video.play().catch(handleError);
            } else if (trailer.url) {
                video.src = trailer.url;
                video.play().catch(handleError);
            }
        } catch (err) {
            handleError(err);
        }

        return () => {
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('error', handleError);
            cleanup();
        };
    }, [trailer.url, trailer.isHls, trailer.fallbackUrl, active, onDismiss]);

    // Safety timeout: if after 4 seconds of being active the video hasn't started playing, dismiss
    useEffect(() => {
        if (!active || isPlaying) return undefined;
        const timeout = setTimeout(() => {
            if (!isPlaying) {
                console.warn('[game-glance] Trailer timed out waiting for playback, reverting to hero art');
                onDismiss?.();
            }
        }, 4000);
        return () => clearTimeout(timeout);
    }, [active, isPlaying, onDismiss]);

    return (
        <div className={`gh-trailer${active && isPlaying ? ' gh-trailer-active' : ''}`} aria-hidden="true">
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
