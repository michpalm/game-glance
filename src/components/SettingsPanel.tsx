import { toaster } from '@decky/api';
import { ButtonItem, Navigation, PanelSection, PanelSectionRow, TextField, ToggleField } from '@decky/ui';
import { useEffect, useState } from 'react';
import { cache, overrides } from '../data/cache';
import { useCurrentGame } from '../data/currentGame';
import { fetchAll, useFetchAll } from '../data/fetchAll';
import { settings, useSettings } from '../data/settings';
import { installUpdate, UpdateState, useUpdate } from '../data/update';
import { checkOverride } from '../logic/hltbId';
import { PLUGIN_NAME } from '../constants';

/** The Updates section's line under the title: the installed version and what the check found. */
function updateLine(state: UpdateState): string {
    const version = state.current ? `Version ${state.current}` : 'Game Glance';
    switch (state.status) {
        case 'checking':
            return `${version} · checking for updates…`;
        case 'upToDate':
            return `${version} · up to date`;
        case 'available':
            return `${version} · ${state.release.version} is available`;
        default:
            return `${version} · could not check for updates`;
    }
}

/**
 * Updates: checks GitHub's latest release once per session when the panel opens (data/update.ts), and installs a newer
 * one through Decky's own installer, which asks to confirm and then reloads Game Glance.
 */
function UpdatesSection() {
    const { state, recheck } = useUpdate();
    return (
        <PanelSection title="Updates">
            <PanelSectionRow>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{updateLine(state)}</div>
            </PanelSectionRow>
            {state.status === 'available' && (
                <PanelSectionRow>
                    <ButtonItem
                        layout="below"
                        description="Decky asks to confirm, then installs it and reloads Game Glance."
                        onClick={async () => {
                            if (!(await installUpdate(state.release))) {
                                toaster.toast({ title: PLUGIN_NAME, body: 'Could not start the update. Install it from the release page instead.' });
                            }
                        }}
                    >
                        Update to {state.release.version}
                    </ButtonItem>
                </PanelSectionRow>
            )}
            {state.status === 'error' && (
                <PanelSectionRow>
                    <ButtonItem layout="below" onClick={recheck}>
                        Check again
                    </ButtonItem>
                </PanelSectionRow>
            )}
        </PanelSection>
    );
}

export function SettingsPanel() {
    const { enabled, autoPreload, spotlightHome, wishlistDeals, homeFeed, homeNewGames, cleanPage, homeStatusBar, preferLogos, trailerBackground } = useSettings();
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
                        label="New to library"
                        description="Adds games new to your library that you have not played yet to the recent games row, as on Steam's Home."
                        checked={homeNewGames}
                        onChange={(value) => settings.setHomeNewGames(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ToggleField
                        label="What's new, Friends, Recommended"
                        description="The tabs under your games. Off hides them; Home shows only the selected game."
                        checked={homeFeed}
                        onChange={(value) => settings.setHomeFeed(value)}
                    />
                </PanelSectionRow>
                {/* The deals show on the Recommended tab, so the switch goes with it. */}
                {homeFeed && (
                    <PanelSectionRow>
                        <ToggleField
                            label="Show wishlist deals"
                            description="Sends your Steam ID to Steam's public store to find games on sale from your wishlist. Off by default."
                            checked={wishlistDeals}
                            onChange={(value) => settings.setWishlistDeals(value)}
                        />
                    </PanelSectionRow>
                )}
            </PanelSection>
            <PanelSection title="Appearance">
                <PanelSectionRow>
                    <ToggleField
                        label="Prefer game logos"
                        description="Shows game logos instead of text titles in Spotlight Home and Game Glance pages when available. Off always displays text."
                        checked={preferLogos}
                        onChange={(value) => settings.setPreferLogos(value)}
                    />
                </PanelSectionRow>
                <PanelSectionRow>
                    <ToggleField
                        label="Trailer background"
                        description="Plays game trailers as background on Spotlight Home after staying on a game for a few seconds. Off by default."
                        checked={trailerBackground}
                        onChange={(value) => settings.setTrailerBackground(value)}
                    />
                </PanelSectionRow>
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
