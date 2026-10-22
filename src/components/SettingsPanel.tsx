import { toaster } from '@decky/api';
import { ButtonItem, DropdownItem, Navigation, PanelSection, PanelSectionRow, TextField, ToggleField } from '@decky/ui';
import { useEffect, useMemo, useState } from 'react';
import { cache, overrides } from '../data/cache';
import { useCurrentGame } from '../data/currentGame';
import { fetchAll, useFetchAll } from '../data/fetchAll';
import { settings, useSettings } from '../data/settings';
import { UpdatesSection } from './UpdatesSection';
import { checkOverride } from '../logic/hltbId';
import { PLUGIN_NAME } from '../constants';
import { RECENT_ROW, ROW_SORTS, RowSort, rowSortLabel, sortByLabel, steamHomeCollections } from '../home/collections';
import { RowStyle } from '../home/recentsLayout';
import { tr } from '../i18n/steamText';
import { previewScreensaver, screensaverAvailable } from '../screensaver/steamScreensaver';

export function SettingsPanel() {
    const { enabled, autoPreload, spotlightHome, wishlistDeals, cleanPage, homeStatusBar, statusAvatar, gameLogo, homeRow, homeRowSort, homeRowStyle, screensaver } = useSettings();
    // Read when the panel opens, so a collection made since shows up.
    const collections = useMemo(steamHomeCollections, []);
    const rowChosen = collections.some((c) => c.id === homeRow) ? homeRow : RECENT_ROW;
    const { game, hltb } = useCurrentGame();
    const fetching = useFetchAll();
    const [input, setInput] = useState('');
    const [overrideId, setOverrideId] = useState<number | null>(null);

    useEffect(() => {
        if (!game) return;
        overrides.get(game.appId).then(setOverrideId, () => setOverrideId(null));
    }, [game?.appId]);

    const match = overrideId !== null
        ? `Override: HowLongToBeat #${overrideId}`
        : hltb?.status === 'found'
            ? `Automatic: HowLongToBeat #${hltb.gameId}`
            : hltb?.status === 'notFound'
                ? 'Automatic: no match'
                : 'Automatic';

    const save = async () => {
        if (!game) return;
        const checked = checkOverride(input, game.appId);
        if ('error' in checked) {
            toaster.toast({ title: PLUGIN_NAME, body: checked.error });
            return;
        }
        const id = checked.id;
        await overrides.set(game.appId, id);
        setOverrideId(id);
        setInput('');
        toaster.toast({ title: PLUGIN_NAME, body: `Using HowLongToBeat #${id} for ${game.name}.` });
    };

    const remove = async () => {
        if (!game) return;
        await overrides.remove(game.appId);
        setOverrideId(null);
    };

    return (
        <>
            <PanelSection title="Game page">
                <PanelSectionRow>
                    <ToggleField label="Game Glance page" checked={enabled} onChange={(value) => settings.setEnabled(value)} />
                </PanelSectionRow>
                {enabled && (
                    <PanelSectionRow>
                        <ToggleField
                            label="Clean look"
                            description="One row at the bottom: Play, your stats and the store, over the full art. No description or HowLongToBeat cards."
                            checked={cleanPage}
                            onChange={(value) => settings.setCleanPage(value)}
                        />
                    </PanelSectionRow>
                )}
            </PanelSection>
            <PanelSection title="Spotlight Home">
                <PanelSectionRow>
                    <ToggleField
                        label="Spotlight Home"
                        description="Replaces Steam's Home screen. Off returns Steam's own Home."
                        checked={spotlightHome}
                        onChange={(value) => settings.setSpotlightHome(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ToggleField
                        label="Status bar"
                        description="Clock, battery and connection at the top-right. Moving up to Steam's own top bar hides it."
                        checked={homeStatusBar}
                        onChange={(value) => settings.setHomeStatusBar(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ToggleField
                        label="Profile picture in the status bar"
                        description="Shows your avatar, round and ringed in your online colour, instead of the dot."
                        checked={statusAvatar}
                        onChange={(value) => settings.setStatusAvatar(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ToggleField
                        label="Game logo"
                        description="Shows the game's logo instead of its name, on Home and the game page. A game without a logo keeps its name."
                        checked={gameLogo}
                        onChange={(value) => settings.setGameLogo(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <DropdownItem
                        label="Games row"
                        description="Your recent games (with games new to your library, as on Steam's Home), or one of your collections."
                        menuLabel="Games row"
                        rgOptions={[{ data: RECENT_ROW, label: tr('recentGames') }, ...collections.map((c) => ({ data: c.id, label: `${c.name} (${c.count})` }))]}
                        selectedOption={rowChosen}
                        onChange={(option) => settings.setHomeRow(String(option.data))}
                    />
                </PanelSectionRow>
                {rowChosen !== RECENT_ROW && (
                    <PanelSectionRow>
                        <DropdownItem
                            label={sortByLabel()}
                            menuLabel={sortByLabel()}
                            rgOptions={ROW_SORTS.map((s) => ({ data: s, label: rowSortLabel(s) }))}
                            selectedOption={homeRowSort}
                            onChange={(option) => settings.setHomeRowSort(option.data as RowSort)}
                        />
                    </PanelSectionRow>
                )}
                <PanelSectionRow>
                    <DropdownItem
                        label="Games row style"
                        description="Steam: the first game stays wide and selection moves along the row. Spotlight: the selected game stays wide at the left. Minimal: all cards stay small."
                        menuLabel="Games row style"
                        rgOptions={[{ data: 'steam', label: 'Steam' }, { data: 'spotlight', label: 'Spotlight' }, { data: 'minimal', label: 'Minimal' }]}
                        selectedOption={homeRowStyle}
                        onChange={(option) => settings.setHomeRowStyle(option.data as RowStyle)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ToggleField
                        label="Show wishlist deals"
                        description="Sends your Steam ID to Steam's public store to find games on sale from your wishlist. Off by default."
                        checked={wishlistDeals}
                        onChange={(value) => settings.setWishlistDeals(value)}
                    />
                </PanelSectionRow>
            </PanelSection>
            <PanelSection title="Screensaver">
                {!screensaverAvailable() ? (
                    <PanelSectionRow>Needs a newer Steam client, one with the screensaver (Settings → Customization → Screensaver).</PanelSectionRow>
                ) : (
                    <>
                        <PanelSectionRow>
                            <ToggleField
                                label="Game Glance screensaver"
                                description="Steam's Game Slideshow with the games of your Games row and their custom art, filling the screen. Turn off the logo, status bar and stats for only the art. Off returns Steam's own."
                                checked={screensaver.enabled}
                                onChange={(value) => settings.setScreensaver({ enabled: value })}
                            />
                        </PanelSectionRow>
                        {screensaver.enabled && (
                            <>
                                <PanelSectionRow>
                                    <ToggleField
                                        label="Logo"
                                        description="The game's logo at the bottom-left, as on Home (its name when it has none)."
                                        checked={screensaver.logo}
                                        onChange={(value) => settings.setScreensaver({ logo: value })}
                                    />
                                </PanelSectionRow>
                                <PanelSectionRow>
                                    <ToggleField
                                        label="Status bar"
                                        description="Clock, battery and connection at the top-right."
                                        checked={screensaver.statusBar}
                                        onChange={(value) => settings.setScreensaver({ statusBar: value })}
                                    />
                                </PanelSectionRow>
                                <PanelSectionRow>
                                    <ToggleField
                                        label="Stats"
                                        description="A small card at the bottom-right: your play time, the HowLongToBeat time you are working toward and your achievements."
                                        checked={screensaver.stats}
                                        onChange={(value) => settings.setScreensaver({ stats: value })}
                                    />
                                </PanelSectionRow>
                                <PanelSectionRow>
                                    <ButtonItem layout="below" onClick={previewScreensaver}>Preview</ButtonItem>
                                </PanelSectionRow>
                            </>
                        )}
                    </>
                )}
            </PanelSection>
            <PanelSection title="HowLongToBeat match">
                {game ? (
                    <>
                        <PanelSectionRow>
                            <div>{game.name}</div>
                            <div style={{ opacity: 0.7, fontSize: '12px' }}>{match}</div>
                        </PanelSectionRow>
                        {hltb?.status === 'found' && (
                            <PanelSectionRow>
                                <ButtonItem
                                    layout="below"
                                    onClick={() => Navigation.NavigateToExternalWeb(`https://howlongtobeat.com/game/${hltb.gameId}`)}
                                >
                                    Open on HowLongToBeat
                                </ButtonItem>
                            </PanelSectionRow>
                        )}
                        <PanelSectionRow>
                            <TextField label="HowLongToBeat link or ID" value={input} onChange={(e) => setInput(e.target.value)} />
                        </PanelSectionRow>
                        <PanelSectionRow>
                            <ButtonItem layout="below" onClick={save}>Use this game</ButtonItem>
                        </PanelSectionRow>
                        {overrideId !== null && (
                            <PanelSectionRow>
                                <ButtonItem layout="below" onClick={remove}>Remove override</ButtonItem>
                            </PanelSectionRow>
                        )}
                    </>
                ) : (
                    <PanelSectionRow>Open a game page first.</PanelSectionRow>
                )}
            </PanelSection>
            <PanelSection title="Data">
                <PanelSectionRow>
                    <ToggleField
                        label="Pre-load new games automatically"
                        description="Checks for new installs every 30 minutes and fetches their game info."
                        checked={autoPreload}
                        onChange={(value) => settings.setAutoPreload(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ButtonItem
                        layout="below"
                        description={
                            fetching.running
                                ? `${fetching.found} found so far. You can close this menu.`
                                : 'Fills in times and descriptions for every installed game, about one per second.'
                        }
                        onClick={() => (fetching.running ? fetchAll.stop() : void fetchAll.start())}
                    >
                        {fetching.running
                            ? `Stop (${fetching.done} / ${fetching.total || '…'})`
                            : 'Pre-load game info for installed games'}
                    </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                    <ButtonItem
                        layout="below"
                        onClick={async () => {
                            await cache.clear();
                            toaster.toast({ title: PLUGIN_NAME, body: 'Cached data cleared.' });
                        }}
                    >
                        Clear cached data
                    </ButtonItem>
                </PanelSectionRow>
            </PanelSection>
            <UpdatesSection />
        </>
    );
}
