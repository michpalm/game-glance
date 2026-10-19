export type Stop = () => void;
export type SectionId = 'navigate' | 'quick-settings' | 'performance' | 'social' | 'plugins' | 'help' | 'soundtrack' | 'in-game' | 'more';
export type PinnedSectionId = Exclude<SectionId, 'in-game' | 'more'>;
export type Entry = 'home' | 'quick-access';
export interface GameContext {
    appId: number;
    gameId: string;
    name: string;
    kind: 'local' | 'streamed' | 'non-steam';
    actionIds: string[];
}
export interface MenuState {
    phase: 'disabled' | 'closed' | 'custom-open' | 'native-handoff' | 'failed';
    entry: Entry;
    section: SectionId;
    stack: string[];
    pins: PinnedSectionId[];
    game: GameContext | null;
    focus: Partial<Record<SectionId, string>>;
}
export type MenuEvent =
    | { type: 'enable'; value: boolean }
    | { type: 'open'; entry: Entry }
    | { type: 'select'; section: SectionId }
    | { type: 'step'; direction: -1 | 1 }
    | { type: 'push'; viewId: string }
    | { type: 'back' | 'close' | 'handoff' | 'failure' | 'reset' }
    | { type: 'pins'; value: PinnedSectionId[] }
    | { type: 'game'; value: GameContext | null }
    | { type: 'focus'; section: SectionId; key: string };

export const PINNABLE: readonly PinnedSectionId[] = Object.freeze(['navigate', 'quick-settings', 'performance', 'social', 'plugins', 'help', 'soundtrack']);
export const DEFAULT_PINS: readonly PinnedSectionId[] = Object.freeze(['navigate', 'quick-settings', 'performance', 'social']);
export function isPinnedSection(value: unknown): value is PinnedSectionId {
    return typeof value === 'string' && PINNABLE.includes(value as PinnedSectionId);
}
export function validPins(value: readonly unknown[]): value is readonly PinnedSectionId[] {
    return value.length >= 1 && value.length <= 4 && new Set(value).size === value.length && value.every(isPinnedSection);
}
export function defaultMenuState(): MenuState {
    return { phase: 'disabled', entry: 'home', section: 'navigate', stack: [], pins: [...DEFAULT_PINS], game: null, focus: {} };
}
export function visibleSections(state: MenuState): SectionId[] {
    return [...(state.game ? ['in-game' as const] : []), ...state.pins, 'more'];
}
export function selectedBarSection(state: MenuState): SectionId {
    return visibleSections(state).includes(state.section) ? state.section : 'more';
}
export function reduceMenu(state: MenuState, event: MenuEvent): MenuState {
    switch (event.type) {
        case 'enable':
            return event.value ? (state.phase === 'disabled' ? { ...state, phase: 'closed' } : state) : { ...state, phase: 'disabled', stack: [], focus: {} };
        case 'failure': return { ...state, phase: 'failed', stack: [] };
        case 'reset': return { ...defaultMenuState(), pins: [...state.pins] };
        case 'pins': return validPins(event.value) ? { ...state, pins: [...event.value] } : state;
        case 'game': {
            const changed = state.game?.gameId !== event.value?.gameId || state.game?.appId !== event.value?.appId;
            if (!changed) return { ...state, game: event.value };
            const focus = { ...state.focus };
            delete focus['in-game'];
            return { ...state, game: event.value, focus, ...(state.section === 'in-game' ? { stack: [], section: event.value ? 'in-game' : 'navigate' } : {}) };
        }
        case 'open':
            if (state.phase === 'disabled' || state.phase === 'failed') return state;
            if (state.phase === 'custom-open' && state.entry === event.entry) return { ...state, phase: 'closed', stack: [] };
            return { ...state, phase: 'custom-open', entry: event.entry, section: event.entry === 'quick-access' ? 'quick-settings' : state.game ? 'in-game' : 'navigate', stack: [] };
        case 'close': return state.phase === 'disabled' || state.phase === 'failed' ? state : { ...state, phase: 'closed', stack: [] };
        case 'handoff': return state.phase === 'custom-open' ? { ...state, phase: 'native-handoff' } : state;
        default: break;
    }
    if (state.phase !== 'custom-open') return state;
    switch (event.type) {
        case 'select':
            if (event.section === 'in-game' && !state.game) return state;
            return { ...state, section: event.section, stack: [] };
        case 'step': {
            const bar = visibleSections(state);
            const index = bar.indexOf(selectedBarSection(state));
            return { ...state, section: bar[(index + event.direction + bar.length) % bar.length], stack: [] };
        }
        case 'push': return event.viewId ? { ...state, stack: [...state.stack, event.viewId] } : state;
        case 'focus': return { ...state, focus: { ...state.focus, [event.section]: event.key } };
        case 'back':
            if (state.stack.length) return { ...state, stack: state.stack.slice(0, -1) };
            if (!visibleSections(state).includes(state.section)) return { ...state, section: 'more' };
            return { ...state, phase: 'closed' };
    }
}
