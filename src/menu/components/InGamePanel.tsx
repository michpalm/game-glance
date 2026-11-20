import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import { useEffect, useState } from 'react';
import { LuArrowUpRight, LuBookOpen, LuCamera, LuGamepad2, LuLogOut, LuPlay, LuTrophy } from 'react-icons/lu';
import { heroArtFor, resolveArt, type Art } from '../../home/HeroBackground';
import { knownLogo } from '../../home/logo';
import { logoList, resolveLogo } from '../../home/logoArt';
import { browserInGameStores, formatSession, readInGame, type InGameStats } from '../inGame';
import type { GameContext } from '../model';
import { setsLine, setsSummary, type SetsSummary } from '../achievementSets';
import { achievementSets } from '../steam/achievementSets';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';

const EXIT_CONFIRM_MS = 4000;
interface InGameContentsProps {
    game: GameContext;
    stats: InGameStats;
    /** The game's Achievement Sets (Steam's own queries); null: no sets, or not known (yet): the single bar. */
    sets?: SetsSummary | null;
    /** The resolved hero url; null: none (yet). */
    hero: string | null;
    /** The resolved logo url; null: the game has none (show its name); undefined: still resolving. */
    logo: string | null | undefined;
    exitArmed: boolean;
    /** Game Glance's Achievements page (Steam games); without it the tile opens Steam's. */
    openAchievements?(): void;
    armExit(): void;
    handoff(request: NativeRequest): void;
}

/** Stateless presentation: the game's art and this session, then its destinations as glass tiles. */
export function InGameContents({ game, stats, sets = null, hero, logo, exitArmed, armExit, handoff, openAchievements }: InGameContentsProps) {
    const open = (actionId: string) => () => handoff({ kind: 'game-action', appId: game.appId, gameId: game.gameId, actionId });
    const progress = stats.achievements && Math.round(stats.achievements.unlocked / stats.achievements.total * 100);
    return <div className="gg-ingame">
        {/* The game's art is the way back into it (mock-up B): first, where focus lands, so Steam then A resumes. */}
        <MenuAction id="in-game:resume" className="gg-ingame-hero" ariaLabel="Resume game" onAction={open('resume')}>
            {hero && <img className="gg-ingame-art" src={hero} alt="" decoding="sync" />}
            {logo ? <img className="gg-ingame-logo" src={logo} alt={game.name} decoding="sync" /> : logo === null ? <h2>{game.name || 'Running game'}</h2> : <span className="gg-ingame-logo-slot" />}
            <span className="gg-ingame-cue">
                <span className="gg-ingame-cue-text"><span className="gg-ingame-resume-word">Resume</span>{stats.sessionMinutes !== null && <span className="gg-ingame-session">{formatSession(stats.sessionMinutes)}</span>}</span>
                <span className="gg-ingame-play"><LuPlay aria-hidden="true" /></span>
            </span>
        </MenuAction>
        <Focusable className="gg-menu-grid gg-ingame-grid" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
            <MenuAction id="in-game:achievements" onAction={openAchievements && game.kind !== 'non-steam' ? openAchievements : open('achievements')}><LuTrophy aria-hidden="true" /><span className="gg-ingame-label"><strong>Achievements</strong>
                {sets ? <><small>{setsLine(sets)}</small><span className="gg-ingame-sets" aria-hidden="true">
                    {/* One bar per set, as wide as the set: the base game blue, other sets gold; one the player cannot earn is a faint track. */}
                    {sets.bars.map(bar => <span key={bar.id} className="gg-ingame-set" style={{ flexGrow: bar.size }} data-base={bar.base ? '' : undefined} data-locked={bar.earnable || bar.complete ? undefined : ''}>
                        <i style={{ width: `${bar.size > 0 ? Math.round(bar.unlocked / bar.size * 100) : 0}%` }} /></span>)}
                </span></>
                : stats.achievements && <><small>{`${stats.achievements.unlocked} of ${stats.achievements.total}`}</small><span className="gg-ingame-bar"><i className="gg-ingame-progress" style={{ width: `${progress}%` }} /></span></>}</span></MenuAction>
            <MenuAction id="in-game:recordings" onAction={open('recordings')}><LuCamera aria-hidden="true" /><span className="gg-ingame-label"><strong>Screenshots</strong><small>Screenshots and recordings</small></span></MenuAction>
            <MenuAction id="in-game:guides" onAction={open('guides')}><LuBookOpen aria-hidden="true" /><span className="gg-ingame-label"><strong>Guides</strong><small>Community guides</small></span></MenuAction>
            <MenuAction id="in-game:controller" onAction={open('controller')}><LuGamepad2 aria-hidden="true" /><span className="gg-ingame-label"><strong>Controller</strong><small>Layout for this game</small></span></MenuAction>
            <MenuAction id="in-game:game-page" onAction={open('game-page')}><LuArrowUpRight aria-hidden="true" /><span className="gg-ingame-label"><strong>Open in Steam</strong><small>Game page</small></span></MenuAction>
            <MenuAction id="in-game:exit" onAction={exitArmed ? open('exit') : armExit}><LuLogOut aria-hidden="true" /><span className="gg-ingame-label"><strong>Exit game</strong><small>{exitArmed ? 'Press again to exit' : 'Asks first'}</small></span></MenuAction>
        </Focusable>
    </div>;
}

