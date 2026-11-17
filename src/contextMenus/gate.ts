/** Steam's context menus take the Game Glance look while the Restyle Steam's menus option is on. */
export const contextMenusOn = (s: { ready: boolean; masterEnabled: boolean; load: string; enabled: boolean; restyle: boolean }) =>
    s.ready && s.masterEnabled && s.load === 'ready' && s.enabled && s.restyle;
