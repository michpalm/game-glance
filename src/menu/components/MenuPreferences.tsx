import { ButtonItem, PanelSection, PanelSectionRow, ToggleField } from '@decky/ui';
import { useState, useSyncExternalStore } from 'react';
import { menuPreferences, openSteamMenu } from '../startMenu';

/** One preferences store is shared by Decky settings and the floating menu. */
export function MenuPreferences() {
    const value = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.get);
    const loadState = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.loadState);
    const [error, setError] = useState('');
    const run = (action: () => Promise<void>) => { setError(''); void action().catch(() => setError('Could not save or open this option. Try again.')); };
    return <PanelSection title="Floating menu · local preview">
        <PanelSectionRow><ToggleField label="Use Game Glance menu" description="Replace the Home and quick access menus. Requires Game Glance to be enabled. Native views remain available inside the menu." checked={value.enabled} disabled={loadState !== 'ready'} onChange={enabled => run(() => menuPreferences.setEnabled(enabled))} /></PanelSectionRow>
        {loadState === 'failed' && <PanelSectionRow><ButtonItem layout="below" onClick={() => run(() => menuPreferences.load())}>Retry loading menu preferences</ButtonItem></PanelSectionRow>}
        <PanelSectionRow><ButtonItem layout="below" onClick={() => run(openSteamMenu)}>Open Steam menu</ButtonItem></PanelSectionRow>
        {error && <PanelSectionRow><div role="alert">{error}</div></PanelSectionRow>}
    </PanelSection>;
}
