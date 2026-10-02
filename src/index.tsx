import { definePlugin } from '@decky/api';
import { staticClasses } from '@decky/ui';
import { FaGamepad } from 'react-icons/fa';
import { SettingsPanel } from './components/SettingsPanel';
import { LOG_PREFIX, PLUGIN_NAME } from './constants';
import { startAutoPreload } from './data/autoPreload';
import { settings } from './data/settings';
import { getSteamLanguage } from './data/steam';
import { patchGamePage } from './patches/gamePage';

export default definePlugin(() => {
    settings.load().catch((error) => console.error(`${LOG_PREFIX} failed to load settings`, error));
    void getSteamLanguage(); // resolve early so game pages render in the right locale immediately
    const unpatch = patchGamePage();
    const stopAutoPreload = startAutoPreload();
    console.log(`${LOG_PREFIX} loaded`);
    return {
        name: PLUGIN_NAME,
        titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
        content: <SettingsPanel />,
        icon: <FaGamepad />,
        onDismount() {
            unpatch();
            stopAutoPreload();
            console.log(`${LOG_PREFIX} unloaded`);
        },
    };
});
