import { Navigation } from '@decky/ui';
import { HOME_ROUTE } from '../home/guard';
import { markLeaving } from '../home/homeMemory';
import type { StatusLinkId } from '../home/homeControls';
import { nativeRouteBindings } from '../menu/steam/nativeCore';
import { createRoutes } from '../menu/steam/routes';
import type { NativeOwner } from '../menu/steam/runtime';

const settingsRoutes = {
    connection: '/settings/internet',
    battery: '/settings/power',
    clock: '/settings/system',
} as const;

export async function openStatusLink(doc: Document, id: StatusLinkId): Promise<void> {
    const steam = globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: NativeOwner } } };
    const owner = steam.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
    if (id !== 'profile') {
        if (owner?.BrowserWindow?.document === doc && owner.History?.location?.pathname === HOME_ROUTE) markLeaving();
        Navigation.Navigate(settingsRoutes[id]);
        return;
    }

    if (!owner || owner.BrowserWindow?.document !== doc) throw Error('Steam Profile is unavailable');

    const routes = createRoutes(nativeRouteBindings(owner, () => {}, async () => {
        throw Error('Steam Profile is unavailable');
    }));
    await routes.open({ kind: 'navigate', destination: 'profile' });
}
