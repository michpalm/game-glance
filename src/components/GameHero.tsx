import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Focusable } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { withKnownAchievements } from '../home/detailsMemo';
import { cache } from '../data/cache';
import { setCurrentGame } from '../data/currentGame';
import { lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { getShortcutDescription } from '../data/shortcutDescription';
import { getSourceLabel, peekSourceLabel } from '../data/source';
import { mergePlaytime } from '../data/unifideckPlaytime';
import { getDescription, getSteamLanguage, peekSteamLanguage, readGameInfo } from '../data/steam';
import { accentFor } from '../home/accent';
import { accentVersion, sampleAccent } from '../home/accentSample';
import { homeMode } from '../home/mode';
import { formatLastPlayed } from '../home/recents';
import { useAsync } from '../hooks/useAsync';
import { useLauncherPlaytime } from '../hooks/useLauncherPlaytime';
import { useUnifideckGamepadFocus } from '../hooks/useUnifideckGamepadFocus';
import { useUnifideckInstalled } from '../hooks/useUnifideckInstalled';
import { useUnifideckSizeLabel } from '../hooks/useUnifideckSizeLabel';
import { useUnifideckSize } from '../hooks/useUnifideckSize';
import { useOverrideVersion } from '../hooks/useOverrideVersion';
import { steamLanguageToLocale } from '../logic/format';
import { heroicStoreLabel } from '../logic/heroic';
import { rememberSizeLabel, sizeStat, steamSpaceStat } from '../logic/sizeStat';
import { memoSpaceRequired } from '../home/detailsMemo';
import { useDownload } from '../home/useDownload';
import { useLaunchOverlay } from '../styles/launchOverlay';
import { useOpenArrival } from '../hooks/useOpenArrival';
import { openPending } from '../data/openIntent';
import { knownDescription, peekHltb, rememberDescription, rememberHltb } from '../home/warmup';
import { accentMemo, knownAccent } from '../home/accentMemo';
import { accentCss, arrivingCss, cleanCss, downloadCss, launchCss, launchSelectors, pageHeroImage, ringCss, themeCss, unifideckCss } from '../styles/theme';
import { HeroFit, STANDARD_HERO_ASPECT, fitMask, windowAspect } from '../home/heroFit';
import { installMouseMode } from '../home/mouseMode';
import { useCardNav, usePageFocusScrolling } from '../hooks/useCardNav';
import { pageNavParts } from '../logic/cardNav';
import { CleanInfo } from './CleanInfo';
import { ErrorBoundary } from './ErrorBoundary';
import { GameStatusBar } from './GameStatusBar';
import { UnifideckRowNav } from './UnifideckRowNav';
import { PlayRowNav } from './PlayRowNav';
import { UnifideckCloud } from './UnifideckCloud';
import { HltbCard } from './HltbCard';
import { InfoCard } from './InfoCard';
import { GameSourcePill } from './GameSourcePill';
import { LibraryPill } from './LibraryPill';
import { GameTitle } from './GameTitle';
import { GameMetadata } from './GameMetadata';
import { hltbUrl, openGameInfoTab, openHltbPage } from './cardActions';

/** A canvas length in the restyled page's scale unit (themeCss: --gg-d). */
const pageUnit = (n: number) => `calc(${n} * var(--gg-d))`;
import { tr } from '../i18n/steamText';

interface Props {
    overview: unknown;
    details: unknown;
}


/** The game's accent (same source and cache as Spotlight Home), only while restyled; undefined until known. */
/**
 * The page's hero in Fit (home/heroFit, themeCss): Steam's header image (`src`, its shape `artAspect`, the standard hero
 * shape until known) as the art fill's url and the fade for a box of `boxAspect`. Nothing in Fill or without the image. Pure.
 */
export function heroFitVars(fit: HeroFit, src: string | null, artAspect: number | null, boxAspect: number): Record<string, string> {
    if (fit !== 'fit' || !src) return {};
    return { '--gg-hero-fill': `url("${src.replace(/"/g, '%22')}")`, '--gg-hero-mask': fitMask(artAspect ?? STANDARD_HERO_ASPECT, boxAspect) };
}

/** Steam's low-resolution placeholder remains a fallback until the full hero has usable pixels. */
export function pageHeroFitVars(fit: HeroFit, img: Pick<HTMLImageElement, 'src' | 'currentSrc' | 'complete' | 'naturalWidth' | 'naturalHeight'> | null, boxAspect: number): Record<string, string> {
    const aspect = img && img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null;
    const vars = heroFitVars(fit, img ? img.currentSrc || img.src : null, aspect, boxAspect);
    if (!('--gg-hero-fill' in vars)) return vars;
    return { ...vars, '--gg-hero-placeholder': img?.complete && aspect !== null ? 'hidden' : 'visible' };
}

type VarStyle = { getPropertyValue(name: string): string; removeProperty(name: string): string };

/**
 * Removes the variables this page set, unless another page has set them since: Steam keeps a leaving page mounted
 * through its exit, after the next page has set its own on the same document.
 */
export function removeOwnVars(style: VarStyle, own: Record<string, string>) {
    for (const [name, value] of Object.entries(own)) if (style.getPropertyValue(name) === value) style.removeProperty(name);
}

/**
 * Keeps heroFitVars on the page's document while the restyled page shows (the header image's own url, so the fill is
 * the same art), following the image as it loads or changes and the setting; removed when the page goes.
 */
function usePageHeroFit(doc: Document | null, fit: HeroFit, active: boolean) {
    // Before paint, so the page never shows a frame without them (themeCss also falls back to the standard fade).
    useLayoutEffect(() => {
        const root = doc?.documentElement;
        const selector = pageHeroImage();
        if (!doc || !root || !active || !selector) return undefined;
        let applied: Record<string, string> = {};
        const apply = () => {
            const img = doc.querySelector<HTMLImageElement>(selector);
            const win = doc.defaultView;
            const vars = pageHeroFitVars(fit, img, windowAspect(win));
            removeOwnVars(root.style, Object.fromEntries(Object.entries(applied).filter(([name]) => !(name in vars))));
            for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
            applied = vars;
        };
        apply();
        // The header image arrives (or changes, for custom art) after the page: its load events reach the document in the capture phase.
        const onLoad = (event: Event) => {
            if ((event.target as Element | null)?.matches?.(selector)) apply();
        };
        doc.addEventListener('load', onLoad, true);
        doc.addEventListener('error', onLoad, true);
        // A replacement source can start loading after a ready image: restore the fallback immediately.
        const observer = new MutationObserver(apply);
        const image = doc.querySelector(selector);
        observer.observe(image?.parentElement ?? doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
        return () => {
            observer.disconnect();
            doc.removeEventListener('load', onLoad, true);
            doc.removeEventListener('error', onLoad, true);
            removeOwnVars(root.style, applied);
        };
    }, [doc, fit, active]);
}

function useGameAccent(appId: number, active: boolean): string | undefined {
    const loaded = useAsync(active && appId !== 0 ? `accent:${appId}` : null, async () => {
        const color = await accentFor(appId, { cache, sample: sampleAccent, version: accentVersion });
        accentMemo.set(appId, color);
        return color;
    });
    // Until it answers, the colour already known this session (Home's too: home/accentMemo), so the first frame has it.
    return active ? knownAccent(loaded, appId) : undefined;
}

/** "Last played · Today" from Steam's overview (Unix seconds); null if never played or unreadable. */
function lastPlayedEyebrow(overview: unknown, locale: string, unifideckLastPlayed: number | null = null): string | null {
    try {
        const steamSeconds = Number((overview as { rt_last_time_played?: unknown } | null)?.rt_last_time_played ?? 0);
        const seconds = mergePlaytime({ minutes: 0, lastPlayed: Number.isFinite(steamSeconds) ? steamSeconds : 0 }, { playedSeconds: null, lastPlayed: unifideckLastPlayed }).lastPlayed;
        if (!Number.isFinite(seconds) || seconds <= 0) return null;
        return `${tr('lastPlayed')} · ${formatLastPlayed(seconds, Math.floor(Date.now() / 1000), locale)}`;
    } catch (error) {
        console.warn(`${LOG_PREFIX} could not read last played`, error);
        return null;
    }
}

function Hero({ overview, details, restyle, clean }: Props & { restyle: boolean; clean: boolean }) {
    // Until Steam has loaded the game's details, the achievement counts Spotlight Home already knows (home/detailsMemo), so the
    // first frame is complete (the Clean panel no longer gains its Achievements column after the open transition's hand-over).
    const steamGame = withKnownAchievements(readGameInfo(overview, details));
    // A Unifideck or Lutris game: the launcher's own play time and last played, as on Unifideck's Play row (Steam has none for Unifideck's; Lutris's also counts play started from Lutris).
    const launcher = useLauncherPlaytime(steamGame.appId, steamGame.isShortcut, steamGame.lutris);
    const game = launcher ? { ...steamGame, playedMinutes: mergePlaytime({ minutes: steamGame.playedMinutes, lastPlayed: 0 }, launcher).minutes } : steamGame;
    const overrideVersion = useOverrideVersion();
    const knownLang = peekSteamLanguage();
    const loadedLang = useAsync(knownLang ? null : 'lang', getSteamLanguage);
    const lang = knownLang ?? loadedLang;
    const locale = steamLanguageToLocale(lang ?? 'english');
    const knownSource = peekSourceLabel(game.appId, game.isShortcut);
    const fetchedSource = useAsync(knownSource === undefined ? `src:${game.appId}` : null, () =>
        getSourceLabel(game.appId, game.isShortcut, undefined, heroicStoreLabel(game.heroic)),
    );
    const source = knownSource ?? fetchedSource;
    // Wait for the language so the description is fetched once, in the right language.
    const fetchedDescription = useAsync(lang === undefined ? null : `desc:${game.appId}:${lang}`, () =>
        game.isShortcut ? getShortcutDescription(game, lang ?? 'english') : getDescription(game.appId, lang ?? 'english'),
    );
    // Until the fetch answers, the text Spotlight Home already fetched (home/warmup), so the first frame has it and the
    // open transition's copy of it hands over unchanged.
    const description = knownDescription(fetchedDescription, game.appId, lang);
    useEffect(() => {
        if (lang !== undefined && fetchedDescription) rememberDescription(game.appId, lang, fetchedDescription);
    }, [game.appId, lang, fetchedDescription]);
    const looked = useAsync(`hltb:${game.appId}:${overrideVersion}`, () =>
        lookupHltb({ appId: game.appId, name: game.name, isShortcut: game.isShortcut }),
    );
    // Until the lookup answers, the times Spotlight Home already knows (its session memo, home/warmup), so the first frame
    // is complete (the Clean panel no longer narrows for a moment at the open transition's hand-over).
    const hltb = looked ?? peekHltb(game.appId);
    useEffect(() => {
        if (looked) rememberHltb(game.appId, looked);
    }, [game.appId, looked]);
    // Opened from Spotlight Home's open transition: Home's eyebrow words, kept for this visit (data/openIntent).
    const [openedFrom] = useState(() => openPending(game.appId));

    const { homeStatusBar: statusBar, gameLogo, heroFit } = useSettings();
    const accent = useGameAccent(game.appId, restyle);
    // Restyled only: the Play pill fills with Steam's download progress (hooks run either way; the CSS only when restyled).
    const { download } = useDownload(restyle && game.appId !== 0 ? game.appId : null);
    // Restyled only (where Unifideck's own size item is hidden): a Unifideck game's install / download size in our card.
    // Unifideck's own record says whether it is installed (Steam reads a shortcut as installed whatever Unifideck says); no size until it answers.
    const uniInstalled = useUnifideckInstalled(game.appId, restyle && game.isShortcut);
    const unifideckSize = useUnifideckSize(game.appId, game.isShortcut && typeof uniInstalled === 'boolean', uniInstalled === true, restyle);
    // Unifideck's own word for the size item, read from its hidden row in this page (its plugin does the translating).
    const heroRef = useRef<HTMLDivElement>(null);
    const [pageDoc, setPageDoc] = useState<Document | null>(null);
    useEffect(() => setPageDoc(heroRef.current?.ownerDocument ?? null), [game.appId]);
    // Hover looks follow a mouse (home/mouseMode), here as on Home.
    useEffect(() => (pageDoc ? installMouseMode(pageDoc) : undefined), [pageDoc]);
    // Fit's art fill and fade on the page (themeCss reads them), the restyle only: the 1.1.1 page keeps Steam's own header.
    usePageHeroFit(pageDoc, heroFit, restyle);
    // The controller between the Play row, the cards and Steam's tabs, in the screen's order (#24).
    const navParts = pageNavParts(restyle, clean);
    useCardNav(pageDoc, navParts.dpad);
    // Focus moves the page as in the restyled look, Clean too: the feedback row centred, the tabs below Steam's header.
    usePageFocusScrolling(pageDoc, navParts.scrolling);
    // B and the D-pad go to Steam's gamepad focus, which can land on a hidden tab of Steam's own page on a Unifideck page (logic/gamepadFocus).
    useUnifideckGamepadFocus(pageDoc, game.isShortcut);
    const nativeSizeLabel = useUnifideckSizeLabel(pageDoc, game.appId, uniInstalled, restyle && game.isShortcut);
    // A Steam game that is not installed: its install size, from the space Steam says it needs (details, or Home's memo).
    const spaceNeeded = (details as { lDiskSpaceRequiredBytes?: unknown } | null | undefined)?.lDiskSpaceRequiredBytes;
    const steamSize = restyle && !game.isShortcut ? steamSpaceStat(overview, typeof spaceNeeded === 'number' ? spaceNeeded : memoSpaceRequired(game.appId), locale, tr('spaceRequired')) : null;
    const size = (restyle && typeof uniInstalled === 'boolean' ? sizeStat(unifideckSize, uniInstalled, locale, nativeSizeLabel) : null) ?? steamSize;
    // Kept for Home's open, which draws this column before the page (OpenExtras) in Unifideck's own word.
    useEffect(() => {
        if (typeof uniInstalled === 'boolean') rememberSizeLabel(uniInstalled, nativeSizeLabel);
    }, [uniInstalled, nativeSizeLabel]);
    const fillCss = restyle ? downloadCss(download?.percent ?? null) : '';
    // While Steam's launch overlay is up, the page's text fades away so the overlay sits on the game's art alone; after
    // Play on Home (data/launchIntent) the page starts that way, so it never shows before the launch screen.
    const { overlay, hide } = launchSelectors();
    const launching = useLaunchOverlay(heroRef, overlay, hide, game.appId);
    // Opened from Spotlight Home's open transition: the page's new parts (or the whole page) arrive once it is ready.
    const arrival = useOpenArrival(heroRef, game.appId);

    useEffect(() => {
        setCurrentGame(game, hltb);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.appId, hltb]);

    if (game.appId === 0) return null;
    // The Clean look, only where its layout applies (Steam's classes found); otherwise the page keeps its cards.
    const cleanStyle = clean ? cleanCss() : '';
    const ringStyle = pageDoc?.defaultView ? ringCss(pageDoc.defaultView) : '';
    const eyebrow = restyle ? openedFrom?.eyebrow ?? lastPlayedEyebrow(overview, locale, launcher?.lastPlayed ?? null) : null;
    return (
        <>
            {/* Spotlight Home's status bar, over Steam's top strip, with the restyled page (not while Steam's launch screen is up). */}
            {restyle && statusBar && !launching && <GameStatusBar />}
            {/* A Unifideck game's circle buttons are reordered by CSS; the D-pad then steps by position. */}
            {game.isShortcut && <UnifideckRowNav />}
            {restyle && <PlayRowNav />}
            {restyle && game.isShortcut && <UnifideckCloud appId={game.appId} installed={uniInstalled} />}
            {/* Spotlight Home's eyebrow and title; the theme shows them only with its full-screen layout, where Steam's logo was (hidden then). */}
            {restyle && game.name !== '' && (
                <div className="gg-titleblock">
                    {/* As on Home: the title (or logo) first, the eyebrow under it. */}
                    <GameTitle appId={game.appId} name={game.name} logo={gameLogo} className="gg-title" logoClassName="gg-logo" unit={pageUnit} />
                    <GameMetadata key={game.appId} doc={pageDoc} eyebrow={eyebrow} />
                </div>
            )}
            <div className="gg-hero" ref={heroRef}>
                <style>{themeCss({ restyle, heroFit })}</style>
                <style>{unifideckCss({ restyle })}</style>
                {ringStyle && <style>{ringStyle}</style>}
                {cleanStyle && <style>{cleanStyle}</style>}
                {launching && <style>{launchCss()}</style>}
                {accent && <style>{accentCss(accent)}</style>}
                {fillCss && <style>{fillCss}</style>}
                {arrival && restyle && <style>{arrivingCss(clean ? 'clean' : 'spotlight', arrival.intent.mode, arrival.revealed, { cloud: arrival.intent.homeCloud === false, bars: arrival.intent.homeBars, desc: arrival.intent.homeDesc, hltb: arrival.intent.homeHltb, family: arrival.intent.homeFamily, missing: arrival.intent.homeMissing, size: arrival.intent.homeSize, uninstall: arrival.intent.homeUninstall === true })}</style>}
                {source && (
                    <GameSourcePill label={source} doc={pageDoc} appId={game.appId} active={restyle}>
                        {/* A game from the family library (Steam's line under Play is hidden): with the restyled look only. */}
                        {restyle && <LibraryPill doc={pageDoc} appId={game.appId} />}
                    </GameSourcePill>
                )}
                {cleanStyle && <CleanInfo game={game} hltb={hltb} locale={locale} size={size} />}
                {/* Clean hides these two cards and shows .gg-clean-info instead. Leaving them mounted kept them in
                    Steam's focus tree at 0×0, so Up from Play landed there. Unmount them in that look. */}
                {!cleanStyle && (
                    <CardsRow selectable={restyle}>
                        {/* A tap, a click or the controller's A opens what each card summarises (#24, cardActions), in the
                            restyled look (it lifts the cards over Steam's page panel; the plain look keeps 1.1.1's page). The
                            controller reaches them from the Play row (hooks/useCardNav), Left/Right between them. */}
                        <InfoCard game={game} locale={locale} description={description} size={size} onPress={restyle ? (card) => openGameInfoTab(card.ownerDocument) : undefined} />
                        <HltbCard result={hltb} playedMinutes={game.playedMinutes} locale={locale} restyle={restyle} onPress={restyle && hltbUrl(hltb) ? () => openHltbPage(hltb) : undefined} />
                    </CardsRow>
                )}
                <div className="gg-more" aria-hidden="true">⌄</div>
            </div>
        </>
    );
}

export function GameHero(props: Props) {
    const settings = useSettings();
    if (!settings.enabled) return null;
    // Spotlight Home's look applies when both toggles are on, or with the Clean look (built on it); otherwise the page is
    // exactly 1.1.1's.
    const { restyleDetails, cleanDetails } = homeMode(settings);
    return (
        <ErrorBoundary>
            <Hero {...props} restyle={restyleDetails} clean={cleanDetails} />
        </ErrorBoundary>
    );
}

/** The cards' row: in the restyled look a Focusable row (Left/Right between the cards the controller can select). */
function CardsRow({ selectable, children }: { selectable: boolean; children: ReactNode }) {
    if (!selectable) return <div className="gg-cards">{children}</div>;
    return (
        <Focusable className="gg-cards" flow-children="row">
            {children}
        </Focusable>
    );
}
