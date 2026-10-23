import { appDetailsClasses, appDetailsHeaderClasses, findClassModule, playSectionClasses } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { nativeUnavailableMessageSelectors, arrivalSelectors, buildAccentCss, steamFooterSelector, buildArrivingCss, buildSteamEnterOffCss, buildCleanCss, buildDownloadCss, buildLaunchCss, buildRingCss, buildThemeCss, buildUnifideckCss, ClassMap, launchTargets, playRowSelector, ringBoost, ThemeClasses, ThemeOptions, twinTargets } from './themeCss';
import { viewportSize } from '../home/openHome';
import type { ReadySelectors } from './pageReady';

let classes: ThemeClasses | null = null;

function safeFind(filter: (m: Record<string, string>) => boolean): ClassMap {
    try {
        return (findClassModule(filter) || undefined) as ClassMap;
    } catch (error) {
        console.warn(`${LOG_PREFIX} class module lookup failed`, error);
        return undefined;
    }
}

/** Steam's class maps, looked up once by stable module keys (resolved live on 2026-10-02). */
function themeClasses(): ThemeClasses {
    if (!classes) {
        classes = {
            header: appDetailsHeaderClasses as unknown as ClassMap,
            details: appDetailsClasses as unknown as ClassMap,
            play: playSectionClasses as unknown as ClassMap,
            root: safeFind((m) => Boolean(m.AppDetailsRoot && m.PlaySection && m.AppDetailsContainer)),
            overview: safeFind((m) => Boolean(m.Backdrop && m.BackdropGlass)),
            launch: safeFind((m) => Boolean(m.Container && m.ConfigurationHeader && m.ControlOverviewContainer)),
            shared: safeFind((m) => Boolean(m.SharedLibrary && m.Row)),
            transition: safeFind((m) => Boolean(m.TopLevelTransition && m.Enter && m.EnterActive)),
            footer: safeFind((m) => Boolean(m.BasicFooter && m.FooterLegend)),
        };
    }
    return classes;
}

export function themeCss(options?: ThemeOptions): string {
    return buildThemeCss(themeClasses(), options);
}

/** The page's glass rings as bright as Home's on this window's screen (themeCss.ringBoost). */
export function ringCss(win: Parameters<typeof viewportSize>[0]): string {
    const { width, height, dpr } = viewportSize(win);
    return buildRingCss(ringBoost(dpr ?? 0, width, height));
}

/** The game's accent for the restyled page (Spotlight Home on); '' if the colour or Steam's class is unusable. */
export function accentCss(color: string): string {
    return buildAccentCss(themeClasses(), color);
}

/** The restyled Play pill's download fill (and Steam's bar hidden); '' without a percent. */
export function downloadCss(percent: number | null): string {
    return buildDownloadCss(themeClasses(), percent);
}

/** The page's look while Steam's launch overlay is up (themeCss.buildLaunchCss); '' if the overlay's class is unknown. */
export function launchCss(): string {
    return buildLaunchCss(themeClasses());
}

/** The launch overlay's selector and what hides under it (themeCss.launchTargets). */
export function launchSelectors(): { overlay: string | null; hide: string[] } {
    return launchTargets(themeClasses());
}

/** The layout on a Unifideck game's page (themeCss.buildUnifideckCss); '' without the layout's classes. */
export function unifideckCss(options?: ThemeOptions): string {
    return buildUnifideckCss(themeClasses(), options);
}

/** The Game Glance page's Clean look (themeCss.buildCleanCss); '' without the layout's classes. */
export function cleanCss(): string {
    return buildCleanCss(themeClasses());
}

/** The page arriving after Spotlight Home's open transition (themeCss.buildArrivingCss); '' without the layout's classes. */
export function arrivingCss(look: 'spotlight' | 'clean', mode: 'parts' | 'all', revealed = false, extra: Parameters<typeof buildArrivingCss>[4] = {}): string {
    return buildArrivingCss(themeClasses(), look, mode, revealed, extra);
}

/** What the page's ready check reads (themeCss.arrivalSelectors). */
export function pageArrivalSelectors(): ReadySelectors {
    return arrivalSelectors(themeClasses());
}

/** Steam's page-enter fade switched off (themeCss.buildSteamEnterOffCss), for the open transition's bridge. */
export function steamEnterOffCss(): string {
    return buildSteamEnterOffCss(themeClasses());
}

/** Steam's footer (themeCss.steamFooterSelector), which the open transition's bridge copies. */
export function steamFooter(): string | null {
    return steamFooterSelector(themeClasses());
}

/** Steam's Play row on the game page (themeCss.playRowSelector), for logic/cardNav; null without its classes. */
export function playRow(): string | null {
    return playRowSelector(themeClasses());
}

/** Steam's compatibility/feedback prompt and its focusable confirmation after answering. */
export function pageFeedbackSelector(): string | null {
    const root = themeClasses().root;
    const classes = [root?.DeckVerifiedFeedbackContainer, root?.DeckVerifiedFeedbackConfirmationContainer].filter((name): name is string => !!name);
    return classes.length ? classes.map((name) => `.${name}`).join(', ') : null;
}

/** Steam aligns the submenu's container below its own header padding. */
export function pageTabsSection(): { selector: string; inset: number } | null {
    const root = themeClasses().root;
    if (!root?.AppDetailsContainer) return null;
    const inset = Number.parseFloat(root.headerPadding ?? '');
    return { selector: `.${root.AppDetailsContainer}`, inset: Number.isFinite(inset) && inset >= 0 ? inset : 0 };
}

/** Each open-transition text twin's counterpart on the page (themeCss.twinTargets). */
export function pageTwinTargets(look: 'spotlight' | 'clean' | 'steam'): Record<string, string> {
    return twinTargets(themeClasses(), look);
}

/** Play, its circles, the cloud button, and the library selection pill. */
export function playRowControlSelector(): string | null {
    const t = themeClasses();
    const parts = [
        t.root?.PlaySection ? `.${t.root.PlaySection} [role="button"]` : '',
        t.play?.CloudStatusRow ? `.${t.play.CloudStatusRow}` : '',
        '.gg-copy-pill, .gg-store-choice',
        '.unifideck-hide-native-play :is(.unifideck-play-btn, .unifideck-install-btn, .unifideck-resume-btn, .unifideck-update-btn, .unifideck-icon-btn)',
    ].filter((s) => s.length > 0);
    return parts.length > 0 ? parts.join(', ') : null;
}

/** The preferred-version link, once Steam's library-line class is known. */
export function versionLinkSelector(): string | null {
    const row = themeClasses().shared?.SharedLibrary;
    return row ? `.${row} a[role="button"]` : null;
}

/** Steam's unavailable message, for the shared Last played / availability metadata line. */
export function unavailableMessageSelectors(): { container: string | null; message: string | null } {
    return nativeUnavailableMessageSelectors(themeClasses());
}
