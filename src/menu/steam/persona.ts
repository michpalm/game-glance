import type { PickerOption } from '../components/MenuPicker';

/** Steam's own status choices (EPersonaState): Offline 0, Online 1, Away 3, Invisible 7. */
export type PersonaValue = 0 | 1 | 3 | 7;
export interface PersonaView { value: PersonaValue | null; text: string; dot: string }
export interface FriendStoreLike { m_eUserPersonaState?: number; SetUserPersonaState?(value: number): void; AddPersonaStateChangedCallback?(callback: () => void): unknown }

export const PERSONA_OPTIONS: PickerOption<PersonaValue>[] = [
    { id: 1, label: 'Online', dot: '#57cbde' },
    { id: 3, label: 'Away', dot: '#7f8a96' },
    { id: 7, label: 'Invisible', sub: 'Appear offline, still chat', dot: 'ring' },
    { id: 0, label: 'Offline', sub: 'Sign out of Friends', dot: '#3d4450' },
];

/** The pill for Steam's status value: one of the four as itself; Snooze (4) reads Away and any other Online, unticked. */
export function personaView(raw: unknown): PersonaView {
    const option = PERSONA_OPTIONS.find((o) => o.id === raw);
    if (option) return { value: option.id, text: option.label, dot: option.dot! };
    const like = raw === 4 ? PERSONA_OPTIONS[1] : PERSONA_OPTIONS[0];
    return { value: null, text: like.label, dot: like.dot! };
}

/**
 * Your own status through Steam's friends store (spec 2026-11-12-status-and-audio-pickers): null while it can't be set
 * (no setter, Friends offline). Follows changes Steam makes itself (its callback when there is one, and a poll).
 */
export function createPersona(store: () => FriendStoreLike | undefined, online: () => boolean, pollMs = 1000) {
    let last: { key: string; view: PersonaView | null } = { key: '', view: null };
    function read(): PersonaView | null {
        const s = store();
        // Offline signs out of Friends: the pill stays then, so you can come back online from it.
        const available = typeof s?.SetUserPersonaState === 'function' && (online() || s.m_eUserPersonaState === 0);
        const key = available ? String(s!.m_eUserPersonaState) : 'none';
        if (key !== last.key) last = { key, view: available ? personaView(s!.m_eUserPersonaState) : null };
        return last.view;
    }
    return {
        read,
        async set(value: PersonaValue): Promise<void> {
            const s = store();
            if (typeof s?.SetUserPersonaState !== 'function' || (!online() && s.m_eUserPersonaState !== 0)) throw Error('Friends is unavailable');
            s.SetUserPersonaState(value);
        },
        subscribe(listener: () => void): () => void {
            let seen = read();
            const check = () => { const next = read(); if (next !== seen) { seen = next; listener(); } };
            const timer = setInterval(check, pollMs);
            let alive = true;
            try { store()?.AddPersonaStateChangedCallback?.(() => { if (alive) check(); }); } catch { /* The poll still follows it. */ }
            return () => { alive = false; clearInterval(timer); };
        },
    };
}
export type PersonaService = ReturnType<typeof createPersona>;
