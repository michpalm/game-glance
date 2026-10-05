import { describe, expect, it, vi } from 'vitest';
import { buildGameMenu, MenuModule } from '../../src/home/gameMenu';

const Menu = () => null;
const mod = (over: Partial<MenuModule> = {}): MenuModule => ({
    uU: Menu,
    zq: () => ({ bFitToWindow: true, strClassName: 'menu' }),
    ...over,
});

describe('buildGameMenu', () => {
    it('renders Steam\'s menu with the game page gear\'s props: selected client, launch source 100, gamepad UI, no primary action', () => {
        const call = buildGameMenu(mod(), { appid: 7 }, 'win');
        expect(call).not.toBeNull();
        expect(call!.element.type).toBe(Menu);
        expect(call!.element.props).toEqual({
            overview: { appid: 7 },
            client: 'selected',
            launchSource: 100,
            bInGamepadUI: true,
            omitPrimaryAction: true,
            ownerWindow: 'win',
        });
    });
    it('positions it as the gear does: Steam\'s options plus horizontal overlap, no vertical overlap', () => {
        expect(buildGameMenu(mod(), { appid: 7 }, 'win')!.options).toEqual({
            bFitToWindow: true,
            strClassName: 'menu',
            bOverlapHorizontal: true,
            bOverlapVertical: false,
        });
        expect(buildGameMenu(mod({ zq: () => null as never }), { appid: 7 }, 'win')!.options).toEqual({ bOverlapHorizontal: true, bOverlapVertical: false });
    });
    it('is null without the module, the component, the options function or an overview, so Home falls back to Properties', () => {
        expect(buildGameMenu(null, { appid: 1 }, 'win')).toBeNull();
        expect(buildGameMenu(mod({ uU: undefined as never }), { appid: 1 }, 'win')).toBeNull();
        expect(buildGameMenu(mod({ zq: undefined as never }), { appid: 1 }, 'win')).toBeNull();
        expect(buildGameMenu(mod(), undefined, 'win')).toBeNull();
        expect(buildGameMenu(mod(), null, 'win')).toBeNull();
    });
    it('is null when Steam\'s options throw', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(buildGameMenu(mod({ zq: () => { throw new Error('x'); } }), { appid: 1 }, 'win')).toBeNull();
        warn.mockRestore();
    });
});
