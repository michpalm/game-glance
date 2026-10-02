import { useSyncExternalStore } from 'react';
import { overrides } from '../data/cache';

export function useOverrideVersion(): number {
    return useSyncExternalStore(overrides.subscribe, overrides.version);
}
