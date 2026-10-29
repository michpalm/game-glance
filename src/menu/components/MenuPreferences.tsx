import { DropdownItem, ButtonItem, PanelSection, PanelSectionRow, ToggleField } from '@decky/ui';
import { useState, useSyncExternalStore } from 'react';
import { menuPreferences, openSteamMenu, isMenuServiceCurrent, subscribeMenuService } from '../startMenu';

/** One preferences store is shared by Decky settings and the floating menu. */
export function MenuPreferences() {
    const current = useSyncExternalStore(subscribeMenuService, isMenuServiceCurrent);
    const value = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.get);
    const loadState = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.loadState);
    const [error, setError] = useState('');
    const run = (action: () => Promise<void>) => { setError(''); void action().catch(() => setError('Could not save or open this option. Try again.')); };
    return <PanelSection title="Floating menu · local preview">
        <PanelSectionRow><ToggleField label="Use Game Glance menu" description="Replace the Home and quick access menus. Requires Game Glance to be enabled. Native views remain available inside the menu." checked={value.enabled} disabled={!current || loadState !== 'ready'} onChange={enabled => run(() => menuPreferences.setEnabled(enabled))} /></PanelSectionRow>
        <PanelSectionRow><DropdownItem label="Social keyboard" description="Choose the keyboard for the Social message field." rgOptions={[{label:'Compact',data:'compact'},{label:'Radial',data:'radial'}]} selectedOption={value.socialKeyboard} disabled={!current || loadState !== 'ready'} onChange={option => run(() => menuPreferences.setSocialKeyboard(option.data === 'radial' ? 'radial' : 'compact'))} /></PanelSectionRow>
        {!current && <PanelSectionRow>Game Glance was reloaded. Close and reopen its settings to continue.</PanelSectionRow>}
        {current && loadState === 'failed' && <PanelSectionRow><ButtonItem layout="below" onClick={() => run(() => menuPreferences.load())}>Retry loading menu preferences</ButtonItem></PanelSectionRow>}
        <PanelSectionRow><ButtonItem layout="below" onClick={() => run(openSteamMenu)}>Open Steam menu</ButtonItem></PanelSectionRow>
        {error && <PanelSectionRow><div role="alert">{error}</div></PanelSectionRow>}
    </PanelSection>;
}