const summaryOf = (data: ReturnType<typeof achievementSets.read>) => data ? setsSummary(data.schema, data.user) : null;
const artUrl = (art: Art | null) => art && art.mode !== 'none' ? art.url : null;
const logoNow = (appId: number) => { const choice = knownLogo(appId, logoList(appId).key); return choice === undefined ? undefined : choice ? choice.src ?? choice.url : null; };

/** Art comes from Home's resolvers: remembered once per game for the session, so revisiting the page never reloads it. */
export function InGamePanel({ game, handoff, openAchievements }: { game: GameContext; handoff(request: NativeRequest): void; openAchievements?(): void }) {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    const [art, setArt] = useState<{ appId: number; url: string | null } | null>(() => { const known = heroArtFor(game.appId); return known ? { appId: game.appId, url: artUrl(known) } : null; });
    const [logo, setLogo] = useState<{ appId: number; url: string | null | undefined }>(() => ({ appId: game.appId, url: logoNow(game.appId) }));
    const [exitArmed, setExitArmed] = useState(false);
    // Steam's set data: what its cache holds now, else Steam's own requests for it (about a second); null keeps the single bar.
    const [sets, setSets] = useState<{ appId: number; summary: SetsSummary | null }>(() => ({ appId: game.appId, summary: summaryOf(achievementSets.read(game.appId)) }));
    useEffect(() => {
        let alive = true;
        const appId = game.appId;
        const known = achievementSets.read(appId);
        setSets({ appId, summary: summaryOf(known) });
        if (!known) void achievementSets.load(appId).then(data => { if (alive && data) setSets({ appId, summary: summaryOf(data) }); });
        return () => { alive = false; };
    }, [game.appId]);
    useEffect(() => {
        const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        let alive = true;
        const appId = game.appId;
        setExitArmed(false);
        if (art?.appId !== appId) { const known = heroArtFor(appId); setArt(known ? { appId, url: artUrl(known) } : null); if (!known) void resolveArt(appId).then(a => { if (alive) setArt({ appId, url: artUrl(a) }); }); }
        if (logo.appId !== appId || logo.url === undefined) {
            const known = logoNow(appId);
            setLogo({ appId, url: known });
            if (known === undefined) void resolveLogo(appId).then(choice => { if (alive) setLogo({ appId, url: choice ? choice.src ?? choice.url : null }); });
        }
        return () => { alive = false; };
    }, [game.appId]);
    useEffect(() => {
        if (!exitArmed) return;
        const timer = setTimeout(() => setExitArmed(false), EXIT_CONFIRM_MS);
        return () => clearTimeout(timer);
    }, [exitArmed]);
    return <InGameContents game={game} stats={readInGame(game.appId, browserInGameStores, now)}
        hero={art?.appId === game.appId ? art.url : null} logo={logo.appId === game.appId ? logo.url : undefined}
        sets={sets.appId === game.appId ? sets.summary : null}
        openAchievements={openAchievements}
        exitArmed={exitArmed} armExit={() => setExitArmed(true)} handoff={handoff} />;
}
