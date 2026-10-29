import { describe, expect, it, vi } from 'vitest';
import { createRoutes } from '../../src/menu/steam/routes';
function harness() {
    const order: string[] = [];
    const b = { deactivate: vi.fn(() => { order.push('deactivate'); }), openMain: vi.fn(), openQam: vi.fn(),
        tabs: { Notifications: 10, Friends: 13, Settings: 14, Perf: 15, Help: 16, Music: 17, Decky: 999 },
        library: vi.fn(() => { order.push('library'); }), navigate: vi.fn(), finishNavigation: vi.fn(() => { order.push('close'); }), power: vi.fn(), exitGame: vi.fn(), openStore: vi.fn(), joinGame: vi.fn(), openUrl: vi.fn(),
        profile: { allowed: vi.fn(() => true), resolve: vi.fn(() => 'https://steamcommunity.com/profiles/76561190000000000'), open: vi.fn() },
    };
    return { b, order, routes: createRoutes(b) };
}
describe('menu native destinations', () => {
    it.each([['home','/library/home'],['store','/steamweb'],['downloads','/library/downloads'],['settings','/settings']] as const)('maps %s to its native route', async (destination,path) => {
        const h = harness(); await h.routes.open({kind:'navigate',destination}); expect(h.b.navigate).toHaveBeenCalledWith(path); expect(h.b.deactivate).toHaveBeenCalledTimes(1);
    });
    it('deactivates before navigation and closes the side menu after navigation', async () => {
        const h = harness(); await h.routes.open({kind:'navigate',destination:'library'}); expect(h.order).toEqual(['deactivate','library','close']);
    });
    it('uses the native current-user profile resolver, with parental/offline guard', async () => {
        const h = harness(); await h.routes.open({kind:'navigate',destination:'profile'});
        expect(h.b.profile.open).toHaveBeenCalledWith('https://steamcommunity.com/profiles/76561190000000000');
        h.b.profile.allowed.mockReturnValue(false); h.b.profile.open.mockClear();
        await expect(h.routes.open({kind:'navigate',destination:'profile'})).rejects.toThrow('unavailable'); expect(h.b.profile.open).not.toHaveBeenCalled();
    });
    it('maps named QAM destinations through supplied native enum values and uses native Power', async () => {
        const h = harness(); await h.routes.open({kind:'qam',tab:'quick-settings'}); expect(h.b.openQam).toHaveBeenCalledWith(14);
        await h.routes.open({kind:'qam',tab:'notifications'}); expect(h.b.openQam).toHaveBeenLastCalledWith(10);
        await h.routes.open({kind:'navigate',destination:'power'}); expect(h.b.power).toHaveBeenCalledTimes(1);
    });
});
import { nativeRouteBindings } from '../../src/menu/steam/nativeCore';
import type { NativeOwner } from '../../src/menu/steam/runtime';
it('opens the native Library root without constructing an unresolved tab route',()=>{
    const navigate=vi.fn(),tab=vi.fn();
    const owner={Navigate:navigate,Navigator:{LibraryTab:tab},MenuStore:{CloseSideMenus:vi.fn()}} as unknown as NativeOwner;
    nativeRouteBindings(owner,vi.fn(),async()=>{}).library();
    expect(navigate).toHaveBeenCalledWith('/library'); expect(tab).not.toHaveBeenCalled();
});

describe('in-game page destinations', () => {
    it.each([['achievements','/app/1057090/overlay/achievements'],['recordings','/app/1057090/overlay/gamerecording'],['guides','/app/1057090/overlay/guides'],
        ['controller','/app/1057090/overlay/controller'],['game-page','/library/app/1057090']] as const)('opens %s for the running game', async (actionId, path) => {
        const h = harness(); await h.routes.open({kind:'game-action',appId:1057090,gameId:'1057090',actionId});
        expect(h.b.navigate).toHaveBeenCalledWith(path); expect(h.order).toEqual(['deactivate','close']);
    });
    it('exits the running game by its game id without navigating', async () => {
        const h = harness(); await h.routes.open({kind:'game-action',appId:1057090,gameId:'13243934688390676480',actionId:'exit'});
        expect(h.b.exitGame).toHaveBeenCalledWith('13243934688390676480'); expect(h.b.navigate).not.toHaveBeenCalled();
    });
    it('rejects unknown actions and malformed ids', async () => {
        const h = harness();
        await expect(h.routes.open({kind:'game-action',appId:1057090,gameId:'1',actionId:'uninstall'})).rejects.toThrow();
        await expect(h.routes.open({kind:'game-action',appId:-1,gameId:'1',actionId:'guides'})).rejects.toThrow();
        await expect(h.routes.open({kind:'game-action',appId:1,gameId:'x;rm',actionId:'exit'})).rejects.toThrow();
        expect(h.b.navigate).not.toHaveBeenCalled(); expect(h.b.exitGame).not.toHaveBeenCalled();
    });
});

