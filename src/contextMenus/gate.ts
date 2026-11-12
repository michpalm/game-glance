/** Steam's context menus take the Game Glance look under the same rule as the Steam Settings restyle (NativeSettingsHost). */
export const contextMenusOn = (s: { ready: boolean; masterEnabled: boolean; load: string; enabled: boolean; restyle: boolean }) =>
    s.ready && s.masterEnabled && s.load === 'ready' && s.enabled && s.restyle;
