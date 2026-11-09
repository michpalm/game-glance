import { afterEach, expect, it, vi } from 'vitest';
import { Navigation } from '@decky/ui';
import { openStatusLink } from '../../src/chrome/statusLinks';
import { noteHome, resetHomeMemory, takeRestore } from '../../src/home/homeMemory';

afterEach(() => {
    resetHomeMemory();
    vi.unstubAllGlobals();
});

it('restores the same Home game after opening a status bar destination', async () => {
    const doc = {} as Document;
    const owner = { BrowserWindow: { document: doc }, History: { location: { pathname: '/library/home' } } };
    vi.stubGlobal('SteamUIStore', { WindowStore: { GamepadUIMainWindowInstance: owner } });
    const recent = { kind: 'game', appId: 42 } as const;
    noteHome({ recent, zone: 'actions' });

    await openStatusLink(doc, 'connection');

    expect(Navigation.Navigate).toHaveBeenCalledWith('/settings/internet');
    expect(takeRestore()).toMatchObject({ recent, zone: 'actions' });
    owner.History.location.pathname = '/library/app/42';
    await openStatusLink(doc, 'battery');
    expect(takeRestore()).toBeNull();
});
