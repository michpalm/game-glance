import { toaster } from '@decky/api';
import { Navigation } from '@decky/ui';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { updateLine } from '../../components/UpdatesSection';
import { PLUGIN_NAME } from '../../constants';
import { cache, overrides } from '../../data/cache';
import { useCurrentGame } from '../../data/currentGame';
import { fetchAll, useFetchAll } from '../../data/fetchAll';
import { settings, useSettings } from '../../data/settings';
import { CATEGORY_IDS, categorySummary, matchLine, type CategoryId } from '../../data/settingsCategories';
import { createInstallGate, installUpdate, useUpdate } from '../../data/update';
import { RECENT_ROW, steamHomeCollections } from '../../home/collections';
import { tr } from '../../i18n/steamText';
import { previewScreensaver, screensaverAvailable } from '../../screensaver/steamScreensaver';
import type { MenuEvent, MenuState } from '../model';
import { menuPreferences } from '../preferences';
import { activateDeckyPlugin, listDeckyPlugins } from '../steam/deckyPlugins';
import type { NativeRequest } from '../steam/runtime';
import { GAME_GLANCE_VIEW, HOME_ROW_VIEW } from '../views';
import { CATEGORY_PAGES, HomeRowPicker } from './GameGlancePages';
import type { GgActions, GgValues } from './gameGlanceTypes';
import { GameGlanceGrid } from './GameGlanceViews';
import { PluginsList } from './PluginsList';

interface SectionProps { state: MenuState; dispatch(event: MenuEvent): void; handoff(request: NativeRequest): void; close(): void }

/** The menu's Plugins section: the plugin list, then Game Glance's own views by the menu stack's top view. */
export function PluginsSection({ state, dispatch, handoff, close }: SectionProps) {
    // Read once when the section opens, as Decky's own list is.
    const [plugins] = useState(listDeckyPlugins);
    const top = state.stack[state.stack.length - 1];
    const openDecky = () => handoff({ kind: 'qam', tab: 'decky' });
    const openPlugin = (name: string) => { activateDeckyPlugin(name); openDecky(); };
    if (top === undefined) return <PluginsList plugins={plugins} openGameGlance={() => dispatch({ type: 'push', viewId: GAME_GLANCE_VIEW })} openOther={openPlugin} openDecky={openDecky} />;
    return <GameGlanceSettings top={top} dispatch={dispatch} openPlugin={openPlugin} close={close} />;
}

function GameGlanceSettings({ top, dispatch, openPlugin, close }: { top: string; dispatch(event: MenuEvent): void; openPlugin(name: string): void; close(): void }) {
    const s = useSettings();
    const prefs = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.get);
    const prefsState = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.loadState);
    const collections = useMemo(steamHomeCollections, []);
    const saverAvailable = useMemo(screensaverAvailable, []);
    const { game, hltb } = useCurrentGame();
    const [overrideId, setOverrideId] = useState<number | null>(null);
    useEffect(() => {
        if (!game) return;
        let alive = true;
        overrides.get(game.appId).then(id => { if (alive) setOverrideId(id); }, () => { if (alive) setOverrideId(null); });
        return () => { alive = false; };
    }, [game?.appId]);
    const fetching = useFetchAll();
    const { state: update, recheck } = useUpdate();
    const [installing, setInstalling] = useState(false);
    const [gate] = useState(() => createInstallGate(setInstalling));
    const [error, setError] = useState('');

    const rowChosen = collections.some(c => c.id === s.homeRow) ? s.homeRow : RECENT_ROW;
    const recent = tr('recentGames');
    const rowName = rowChosen === RECENT_ROW ? recent : collections.find(c => c.id === rowChosen)?.name ?? recent;
    const summaryContext = { rowName, screensaverAvailable: saverAvailable, menuEnabled: prefs.enabled, socialKeyboard: prefs.socialKeyboard };
    const v: GgValues = {
        settings: s,
        menuEnabled: prefs.enabled,
        menuReady: prefsState === 'ready',
        socialKeyboard: prefs.socialKeyboard,
        restyleSteamSettings: prefs.restyleSteamSettings,
        rowChosen,
        rowName,
        collectionRow: rowChosen !== RECENT_ROW,
        rowChoices: [{ id: RECENT_ROW, label: recent }, ...collections.map(c => ({ id: c.id, label: `${c.name} (${c.count})` }))],
        summaries: Object.fromEntries(CATEGORY_IDS.map(id => [id, categorySummary(id, s, summaryContext)])) as Record<CategoryId, string>,
        screensaverAvailable: saverAvailable,
        game: game ? { name: game.name, match: matchLine(overrideId, hltb), matched: hltb?.status === 'found', override: overrideId !== null } : null,
        fetching: { running: fetching.running, found: fetching.found, done: fetching.done, total: fetching.total },
        update: { line: updateLine(update), available: update.status === 'available' ? update.release.version : null, checking: update.status === 'checking', installing },
        version: update.current ?? '',
        error,
    };
    const a: GgActions = {
        store: settings,
        setRestyleSteamSettings: value => menuPreferences.setRestyleSteamSettings(value),
        setMenuEnabled: value => menuPreferences.setEnabled(value),
        setSocialKeyboard: mode => menuPreferences.setSocialKeyboard(mode),
        run: change => { setError(''); void change.catch(() => setError('Could not save this setting. Try again.')); },
        open: viewId => dispatch({ type: 'push', viewId }),
        back: () => dispatch({ type: 'back' }),
        changeMatch: () => openPlugin(PLUGIN_NAME),
        openHltb: () => {
            if (hltb?.status !== 'found') return;
            close();
            Navigation.NavigateToExternalWeb(`https://howlongtobeat.com/game/${hltb.gameId}`);
        },
        removeOverride: () => {
            if (!game) return;
            void overrides.remove(game.appId).then(() => setOverrideId(null), () => setError('Could not remove the override. Try again.'));
        },
        preview: () => { close(); previewScreensaver(); },
        togglePreload: () => { if (fetching.running) fetchAll.stop(); else void fetchAll.start(); },
        clearCache: () => { void cache.clear().then(() => toaster.toast({ title: PLUGIN_NAME, body: 'Cached data cleared.' }), () => setError('Could not clear cached data. Try again.')); },
        checkUpdate: recheck,
        installUpdate: () => {
            if (update.status !== 'available') return;
            const release = update.release;
            close();
            void gate.run(() => installUpdate(release)).then(started => {
                if (started === false) toaster.toast({ title: PLUGIN_NAME, body: 'Could not start the install. Try again or use the release page.' });
            });
        },
        chooseVersion: () => openPlugin(PLUGIN_NAME),
    };
    if (top === HOME_ROW_VIEW) return <HomeRowPicker v={v} a={a} />;
    const category = /^gg:([a-z-]+)$/.exec(top)?.[1] as CategoryId | undefined;
    const Page = category && CATEGORY_PAGES[category];
    return Page ? <Page v={v} a={a} /> : <GameGlanceGrid v={v} a={a} />;
}
