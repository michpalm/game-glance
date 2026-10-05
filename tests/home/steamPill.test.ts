import { describe, expect, it, vi } from 'vitest';
import { ActionFns, buildSteamPill } from '../../src/home/steamPill';

const fns = (over: Partial<ActionFns> = {}): ActionFns => ({
    AH: () => 'Pause',
    jy: () => () => undefined,
    WB: () => 'glyph',
    Np: (a) => `word:${a}`,
    ...over,
});

describe('buildSteamPill', () => {
    it('takes the action, word and glyph from Steam and runs its handler with the window', () => {
        const handler = vi.fn();
        const jy = vi.fn(() => handler);
        const pill = buildSteamPill(fns({ jy }), 'inst', { appid: 5 });
        expect(pill).toMatchObject({ action: 'Pause', label: 'word:Pause', icon: 'glyph' });
        pill!.run('win');
        expect(jy).toHaveBeenCalledWith('Pause', { appid: 5 }, 'selected', 100, 'win');
        expect(handler).toHaveBeenCalledTimes(1);
    });
    it('asks for the selected client with the window instance', () => {
        const AH = vi.fn(() => 'Play');
        buildSteamPill(fns({ AH }), 'inst', { appid: 1 });
        expect(AH).toHaveBeenCalledWith('inst', { appid: 1 }, 'selected');
    });
    it('is null without functions, overview or an action, so Home keeps its own pill', () => {
        expect(buildSteamPill(null, 1, {})).toBeNull();
        expect(buildSteamPill(fns(), 1, undefined)).toBeNull();
        expect(buildSteamPill(fns({ AH: () => null }), 1, {})).toBeNull();
        expect(buildSteamPill(fns({ AH: () => '' }), 1, {})).toBeNull();
    });
    it('is null when a piece throws or comes back empty', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(buildSteamPill(fns({ WB: () => { throw new Error('x'); } }), 1, {})).toBeNull();
        expect(buildSteamPill(fns({ Np: () => '' }), 1, {})).toBeNull();
        expect(buildSteamPill(fns({ WB: () => null }), 1, {})).toBeNull();
        warn.mockRestore();
    });
    it('run throws when Steam has no handler, for the caller to fall back', () => {
        const pill = buildSteamPill(fns({ jy: () => null }), 1, {});
        expect(() => pill!.run('w')).toThrow();
    });
});
