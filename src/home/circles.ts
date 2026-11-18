/**
 * Spotlight Home's action circles, counted among themselves (homeCss's open-transition transforms by position, and
 * openHome's measures in the same order). Not NonSteamLaunchers' theme-music buttons: it clones the controller circle
 * (classes included) into the row, and until components/ThemeMusicButton parks them they counted as circles, so the
 * gear took another circle's transform and jumped on the first open after Steam started (PS5, 2026-11-18).
 */
export const HOME_CIRCLE = '.gh-btn-circle:not([id^="my-custom-"])';
