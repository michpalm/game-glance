import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPersona, PERSONA_OPTIONS, personaView, type FriendStoreLike } from '../../src/menu/steam/persona';

afterEach(() => vi.useRealTimers());

describe('personaView', () => {
    it("names Steam's four states, reads Snooze as Away and anything else as Online, ticking only the four", () => {
        expect(personaView(7)).toEqual({ value: 7, text: 'Invisible', dot: 'ring' });
        expect(personaView(1)).toEqual({ value: 1, text: 'Online', dot: '#57cbde' });
        expect(personaView(3)).toEqual({ value: 3, text: 'Away', dot: '#7f8a96' });
        expect(personaView(0)).toEqual({ value: 0, text: 'Offline', dot: '#3d4450' });
        expect(personaView(4)).toMatchObject({ value: null, text: 'Away' });
        expect(personaView(2)).toMatchObject({ value: null, text: 'Online' });
        expect(PERSONA_OPTIONS.map((o) => [o.id, o.label, o.sub ?? null])).toEqual([[1, 'Online', null], [3, 'Away', null], [7, 'Invisible', 'Appear offline, still chat'], [0, 'Offline', 'Sign out of Friends']]);
    });
});

describe('createPersona', () => {
    const store = (state = 7): FriendStoreLike & { m_eUserPersonaState: number } => ({ m_eUserPersonaState: state, SetUserPersonaState: vi.fn() });
    it('is unavailable without the setter or while Friends is offline', () => {
        expect(createPersona(() => ({ m_eUserPersonaState: 1 }), () => true).read()).toBeNull();
        expect(createPersona(() => store(), () => false).read()).toBeNull();
        expect(createPersona(() => undefined, () => true).read()).toBeNull();
        expect(createPersona(() => store(), () => true).read()).toMatchObject({ value: 7 });
    });
    it('keeps the pill after choosing Offline (Friends signs out), so you can come back online', () => {
        expect(createPersona(() => store(0), () => false).read()).toMatchObject({ value: 0, text: 'Offline' });
    });
    it('sets exactly the chosen value through SetUserPersonaState', async () => {
        const s = store();
        await createPersona(() => s, () => true).set(3);
        expect(s.SetUserPersonaState).toHaveBeenCalledTimes(1);
        expect(s.SetUserPersonaState).toHaveBeenCalledWith(3);
    });
    it('follows a status Steam changes itself (auto-Away), and stops polling when unsubscribed', () => {
        vi.useFakeTimers();
        const s = store(1), listener = vi.fn();
        const persona = createPersona(() => s, () => true, 1000);
        const stop = persona.subscribe(listener);
        s.m_eUserPersonaState = 3;
        vi.advanceTimersByTime(1000);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(persona.read()).toMatchObject({ value: 3, text: 'Away' });
        stop();
        s.m_eUserPersonaState = 1;
        vi.advanceTimersByTime(3000);
        expect(listener).toHaveBeenCalledTimes(1);
    });
    it('returns the same snapshot while nothing changed (for useSyncExternalStore)', () => {
        const persona = createPersona(() => store(), () => true);
        expect(persona.read()).toBe(persona.read());
    });
});
