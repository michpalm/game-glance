import { useEffect, useState, useSyncExternalStore } from 'react';
import type { NativeRequest } from '../steam/runtime';
import type { SoundtrackService } from '../steam/soundtrack';
import { SoundtrackPanel } from './SoundtrackPanel';

/** Steam reports position about once a second and volume per step: a moved slider keeps its value until Steam catches up. */
function useDraft(): [number | null, (value: number) => void] {
    const [draft, setDraft] = useState<number | null>(null);
    useEffect(() => {
        if (draft === null) return;
        const timer = setTimeout(() => setDraft(null), 1500);
        return () => clearTimeout(timer);
    }, [draft]);
    return [draft, setDraft];
}

export function SoundtrackSection({ service, handoff }: { service: SoundtrackService; handoff(request: NativeRequest): void }) {
    const s = useSyncExternalStore(service.subscribe, service.get);
    const [position, setPosition] = useDraft();
    const [volume, setVolume] = useDraft();
    const shown = { ...s, positionMs: position ?? s.positionMs, volume: volume ?? s.volume };
    return <SoundtrackPanel s={shown} a={{
        togglePlay: service.togglePlay, previous: service.previous, next: service.next, toggleShuffle: service.toggleShuffle, cycleRepeat: service.cycleRepeat,
        seek: ms => { setPosition(ms); service.seek(ms); },
        setVolume: value => { setVolume(value); service.setVolume(value); },
        browse: () => handoff({ kind: 'navigate', destination: 'soundtracks' }),
    }} />;
}
