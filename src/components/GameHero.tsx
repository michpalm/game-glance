import { TITLE_SCALE_VAR, titleScale } from '../home/titleSize';
import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Focusable } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { knownAchievementFacts, noteDetails, spaceRequiredOf, withKnownAchievements } from '../home/detailsMemo';
import { cache } from '../data/cache';
import { setCurrentGame } from '../data/currentGame';
import { lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { effectiveAccent } from '../home/accentChoice';
import { useProton } from '../data/useProton';
import { PLAYERS_PAGE_MAX_AGE_MS, PLAYERS_POLL_MS } from '../data/playerCount';
import { usePlayerCount } from '../data/usePlayerCount';
import { observePlayersPlacement } from '../styles/playersFit';
import { PlayersPill } from './PlayersPill';
import { usePlayCountBadge } from './usePlayCountBadge';
import { FeaturedId, GameInfoSlots, usesStat } from '../logic/infoSlots';
import { pageAchievementFacts, playFactsOf, steamCompatOf } from '../logic/featuredViews';
import { getShortcutDescription } from '../data/shortcutDescription';
import { getSourceLabel, peekSourceLabel } from '../data/source';
import { mergePlaytime } from '../data/unifideckPlaytime';
import { getDescription, getSteamLanguage, peekSteamLanguage, readGameInfo } from '../data/steam';
import { accentFor } from '../home/accent';
import { accentVersion, sampleAccent } from '../home/accentSample';
import { homeMode } from '../home/mode';
import { useChromeClaim, usePageShown } from '../chrome/useChromeClaim';
import { useChromeHeld } from '../chrome/useChrome';
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
import { useDownload } from '../home/useDownload';
import { useLaunchArt, useLaunchFromHome, useLaunchOverlay } from '../styles/launchOverlay';
import { launchArtLayers } from '../styles/launchArt';
import { heroArtAspect, heroArtFor } from '../home/HeroBackground';
import { useOpenArrival } from '../hooks/useOpenArrival';
import { openPending } from '../data/openIntent';
import { knownDescription, peekHltb, rememberDescription, rememberHltb } from '../home/warmup';
import { accentMemo, knownAccent } from '../home/accentMemo';
import { accentCss, arrivingCss, cleanCss, downloadCss, installSizeCss, launchArtHost, launchCss, launchSelectors, pageHeroImage, ringCss, themeCss, unifideckCss } from '../styles/theme';
import { EXPANDED_MASK, HeroFit, STANDARD_HERO_ASPECT, fitMask, overFill, windowAspect } from '../home/heroFit';
import { installMouseMode } from '../home/mouseMode';
import { installCalmFilter } from '../styles/tokens';
import { useCardNav, usePageFocusScrolling } from '../hooks/useCardNav';
import { pageNavParts } from '../logic/cardNav';
import { CleanInfo } from './CleanInfo';
import { ErrorBoundary } from './ErrorBoundary';
import { GameStatusBar } from './GameStatusBar';
import { UnifideckRowNav } from './UnifideckRowNav';
import { PlayRowNav } from './PlayRowNav';
import { UnifideckCloud } from './UnifideckCloud';
import { FeaturedCard } from './FeaturedCard';
import { InfoCard } from './InfoCard';
import { GameSourcePill } from './GameSourcePill';
import { LibraryPill } from './LibraryPill';
import { GameTitle } from './GameTitle';
import { GameMetadata } from './GameMetadata';
import { featuredPress, openGameInfoTab } from './cardActions';

/** A canvas length in the restyled page's scale unit (themeCss: --gg-d). */
const pageUnit = (n: number) => `calc(${n} * var(--gg-d))`;
import { tr } from '../i18n/steamText';

interface Props {
    overview: unknown;
    details: unknown;
}


/** The game's accent (same source and cache as Spotlight Home), only while restyled; undefined until known. */
/**
 * The page's hero in Fit or Expanded (home/heroFit, themeCss): Steam's header image (`src`, its shape `artAspect`, the standard hero
 * shape until known) as the art fill's url and the fade for a box of `boxAspect`. Nothing in Fill or without the image. Pure.
 */
export function heroFitVars(fit: HeroFit, src: string | null, artAspect: number | null, boxAspect: number): Record<string, string> {
    if (!overFill(fit) || !src) return {};
    const mask = fit === 'expanded' ? EXPANDED_MASK : fitMask(artAspect ?? STANDARD_HERO_ASPECT, boxAspect);
    return { '--gg-hero-fill': `url("${src.replace(/"/g, '%22')}")`, '--gg-hero-mask': mask };
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

/** The page's HowLongToBeat lookup key: null (no lookup) unless a Game info slot shows HowLongToBeat. Pure. */
export function hltbLookupKey(slots: GameInfoSlots, appId: number, overrideVersion: number): string | null {
    return usesStat(slots, 'hltb') ? `hltb:${appId}:${overrideVersion}` : null;
}

/** The cards row's classes: with nothing featured the info card is alone, at its own width (the row's second column stays empty). Pure. */
export function cardsRowClass(_featured: FeaturedId | null): string {
    return 'gg-cards';
}

/** A number field of Steam's overview; 0 when missing or unreadable. */
function overviewNumber(overview: unknown, key: string): number {
    const n = Number((overview as Record<string, unknown> | null | undefined)?.[key] ?? 0);
    return Number.isFinite(n) ? n : 0;
}

/** When the game was last played (Unix seconds, 0 never): Steam's overview merged with the launcher's, as on Home. */
function lastPlayedSeconds(overview: unknown, launcherLastPlayed: number | null): number {
    return mergePlaytime({ minutes: 0, lastPlayed: overviewNumber(overview, 'rt_last_time_played') }, { playedSeconds: null, lastPlayed: launcherLastPlayed }).lastPlayed;
}

/** "Last played · Today" from Steam's overview (Unix seconds); null if never played or unreadable. */
function lastPlayedEyebrow(overview: unknown, locale: string, unifideckLastPlayed: number | null = null): string | null {
    try {
        const seconds = lastPlayedSeconds(overview, unifideckLastPlayed);
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
    // What the page's details carry (the achievements' latest and rarest among them) is remembered and kept across restarts,
    // so the next open, and Home's card, have it before Steam answers. On every render: Steam fills the same details object
    // in place, so a dependency on it would miss the list arriving; noting is cheap and persists only what changed.
    const pageAppId = steamGame.appId;
    useEffect(() => {
        if (details) noteDetails(pageAppId, details);
    });
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
    const settings = useSettings();
    // HowLongToBeat only while a slot shows it (the Game info setting); otherwise no lookup and nothing shows it.
    const hltbKey = hltbLookupKey(settings.infoSlots, game.appId, overrideVersion);
    const looked = useAsync(hltbKey, () =>
        lookupHltb({ appId: game.appId, name: game.name, isShortcut: game.isShortcut }),
    );
    // Until the lookup answers, the times Spotlight Home already knows (its session memo, home/warmup), so the first frame
    // is complete (the Clean panel no longer narrows for a moment at the open transition's hand-over).
    const hltb = hltbKey !== null ? looked ?? peekHltb(game.appId) : undefined;
    useEffect(() => {
        if (looked) rememberHltb(game.appId, looked);
    }, [game.appId, looked]);
    // Opened from Spotlight Home's open transition: Home's eyebrow words, kept for this visit (data/openIntent).
    const [openedFrom] = useState(() => openPending(game.appId));

    const proton = useProton(game, usesStat(settings.infoSlots, 'protondb'));
    const { homeStatusBar: statusBar, gameLogo, heroFit, pageShading } = settings;
    const titleK = titleScale(settings.titleSize);
    const sampled = useGameAccent(game.appId, restyle);
    const accent = sampled === undefined ? undefined : effectiveAccent(sampled, settings);
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
    // The frost's calm filter (VDL Section 7); nothing while CALM_IN_CSS is off.
    useEffect(() => (pageDoc ? installCalmFilter(pageDoc) : undefined), [pageDoc]);
    // Fit's art fill and fade on the page (themeCss reads them), the restyle only: the 1.1.1 page keeps Steam's own header.
    usePageHeroFit(pageDoc, heroFit, restyle);
    // How many people play now (spec 2026-11-12-player-count-pill): Steam games, the restyled page, while the toggle is on.
    const playersOn = restyle && settings.playerCountPill && !game.isShortcut;
    const players = usePlayerCount(playersOn ? game.appId : null, { maxAgeMs: PLAYERS_PAGE_MAX_AGE_MS, pollMs: PLAYERS_POLL_MS, enabled: playersOn });
    // PlayCount's badge hides while ours stands in for it; pressing ours presses its button (its chart).
    const playersChart = usePlayCountBadge(pageDoc, playersOn && players !== null);
    const showPlayers = playersOn && players !== null;
    // In the pill row, or above it when the row would reach past the right-hand stat card (styles/playersFit).
    useLayoutEffect(() => {
        const holder = pageDoc?.querySelector<HTMLElement>('.gg-hero .gg-pill');
        const root = holder?.closest<HTMLElement>('.gg-hero');
        return showPlayers && holder && root ? observePlayersPlacement(holder, root) : undefined;
    }, [pageDoc, showPlayers, settings.storePill, settings.familyPill]);
    // The controller between the Play row, the cards and Steam's tabs, in the screen's order (#24).
    const navParts = pageNavParts(restyle, clean);
    useCardNav(pageDoc, navParts.dpad);
    // Focus moves the page as in the restyled look, Clean too: the feedback row centred, the tabs below Steam's header.
    usePageFocusScrolling(pageDoc, navParts.scrolling);
    // B and the D-pad go to Steam's gamepad focus, which can land on a hidden tab of Steam's own page on a Unifideck page (logic/gamepadFocus).
    useUnifideckGamepadFocus(pageDoc, game.isShortcut);
    const nativeSizeLabel = useUnifideckSizeLabel(pageDoc, game.appId, uniInstalled, restyle && game.isShortcut);
    // A Steam game that is not installed: its install size, from the space Steam says it needs (details, or Home's memo).
    const steamSize = restyle && !game.isShortcut ? steamSpaceStat(overview, spaceRequiredOf(game.appId, details), locale, tr('spaceRequired')) : null;
    const size = (restyle && typeof uniInstalled === 'boolean' ? sizeStat(unifideckSize, uniInstalled, locale, nativeSizeLabel) : null) ?? steamSize;
    // Kept for Home's open, which draws this column before the page (OpenExtras) in Unifideck's own word.
    useEffect(() => {
        if (typeof uniInstalled === 'boolean') rememberSizeLabel(uniInstalled, nativeSizeLabel);
    }, [uniInstalled, nativeSizeLabel]);
    const fillCss = restyle ? downloadCss(download?.percent ?? null) : '';
    // Space required at the Install pill's end: a Steam game not installed (steamSize is null otherwise) and not downloading.
    const sizeCss = restyle && !download ? installSizeCss(steamSize?.value ?? null) : '';
    // While Steam's launch overlay is up, the page's text fades away so the overlay sits on the game's art alone; after
    // Play on Home (data/launchIntent) the page starts that way, so it never shows before the launch screen.
    const { overlay, hide } = launchSelectors();
    const launching = useLaunchOverlay(heroRef, overlay, hide, game.appId);
    // Play on Home: Home's hero stays on screen, exactly as Home drew it, until the game takes over (styles/launchArt);
    // without it the page showed dark for about 300 ms while Steam's page and its image arrived.
    const fromHome = useLaunchFromHome(game.appId);
    const homeArt = fromHome && launching && restyle ? heroArtFor(game.appId) : null;
    const launchArt = homeArt?.mode === 'full' ? launchArtLayers(homeArt.url, heroFit, heroArtAspect(homeArt.url), windowAspect(pageDoc?.defaultView)) : null;
    useLaunchArt(heroRef, launchArtHost(), launchArt);
    // Opened from Spotlight Home's open transition: the page's new parts (or the whole page) arrive once it is ready.
    const arrival = useOpenArrival(heroRef, game.appId);
    // The chrome host owns the bar and footer here as on Home (chrome/ChromeHost): the page claims it while rendered (not
    // display:none under another screen). During launch the host keeps its visuals and releases input.
    const shown = usePageShown(heroRef, game.appId);
    useChromeClaim(shown ? { page: 'game', statusHidden: false, launching } : null);
    const hostBar = useChromeHeld();

    useEffect(() => {
        setCurrentGame(game, hltb);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.appId, hltb]);

    if (game.appId === 0) return null;
    // The Clean look, only where its layout applies (Steam's classes found); otherwise the page keeps its cards.
    const cleanStyle = clean ? cleanCss() : '';
    const ringStyle = pageDoc?.defaultView ? ringCss(pageDoc.defaultView) : '';
    const featured = settings.infoSlots.featured;
    const now = Math.floor(Date.now() / 1000);
    const eyebrow = restyle ? openedFrom?.eyebrow ?? lastPlayedEyebrow(overview, locale, launcher?.lastPlayed ?? null) : null;
    return (
        <>
            {/* Spotlight Home's status bar, over Steam's top strip, with the restyled page (not while Steam's launch screen is up). */}
            {restyle && statusBar && !launching && !hostBar && <GameStatusBar />}
            {/* A Unifideck game's circle buttons are reordered by CSS; the D-pad then steps by position. */}
            {game.isShortcut && <UnifideckRowNav />}
            {restyle && <PlayRowNav />}
            {restyle && game.isShortcut && <UnifideckCloud appId={game.appId} installed={uniInstalled} />}
            {/* Spotlight Home's eyebrow and title; the theme shows them only with its full-screen layout, where Steam's logo was (hidden then). */}
            {restyle && game.name !== '' && (
                <div className="gg-titleblock" style={{ [TITLE_SCALE_VAR]: titleK } as CSSProperties}>
                    {/* As on Home: the title (or logo) first, the eyebrow under it. */}
                    <GameTitle appId={game.appId} name={game.name} logo={gameLogo} className="gg-title" logoClassName="gg-logo" unit={pageUnit} scale={titleK} />
                    <GameMetadata key={game.appId} doc={pageDoc} eyebrow={eyebrow} />
                </div>
            )}
            <div className="gg-hero" ref={heroRef}>
                <style>{themeCss({ restyle, heroFit, pageShading })}</style>
                <style>{unifideckCss({ restyle })}</style>
                {ringStyle && <style>{ringStyle}</style>}
                {cleanStyle && <style>{cleanStyle}</style>}
                {launching && <style>{launchCss(fromHome)}</style>}
                {accent && <style>{accentCss(accent)}</style>}
                {fillCss && <style>{fillCss}</style>}
                {sizeCss && <style>{sizeCss}</style>}
                {arrival && restyle && <style>{arrivingCss(clean ? 'clean' : 'spotlight', arrival.intent.mode, arrival.revealed, { cloud: arrival.intent.homeCloud === false, bars: arrival.intent.homeBars, desc: arrival.intent.homeDesc, hltb: arrival.intent.homeHltb, family: arrival.intent.homeFamily, players: arrival.intent.homePlayers, missing: arrival.intent.homeMissing, size: arrival.intent.homeSize, uninstall: arrival.intent.homeUninstall === true })}</style>}
                {/* Either pill can be turned off (settings.storePill, familyPill); the family pill alone takes the store pill's place. */}
                {source && (settings.storePill || (restyle && settings.familyPill) || showPlayers) && (
                    <GameSourcePill label={source} doc={pageDoc} appId={game.appId} active={restyle} bare={!settings.storePill}>
                        {/* A game from the family library (Steam's line under Play is hidden): with the restyled look only. */}
                        {restyle && settings.familyPill && <LibraryPill doc={pageDoc} appId={game.appId} />}
                        {showPlayers && <PlayersPill count={players} locale={locale} className="gg-players" dotClassName="gg-players-dot" chart={playersChart} />}
                    </GameSourcePill>
                )}
                {cleanStyle && <CleanInfo game={game} hltb={hltb} locale={locale} size={size} slots={settings.infoSlots} proton={proton} />}
                {/* Clean hides these two cards and shows .gg-clean-info instead. Leaving them mounted kept them in
                    Steam's focus tree at 0×0, so Up from Play landed there. Unmount them in that look. */}
                {!cleanStyle && (
                    <CardsRow selectable={restyle} className={cardsRowClass(featured)}>
                        {/* A tap, a click or the controller's A opens what each card summarises (#24, cardActions), in the
                            restyled look (it lifts the cards over Steam's page panel; the plain look keeps 1.1.1's page). The
                            controller reaches them from the Play row (hooks/useCardNav), Left/Right between them. */}
                        <InfoCard game={game} hltb={hltb} locale={locale} description={description} size={size} slots={settings.infoSlots} proton={proton} onPress={restyle ? (card) => openGameInfoTab(card.ownerDocument) : undefined} />
                        {/* The featured stat's card (Game info setting): A opens what it shows (cardActions.featuredPress). */}
                        <FeaturedCard
                            featured={featured}
                            hltb={hltb}
                            playedMinutes={game.playedMinutes}
                            locale={locale}
                            restyle={restyle}
                            onPress={restyle ? featuredPress(featured, { appId: game.appId, isShortcut: game.isShortcut, hltb }) : undefined}
                            proton={proton}
                            achievements={knownAchievementFacts(game.appId, pageAchievementFacts(details, game.isShortcut))}
                            playTime={playFactsOf(game.appId, overview, { minutes: game.playedMinutes, lastPlayed: lastPlayedSeconds(overview, launcher?.lastPlayed ?? null) }, game.isShortcut)}
                            compat={steamCompatOf(overview, details, game.isShortcut)}
                            now={now}
                        />
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

/** The cards' row (classes from cardsRowClass): in the restyled look a Focusable row (Left/Right between the cards the controller can select). */
function CardsRow({ selectable, className, children }: { selectable: boolean; className: string; children: ReactNode }) {
    if (!selectable) return <div className={className}>{children}</div>;
    return (
        <Focusable className={className} flow-children="row">
            {children}
        </Focusable>
    );
}
