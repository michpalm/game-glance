import { useSyncExternalStore } from 'react';
import type { HltbResult } from './hltb';
import type { GameInfo } from './steam';

interface CurrentGame {
    game: GameInfo | null;
    hltb: HltbResult | undefined;
}

let current: CurrentGame = { game: null, hltb: undefined };
const listeners = new Set<() => void>();

export function setCurrentGame(game: GameInfo | null, hltb?: HltbResult): void {
    current = { game, hltb };
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useCurrentGame(): CurrentGame {
    return useSyncExternalStore(subscribe, () => current);
}
