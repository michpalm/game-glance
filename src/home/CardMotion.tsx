import { useEffect, useState } from 'react';

/** Steam's calendar cycles screenshots once a second when microtrailers are off. */
export const SHOT_MS = 1000;

/** The next screenshot of a cycle of `count`, wrapping. Pure. */
export function nextShot(at: number, count: number): number {
    return count > 0 ? (at + 1) % count : 0;
}

/**
 * What a focused calendar card plays over its art, as Steam's own calendar does: the game's microtrailer (looping,
 * muted, no controls); with Steam's "disable microtrailers" store preference on, its screenshots, one a second; with
 * neither, nothing (the art stays). Mounted only while the card has focus, so nothing loads for cards passed over.
 */
export function CardMotion({ clip, shots, off }: { clip: string | null; shots: string[]; off: boolean }) {
    const [at, setAt] = useState(0);
    const cycling = off && shots.length > 1;
    useEffect(() => {
        if (!cycling) return undefined;
        const timer = setInterval(() => setAt((i) => nextShot(i, shots.length)), SHOT_MS);
        return () => clearInterval(timer);
    }, [cycling, shots.length]);
    if (!off && clip) return <video className="gh-card-clip" src={clip} autoPlay loop muted playsInline controls={false} aria-hidden="true" />;
    if (!off || shots.length === 0) return null;
    return (
        <div className="gh-card-shots" aria-hidden="true">
            {shots.map((src, i) => <img key={src} className={`gh-card-shot${i === at ? ' gh-card-shot-on' : ''}`} src={src} alt="" />)}
        </div>
    );
}
