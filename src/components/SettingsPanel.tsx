import { toaster } from '@decky/api';
import { ButtonItem, Navigation, PanelSection, PanelSectionRow, TextField, ToggleField } from '@decky/ui';
import { useEffect, useState } from 'react';
import { cache, overrides } from '../data/cache';
import { useCurrentGame } from '../data/currentGame';
import { fetchAll, useFetchAll } from '../data/fetchAll';
import { settings, useSettings } from '../data/settings';
import { checkOverride } from '../logic/hltbId';
import { PLUGIN_NAME } from '../constants';

export function SettingsPanel() {
    const { enabled, autoPreload } = useSettings();
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
                    <ToggleField label="Redesigned game page" checked={enabled} onChange={(value) => settings.setEnabled(value)} />
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
        </>
    );
}