describe('notification destinations', () => {
    it('opens a sale’s store page or the wishlist through Steam’s browser', async () => {
        const h = harness();
        await h.routes.open({ kind: 'store', target: 'app', appId: 3339880 });
        expect(h.b.openStore).toHaveBeenCalledWith('https://store.steampowered.com/app/3339880/');
        await h.routes.open({ kind: 'store', target: 'wishlist' });
        expect(h.b.openStore).toHaveBeenLastCalledWith('https://store.steampowered.com/wishlist/');
        expect(h.order[0]).toBe('deactivate');
    });
    it('refuses a malformed app id', async () => {
        const h = harness();
        await expect(h.routes.open({ kind: 'store', target: 'app', appId: 1.5 })).rejects.toThrow();
        expect(h.b.openStore).not.toHaveBeenCalled();
    });
});

describe('join a friend', () => {
    it.each([`steam://rungame/1057090/76561198000000001`, `steam://rungame/730/76561198000000001/%2Bconnect%201.2.3.4`, `steam://joinlobby/1057090/109775241000000000/76561198000000001`])('opens Steam’s own join url %s', async url => {
        const h = harness(); await h.routes.open({ kind: 'join', url }); expect(h.b.joinGame).toHaveBeenCalledWith(url);
    });
    it.each(['steam://install/1', 'https://example.com', 'steam://rungame/1/2 ; rm', 'steam://rungame/abc/76561198000000001'])('refuses anything else: %s', async url => {
        const h = harness(); await expect(h.routes.open({ kind: 'join', url })).rejects.toThrow(); expect(h.b.joinGame).not.toHaveBeenCalled();
    });
});

describe('selected friend profile destination',()=>{
 it('opens the requested friend rather than the current-user profile and closes the side menu',async()=>{
  const h=harness();await h.routes.open({kind:'friend-profile',steamId:'76561198000000001'});
  expect(h.b.profile.open).toHaveBeenCalledWith('https://steamcommunity.com/profiles/76561198000000001');
  expect(h.b.profile.resolve).not.toHaveBeenCalled();expect(h.order).toEqual(['deactivate','close']);
 });
 it('retains profile restrictions and rejects malformed friend identities',async()=>{
  const h=harness();h.b.profile.allowed.mockReturnValue(false);
  await expect(h.routes.open({kind:'friend-profile',steamId:'76561198000000001'})).rejects.toThrow();
  h.b.profile.allowed.mockReturnValue(true);
  await expect(h.routes.open({kind:'friend-profile',steamId:'https://example.com'})).rejects.toThrow();
  expect(h.b.profile.open).not.toHaveBeenCalled();
 });
});

describe('notification actions', () => {
    it('opens a game’s page in the library and closes the side menu', async () => {
        const h = harness(); await h.routes.open({ kind: 'app', appId: 42 });
        expect(h.b.navigate).toHaveBeenCalledWith('/library/app/42'); expect(h.order).toEqual(['deactivate', 'close']);
        await expect(h.routes.open({ kind: 'app', appId: 0 })).rejects.toThrow();
    });
    it.each(['https://store.steampowered.com/account/', 'steam://joinlobby/1/2/76561198000000001'])('opens %s in Steam', async url => {
        const h = harness(); await h.routes.open({ kind: 'url', url }); expect(h.b.openUrl).toHaveBeenCalledWith(url);
    });
    it.each(['http://example.com', 'javascript:alert(1)', 'https://a b', ''])('refuses %s', async url => {
        const h = harness(); await expect(h.routes.open({ kind: 'url', url })).rejects.toThrow(); expect(h.b.openUrl).not.toHaveBeenCalled();
    });
    it('opens urls the way Steam’s notification list does', () => {
        const open = vi.fn(); (globalThis as any).SteamClient = { WebChat: { OpenURLInClient: open } };
        try {
            const owner = { MenuStore: { CloseSideMenus: vi.fn() } } as unknown as NativeOwner;
            nativeRouteBindings(owner, vi.fn(), async () => {}).openUrl('steam://joinlobby/1/2/3');
            expect(open).toHaveBeenCalledWith('steam://joinlobby/1/2/3', 0, false);
        } finally { delete (globalThis as any).SteamClient; }
    });
});
