import { startMenu } from './menu/startMenu';
import { stopDownloads } from './home/downloadStore';
import { stopStatus } from './home/statusStore';
import { definePlugin, routerHook } from '@decky/api';
import { staticClasses } from '@decky/ui';
import { FaGamepad } from 'react-icons/fa';
import { SettingsPanel } from './components/SettingsPanel';
import { LOG_PREFIX, PLUGIN_NAME } from './constants';
import { startAutoPreload } from './data/autoPreload';
import { settings } from './data/settings';
import { getSteamLanguage } from './data/steam';
import { startUpdateChecks } from './data/update';
import { patchGamePage } from './patches/gamePage';
import { patchHomePage } from './patches/homePage';
import { patchDownloadsPage } from './patches/downloadsPage';
import { ScreensaverHost } from './screensaver/ScreensaverView';
import { ChromeHost } from './chrome/ChromeHost';
import { ContextMenusHost, CONTEXT_MENUS_COMPONENT } from './contextMenus/ContextMenusHost';
import { noteLoad, remountHomeAfterReload } from './home/reloadRemount';
import { StoragePage, STORAGE_ROUTE } from './storage/StoragePage';
import { ThemeMusicHide, THEME_MUSIC_COMPONENT } from './components/ThemeMusicButton';

const SCREENSAVER_COMPONENT = 'GameGlanceScreensaver';
const CHROME_COMPONENT = 'GameGlanceChrome';

export default definePlugin(() => {
    const masterReady = settings.load();
    masterReady.catch((error) => console.error(`${LOG_PREFIX} failed to load settings`, error));
    const stopMenu = startMenu({ masterReady });
    void getSteamLanguage(); // resolve early so game pages render in the right locale immediately
    const unpatch = patchGamePage();
    const unpatchHome = patchHomePage(); // never throws; applied after and independent of the game page patch
    const unpatchDownloads = patchDownloadsPage(); // Game Glance's Downloads in place of Steam's (falls back to Steam's)
    const cancelRemount = remountHomeAfterReload(noteLoad()); // an update: Home on screen is redrawn by this copy
    routerHook.addGlobalComponent(SCREENSAVER_COMPONENT, ScreensaverHost); // draws only while Steam's screensaver is on
    routerHook.addGlobalComponent(CHROME_COMPONENT, ChromeHost); // the status bar, Search and footer, for every page
    routerHook.addGlobalComponent(CONTEXT_MENUS_COMPONENT, () => <ContextMenusHost masterReady={masterReady}/>);
    routerHook.addGlobalComponent(THEME_MUSIC_COMPONENT, ThemeMusicHide); // NonSteamLaunchers' theme-music buttons stay hidden (our one button stands in)
    routerHook.addRoute(STORAGE_ROUTE, StoragePage); // Game Glance's own Storage screen, from the Navigate tile
    const stopAutoPreload = startAutoPreload();
    const stopUpdateChecks = startUpdateChecks(); // quiet: once now (a day-old answer is reused), then daily
    console.log(`${LOG_PREFIX} loaded`);
    return {
        name: PLUGIN_NAME,
        titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
        content: <SettingsPanel />,
        // Steam temporarily hides Quick Access while its dropdown owns focus.
        alwaysRender: true,
        icon: <FaGamepad />,
        onDismount() {
            // Each step on its own: one that throws must not leave the others applied.
            const steps: [string, () => void][] = [
                ['floating menu stop', stopMenu],
                ['game page unpatch', unpatch],
                ['Home unpatch', unpatchHome],
                ['Downloads unpatch', unpatchDownloads],
                ['Home reopen cancel', cancelRemount],
                ['screensaver remove', () => routerHook.removeGlobalComponent(SCREENSAVER_COMPONENT)],
                ['chrome remove', () => routerHook.removeGlobalComponent(CHROME_COMPONENT)],
                ['context menus remove', () => routerHook.removeGlobalComponent(CONTEXT_MENUS_COMPONENT)],
                ['theme music remove', () => routerHook.removeGlobalComponent(THEME_MUSIC_COMPONENT)],
                ['storage route remove', () => routerHook.removeRoute(STORAGE_ROUTE)],
                ['auto preload stop', stopAutoPreload],
                ['update checks stop', stopUpdateChecks],
                ['downloads stop', stopDownloads],
                ['status bar stop', stopStatus],
            ];
            for (const [what, step] of steps) {
                try {
                    step();
                } catch (error) {
                    console.error(`${LOG_PREFIX} ${what} failed`, error);
                }
            }
            console.log(`${LOG_PREFIX} unloaded`);
        },
    };
});
