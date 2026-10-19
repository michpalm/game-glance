import { describe, expect, it, vi } from 'vitest';
import { createRoutes } from '../../src/menu/steam/routes';
function harness() {
    const order: string[] = [];
    const b = { deactivate: vi.fn(() => { order.push('deactivate'); }), openMain: vi.fn(), openQam: vi.fn(),
        tabs: { Notifications: 10, Friends: 13, Settings: 14, Perf: 15, Help: 16, Music: 17, Decky: 999 },
        library: vi.fn(() => { order.push('library'); }), navigate: vi.fn(), finishNavigation: vi.fn(() => { order.push('close'); }), power: vi.fn(),
        profile: { allowed: vi.fn(() => true), resolve: vi.fn(() => 'https://steamcommunity.com/profiles/76561190000000000'), open: vi.fn() },
    };
    return { b, order, routes: createRoutes(b) };
}
describe('menu native destinations', () => {
    it.each([['store','/steamweb'],['downloads','/library/downloads'],['settings','/settings']] as const)('maps %s to its native route', async (destination,path) => {
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
