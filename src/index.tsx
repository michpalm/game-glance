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
import { ScreensaverHost } from './screensaver/ScreensaverView';
import { ChromeHost } from './chrome/ChromeHost';
import { noteLoad, remountHomeAfterReload } from './home/reloadRemount';

const SCREENSAVER_COMPONENT = 'GameGlanceScreensaver';
const CHROME_COMPONENT = 'GameGlanceChrome';

export default definePlugin(() => {
    const masterReady = settings.load();
    masterReady.catch((error) => console.error(`${LOG_PREFIX} failed to load settings`, error));
    const stopMenu = startMenu({ masterReady });
    void getSteamLanguage(); // resolve early so game pages render in the right locale immediately
    const unpatch = patchGamePage();
    const unpatchHome = patchHomePage(); // never throws; applied after and independent of the game page patch
    const cancelRemount = remountHomeAfterReload(noteLoad()); // an update: Home on screen is redrawn by this copy
    routerHook.addGlobalComponent(SCREENSAVER_COMPONENT, ScreensaverHost); // draws only while Steam's screensaver is on
    routerHook.addGlobalComponent(CHROME_COMPONENT, ChromeHost); // the status bar, Search and footer, for every page
    const stopAutoPreload = startAutoPreload();
    const stopUpdateChecks = startUpdateChecks(); // quiet: once now (a day-old answer is reused), then daily
    console.log(`${LOG_PREFIX} loaded`);
    return {
        name: PLUGIN_NAME,
        titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
        content: <SettingsPanel />,
        icon: <FaGamepad />,
        onDismount() {
            // Each step on its own: one that throws must not leave the others applied.
            const steps: [string, () => void][] = [
                ['floating menu stop', stopMenu],
                ['game page unpatch', unpatch],
                ['Home unpatch', unpatchHome],
                ['Home reopen cancel', cancelRemount],
                ['screensaver remove', () => routerHook.removeGlobalComponent(SCREENSAVER_COMPONENT)],
                ['chrome remove', () => routerHook.removeGlobalComponent(CHROME_COMPONENT)],
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
