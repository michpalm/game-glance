import {backendKv,type KvBackend} from '../data/kv';
import { DEFAULT_PINS, isPinnedSection, validPins, type PinnedSectionId, type Stop } from './model';

export type SocialKeyboardMode = 'compact' | 'radial';
export interface MenuPreferences {
    readonly socialKeyboard: SocialKeyboardMode;
    readonly version: 1;
    readonly enabled: boolean;
    readonly pins: readonly PinnedSectionId[];
}
const KEY = 'menu:preferences';
const MOCK_IDS: Record<number, PinnedSectionId> = { 0: 'navigate', 1: 'quick-settings', 2: 'performance', 3: 'social', 4: 'plugins', 6: 'soundtrack', 7: 'help' };
function snapshot(enabled: boolean, pins: readonly PinnedSectionId[], socialKeyboard: SocialKeyboardMode = 'compact'): MenuPreferences {
    return Object.freeze({ version: 1, enabled, socialKeyboard, pins: Object.freeze([...pins]) });
}
function readPins(raw: Record<string, unknown>): PinnedSectionId[] {
    const source = Array.isArray(raw.pins) ? raw.pins : Array.isArray(raw.barMenus) ? raw.barMenus.map(id => MOCK_IDS[id]) : [];
    const pins = [...new Set(source.filter(isPinnedSection))].slice(0, 4);
    return pins.length ? pins : [...DEFAULT_PINS];
}
export function createMenuPreferences(kv: KvBackend) {
    let current = snapshot(false, DEFAULT_PINS);
    let futureSchema = false;
    let loadState: 'unloaded' | 'loading' | 'ready' | 'failed' = 'unloaded';
    let loading: Promise<void> | undefined;
    let saves: Promise<void> = Promise.resolve();
    const listeners = new Set<Stop>();
    const emit = () => listeners.forEach(listener => listener());
    function save(next: MenuPreferences): Promise<void> {
        if (futureSchema) return Promise.reject(new Error('Menu preferences require a newer Game Glance version'));
        current = next;
        emit();
        const pending = saves.then(() => kv.set(KEY, next));
        saves = pending.catch(() => undefined);
        return pending;
    }
    return {
        load(): Promise<void> {
            if (loading) return loading;
            loadState = 'loading'; emit();
            loading = (async () => {
                try {
                    const value = await kv.get(KEY);
                    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
                    futureSchema = typeof raw.version === 'number' && raw.version > 1;
                    current = futureSchema ? snapshot(false, DEFAULT_PINS) : snapshot(raw.enabled === true, readPins(raw), raw.socialKeyboard === 'radial' ? 'radial' : 'compact');
                    loadState = 'ready';
                } catch (error) { loadState = 'failed'; throw error; }
                finally { loading = undefined; emit(); }
            })();
            return loading;
        },
        loadState: () => loadState,
        get: (): MenuPreferences => current,
        subscribe(listener: Stop): Stop { listeners.add(listener); return () => { listeners.delete(listener); }; },
        setSocialKeyboard(mode: SocialKeyboardMode): Promise<void> {
            if (mode !== 'compact' && mode !== 'radial') return Promise.reject(new Error('Choose Compact or Radial'));
            return save(snapshot(current.enabled, current.pins, mode));
        },
        setEnabled(enabled: boolean): Promise<void> { return save(snapshot(enabled, current.pins, current.socialKeyboard)); },
        setPins(pins: readonly PinnedSectionId[]): Promise<void> {
            if (!validPins(pins)) return Promise.reject(new Error('Choose between one and four different menu sections'));
            return save(snapshot(current.enabled, pins, current.socialKeyboard));
        },
    };
}

/** Shared choice can be read by Home without starting the menu service. */
export const menuPreferences=createMenuPreferences(backendKv);
