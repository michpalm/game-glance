import { useEffect, useMemo, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { cache } from '../data/cache';
import { setCurrentGame } from '../data/currentGame';
import { lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { getShortcutDescription } from '../data/shortcutDescription';
import { getSourceLabel } from '../data/source';
import { getDescription, getSteamLanguage, peekSteamLanguage, readGameInfo } from '../data/steam';
import { accentFor } from '../home/accent';
import { sampleAccent } from '../home/accentSample';
import { getGameLogoUrls } from '../home/artwork';
import { homeMode } from '../home/mode';
import { formatLastPlayed } from '../home/recents';
import { useAsync } from '../hooks/useAsync';
import { useOverrideVersion } from '../hooks/useOverrideVersion';
import { steamLanguageToLocale } from '../logic/format';
import { heroicStoreLabel } from '../logic/heroic';
import { useDownload } from '../home/useDownload';
import { useLaunchOverlay } from '../styles/launchOverlay';
import { accentCss, cleanCss, downloadCss, launchCss, launchSelectors, themeCss, unifideckCss } from '../styles/theme';
import { CleanInfo } from './CleanInfo';
import { ErrorBoundary } from './ErrorBoundary';
import { HltbCard } from './HltbCard';
import { InfoCard } from './InfoCard';
import { SourcePill } from './SourcePill';

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
function lastPlayedEyebrow(overview: unknown, locale: string): string | null {
    try {
        const seconds = Number((overview as { rt_last_time_played?: unknown } | null)?.rt_last_time_played ?? 0);
        if (!Number.isFinite(seconds) || seconds <= 0) return null;
        return `Last played · ${formatLastPlayed(seconds, Math.floor(Date.now() / 1000), locale)}`;
    } catch (error) {
        console.warn(`${LOG_PREFIX} could not read last played`, error);
        return null;
    }
}

function GameTitleBlock({
    eyebrow,
    title,
    logoUrls,
    preferLogos,
}: {
    eyebrow: string | null;
    title: string;
    logoUrls: string[];
    preferLogos: boolean;
}) {
    const urls = useMemo(() => (preferLogos ? logoUrls.filter(Boolean) : []), [preferLogos, logoUrls]);
    const [logoIdx, setLogoIdx] = useState(0);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [allFailed, setAllFailed] = useState(false);
    const [showFallbackText, setShowFallbackText] = useState(urls.length === 0);

    useEffect(() => {
        setLogoIdx(0);
        setLogoLoaded(false);
        setAllFailed(false);
        if (urls.length === 0) {
            setShowFallbackText(true);
            return;
        }
        setShowFallbackText(false);
        const timer = setTimeout(() => {
            setShowFallbackText(true);
        }, 350);
        return () => clearTimeout(timer);
    }, [title, urls]);

    const handleError = () => {
        if (logoIdx + 1 < urls.length) {
            setLogoIdx((i) => i + 1);
            setLogoLoaded(false);
        } else {
            setAllFailed(true);
            setShowFallbackText(true);
        }
    };

    const handleLoad = () => {
        setLogoLoaded(true);
        setShowFallbackText(false);
    };

    const shouldTryLogo = urls.length > 0 && !allFailed;
    const shouldShowFallback = !logoLoaded && (urls.length === 0 || allFailed || showFallbackText);

    return (
        <div className="gg-titleblock">
            {eyebrow && <div className="gg-eyebrow">{eyebrow}</div>}
            <div className="gg-titleslot">
                {shouldTryLogo && (
                    <img
                        key={urls[logoIdx]}
                        src={urls[logoIdx]}
                        alt={title}
                        className="gg-logo"
                        onLoad={handleLoad}
                        onError={handleError}
                        style={logoLoaded ? undefined : { position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                    />
                )}
                {shouldShowFallback && <div className="gg-title">{title}</div>}
            </div>
        </div>
    );
}

function Hero({ overview, details, restyle, clean, preferLogos }: Props & { restyle: boolean; clean: boolean; preferLogos: boolean }) {
    const game = readGameInfo(overview, details);
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

    const logoUrls = useMemo(() => {
        if (!preferLogos || !restyle || game.appId === 0) return [];
        return getGameLogoUrls(game.appId, overview, details);
    }, [game.appId, preferLogos, restyle, overview, details]);

    const accent = useGameAccent(game.appId, restyle);
    // Restyled only: the Play pill fills with Steam's download progress (hooks run either way; the CSS only when restyled).
    const { download } = useDownload(restyle && game.appId !== 0 ? game.appId : null);
    const fillCss = restyle ? downloadCss(download?.percent ?? null) : '';
    // While Steam's launch overlay is up, the page's text fades away so the overlay sits on the game's art alone; after
    // Play on Home (data/launchIntent) the page starts that way, so it never shows before the launch screen.
    const heroRef = useRef<HTMLDivElement>(null);
    const { overlay, hide } = launchSelectors();
    const launching = useLaunchOverlay(heroRef, overlay, hide, game.appId);

    useEffect(() => {
        setCurrentGame(game, hltb);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.appId, hltb]);

    if (game.appId === 0) return null;
    // The Clean look, only where its layout applies (Steam's classes found); otherwise the page keeps its cards.
    const cleanStyle = clean ? cleanCss() : '';
    const eyebrow = restyle ? lastPlayedEyebrow(overview, locale) : null;
    return (
        <>
            {/* Spotlight Home's eyebrow and title; the theme shows them only with its full-screen layout, where Steam's logo was (hidden then). */}
            {restyle && game.name !== '' && (
                <GameTitleBlock
                    eyebrow={eyebrow}
                    title={game.name}
                    logoUrls={logoUrls}
                    preferLogos={preferLogos}
                />
            )}
            <div className="gg-hero" ref={heroRef}>
                <style>{themeCss({ restyle })}</style>
                <style>{unifideckCss({ restyle })}</style>
                {cleanStyle && <style>{cleanStyle}</style>}
                {launching && <style>{launchCss()}</style>}
                {accent && <style>{accentCss(accent)}</style>}
                {fillCss && <style>{fillCss}</style>}
                {source && <SourcePill label={source} />}
                {cleanStyle && <CleanInfo game={game} hltb={hltb} locale={locale} />}
                <div className="gg-cards">
                    <InfoCard game={game} locale={locale} description={description} />
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
            <Hero {...props} restyle={restyleDetails} clean={cleanDetails} preferLogos={settings.preferLogos} />
        </ErrorBoundary>
    );
}
