import { useEffect } from 'react';
import { setCurrentGame } from '../data/currentGame';
import { lookupHltb } from '../data/hltb';
import { useSettings } from '../data/settings';
import { getShortcutDescription } from '../data/shortcutDescription';
import { getSourceLabel } from '../data/source';
import { getDescription, getSteamLanguage, peekSteamLanguage, readGameInfo } from '../data/steam';
import { useAsync } from '../hooks/useAsync';
import { useOverrideVersion } from '../hooks/useOverrideVersion';
import { steamLanguageToLocale } from '../logic/format';
import { heroicStoreLabel } from '../logic/heroic';
import { themeCss } from '../styles/theme';
import { ErrorBoundary } from './ErrorBoundary';
import { HltbCard } from './HltbCard';
import { InfoCard } from './InfoCard';
import { SourcePill } from './SourcePill';

interface Props {
    overview: unknown;
    details: unknown;
}

function Hero({ overview, details }: Props) {
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

    useEffect(() => {
        setCurrentGame(game, hltb);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.appId, hltb]);

    if (game.appId === 0) return null;
    return (
        <div className="gg-hero">
            <style>{themeCss()}</style>
            {source && <SourcePill label={source} />}
            <div className="gg-cards">
                <InfoCard game={game} locale={locale} description={description} />
                <HltbCard result={hltb} playedMinutes={game.playedMinutes} locale={locale} />
            </div>
            <div className="gg-more" aria-hidden="true">⌄</div>
        </div>
    );
}

export function GameHero(props: Props) {
    const { enabled } = useSettings();
    if (!enabled) return null;
    return (
        <ErrorBoundary>
            <Hero {...props} />
        </ErrorBoundary>
    );
}
