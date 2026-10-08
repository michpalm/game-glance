import { stopDownloads } from './home/downloadStore';
import { stopStatus } from './home/statusStore';
import { definePlugin } from '@decky/api';
import { staticClasses } from '@decky/ui';
import { FaGamepad } from 'react-icons/fa';
import { SettingsPanel } from './components/SettingsPanel';
import { LOG_PREFIX, PLUGIN_NAME } from './constants';
import { startAutoPreload } from './data/autoPreload';
import { settings } from './data/settings';
import { getSteamLanguage } from './data/steam';
import { patchGamePage } from './patches/gamePage';
import { patchHomePage } from './patches/homePage';
import { patchLibraryPage } from './patches/libraryPage';

export default definePlugin(() => {
    settings.load().catch((error) => console.error(`${LOG_PREFIX} failed to load settings`, error));
    void getSteamLanguage(); // resolve early so game pages render in the right locale immediately
    const unpatch = patchGamePage();
    const unpatchHome = patchHomePage(); // never throws; applied after and independent of the game page patch
    const unpatchLibrary = patchLibraryPage();
    const stopAutoPreload = startAutoPreload();
    console.log(`${LOG_PREFIX} loaded`);
    return {
        name: PLUGIN_NAME,
        titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
        content: <SettingsPanel />,
        icon: <FaGamepad />,
        onDismount() {
            // Each step on its own: one that throws must not leave the others applied.
            const steps: [string, () => void][] = [
                ['game page unpatch', unpatch],
                ['Home unpatch', unpatchHome],
                ['Library unpatch', unpatchLibrary],
                ['auto preload stop', stopAutoPreload],
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
