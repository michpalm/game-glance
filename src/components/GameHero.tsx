import { useEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { cache } from '../data/cache';
import { setCurrentGame } from '../data/currentGame';
import { lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { getShortcutDescription } from '../data/shortcutDescription';
import { getSourceLabel } from '../data/source';
import { mergePlaytime } from '../data/unifideckPlaytime';
import { getDescription, getSteamLanguage, peekSteamLanguage, readGameInfo } from '../data/steam';
import { accentFor } from '../home/accent';
import { sampleAccent } from '../home/accentSample';
import { homeMode } from '../home/mode';
import { formatLastPlayed } from '../home/recents';
import { useAsync } from '../hooks/useAsync';
import { useUnifideckPlaytime } from '../hooks/useUnifideckPlaytime';
import { useUnifideckGamepadFocus } from '../hooks/useUnifideckGamepadFocus';
import { useUnifideckInstalled } from '../hooks/useUnifideckInstalled';
import { useUnifideckSizeLabel } from '../hooks/useUnifideckSizeLabel';
import { useUnifideckSize } from '../hooks/useUnifideckSize';
import { useOverrideVersion } from '../hooks/useOverrideVersion';
import { steamLanguageToLocale } from '../logic/format';
import { heroicStoreLabel } from '../logic/heroic';
import { sizeStat } from '../logic/sizeStat';
import { useDownload } from '../home/useDownload';
import { useLaunchOverlay } from '../styles/launchOverlay';
import { accentCss, cleanCss, downloadCss, launchCss, launchSelectors, themeCss, unifideckCss } from '../styles/theme';
import { CleanInfo } from './CleanInfo';
import { ErrorBoundary } from './ErrorBoundary';
import { GameStatusBar } from './GameStatusBar';
import { UnifideckRowNav } from './UnifideckRowNav';
import { HltbCard } from './HltbCard';
import { InfoCard } from './InfoCard';
import { FamilyPill, SourcePill } from './SourcePill';
import { familyPillLabel } from '../data/family';
import { GameTitle } from './GameTitle';

/** A canvas length in the restyled page's scale unit (themeCss: --gg-d). */
const pageUnit = (n: number) => `calc(${n} * var(--gg-d))`;
import { tr } from '../i18n/steamText';

interface Props {
    overview: unknown;
    details: unknown;
}

/** Accents resolved this session, so a page opened again starts on its game's colour instead of the default. */
const accentMemo = new Map<number, string>();

/** The game's accent (same source and cache as Spotlight Home), only while restyled; undefined until known. */
function useGameAccent(appId: number, active: boolean): string | undefined {
    const loaded = useAsync(active && appId !== 0 ? `accent:${appId}` : null, async () => {
        const color = await accentFor(appId, { cache, sample: sampleAccent });
        accentMemo.set(appId, color);
        return color;
    });
    return active ? (loaded ?? accentMemo.get(appId)) : undefined;
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
    const steamGame = readGameInfo(overview, details);
    // A Unifideck game: its own play time and last played, as on Unifideck's Play row (Steam has none for these).
    const unifideck = useUnifideckPlaytime(steamGame.appId, steamGame.isShortcut);
    const game = unifideck ? { ...steamGame, playedMinutes: mergePlaytime({ minutes: steamGame.playedMinutes, lastPlayed: 0 }, unifideck).minutes } : steamGame;
    const overrideVersion = useOverrideVersion();
    const knownLang = peekSteamLanguage();
    const loadedLang = useAsync(knownLang ? null : 'lang', getSteamLanguage);
    const lang = knownLang ?? loadedLang;
    const locale = steamLanguageToLocale(lang ?? 'english');
    const source = useAsync(`src:${game.appId}`, () =>
        getSourceLabel(game.appId, game.isShortcut, undefined, heroicStoreLabel(game.heroic)),
    );
    // Wait for the language so the description is fetched once, in the right language.
    const description = useAsync(lang === undefined ? null : `desc:${game.appId}:${lang}`, () =>
        game.isShortcut ? getShortcutDescription(game, lang ?? 'english') : getDescription(game.appId, lang ?? 'english'),
    );
    const hltb = useAsync(`hltb:${game.appId}:${overrideVersion}`, () =>
        lookupHltb({ appId: game.appId, name: game.name, isShortcut: game.isShortcut }),
    );

    const { homeStatusBar: statusBar, gameLogo } = useSettings();
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
    // B and the D-pad go to Steam's gamepad focus, which can land on a hidden tab of Steam's own page on a Unifideck page (logic/gamepadFocus).
    useUnifideckGamepadFocus(pageDoc, game.isShortcut);
    const nativeSizeLabel = useUnifideckSizeLabel(pageDoc, game.appId, uniInstalled, restyle && game.isShortcut);
    const size = restyle && typeof uniInstalled === 'boolean' ? sizeStat(unifideckSize, uniInstalled, locale, nativeSizeLabel) : null;
    const fillCss = restyle ? downloadCss(download?.percent ?? null) : '';
    // While Steam's launch overlay is up, the page's text fades away so the overlay sits on the game's art alone; after
    // Play on Home (data/launchIntent) the page starts that way, so it never shows before the launch screen.
    const { overlay, hide } = launchSelectors();
    const launching = useLaunchOverlay(heroRef, overlay, hide, game.appId);

    useEffect(() => {
        setCurrentGame(game, hltb);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.appId, hltb]);

    if (game.appId === 0) return null;
    // The Clean look, only where its layout applies (Steam's classes found); otherwise the page keeps its cards.
    const cleanStyle = clean ? cleanCss() : '';
    const family = restyle ? familyPillLabel(game.appId) : null;
    const eyebrow = restyle ? lastPlayedEyebrow(overview, locale, unifideck?.lastPlayed ?? null) : null;
    return (
        <>
            {/* Spotlight Home's status bar, over Steam's top strip, with the restyled page (not while Steam's launch screen is up). */}
            {restyle && statusBar && !launching && <GameStatusBar />}
            {/* A Unifideck game's circle buttons are reordered by CSS; the D-pad then steps by position. */}
            {game.isShortcut && <UnifideckRowNav />}
            {/* Spotlight Home's eyebrow and title; the theme shows them only with its full-screen layout, where Steam's logo was (hidden then). */}
            {restyle && game.name !== '' && (
                <div className="gg-titleblock">
                    {eyebrow && <div className="gg-eyebrow">{eyebrow}</div>}
                    <GameTitle appId={game.appId} name={game.name} logo={gameLogo} className="gg-title" logoClassName="gg-logo" unit={pageUnit} />
                </div>
            )}
            <div className="gg-hero" ref={heroRef}>
                <style>{themeCss({ restyle })}</style>
                <style>{unifideckCss({ restyle })}</style>
                {cleanStyle && <style>{cleanStyle}</style>}
                {launching && <style>{launchCss()}</style>}
                {accent && <style>{accentCss(accent)}</style>}
                {fillCss && <style>{fillCss}</style>}
                {source && (
                    <SourcePill label={source}>
                        {/* A game from the family library (Steam's line under Play is hidden): with the restyled look only. */}
                        {restyle && family && <FamilyPill label={family} />}
                    </SourcePill>
                )}
                {cleanStyle && <CleanInfo game={game} hltb={hltb} locale={locale} size={size} />}
                <div className="gg-cards">
                    <InfoCard game={game} locale={locale} description={description} size={size} />
                    <HltbCard result={hltb} playedMinutes={game.playedMinutes} locale={locale} restyle={restyle} />
                </div>
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
