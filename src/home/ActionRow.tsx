import { Focusable, Menu, MenuItem, showContextMenu } from '@decky/ui';
import type { GamepadEvent, NavEntryPositionPreferences } from '@decky/ui';
import { ComponentType, CSSProperties, ReactNode, useRef, useState } from 'react';
import { UnifideckCloudGlyph } from '../components/UnifideckCloudGlyph';
import { IoCloudDoneOutline, IoCloudOfflineOutline, IoCloudOutline, IoCloudUploadOutline, IoDownload, IoGrid, IoGameControllerOutline, IoInformationCircleOutline, IoPause, IoPlay, IoSettingsOutline } from 'react-icons/io5';
import { FaDownload, FaPlay } from 'react-icons/fa';
import { LOG_PREFIX } from '../constants';
import { markLaunch } from '../data/launchIntent';
import type { CloudState } from './cloud';
import { opensGameMenu, PREFERRED_CHILD } from './focusZones';
import { openGameMenu } from './gameMenu';
import { pressCloud, steamCloudIcon } from './steamCloud';
import { steamCheckIcon, steamControllerIcon, steamGearIcon, steamStreamMenuClasses } from './steamIcons';
import { readSteamPill } from './steamPill';
import { StreamChoice, streamChoices, StreamOverview } from './streaming';
import { openGame, openLibrary, openPage } from './homeNav';
import type { DownloadState } from './downloadProgress';
import { playAction, runGameId } from './homeView';
import { playNavSound, skipSteamSound } from './navSound';
import type { HomeGame } from './useHomeData';
import { pillWord, tr } from '../i18n/steamText';

type AppsApi = {
    RunGame?(gameId: string, launchOptions: string, param: number, launchSource: number): void;
    ShowControllerConfigurator?(appId: number): void;
    OpenAppSettingsDialog?(appId: number, section: string): void;
};
const apps = (): AppsApi | undefined => (globalThis as { SteamClient?: { Apps?: AppsApi } }).SteamClient?.Apps;

/** ELaunchSource._2ftLibraryDetails, as launching from a game's page. */
const LAUNCH_SOURCE = 100;
/** A and a touch can both arrive for one press; one action per press. */
const REPEAT_GUARD_MS = 1000;
/** How long Steam's page-open sound is held back after Play: its handler opened the page 83 ms after the press on the Ally. */
const PLAY_PAGE_SOUND_MS = 1500;

/** The game's "Play from" choices (home/streaming), or null: one device only, or Steam's store unreadable. */
function readStreamChoices(appId: number): StreamChoice[] | null {
    try {
        const store = (globalThis as { appStore?: { GetAppOverviewByAppID?(id: number): StreamOverview | null | undefined } }).appStore;
        return streamChoices(store?.GetAppOverviewByAppID?.(appId));
    } catch {
        return null;
    }
}

/** Steam's arrow glyph for the "Play from" segment (the game page's, 36 x 36). */
function PlayFromGlyph() {
    return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
            <path d="M17.98 26.54L3.20996 11.77H32.75L17.98 26.54Z" />
        </svg>
    );
}

/**
 * Steam's "Play from" menu, as the game page's Play arrow opens it: this device, then each other one to stream from,
 * the selected one ticked; picking one sets the game's streaming client (Steam's Play then becomes Stream). `changed`:
 * once Steam has taken the choice (it updates the game asynchronously), so the pill reads Steam's new action.
 */
function openPlayFrom(appId: number, choices: StreamChoice[], anchor: HTMLElement | null, changed: () => void) {
    const set = (clientid: string) => {
        try {
            (globalThis as { SteamClient?: { Apps?: { SetStreamingClientForApp?(appId: number, clientid: string): void } } }).SteamClient?.Apps?.SetStreamingClientForApp?.(appId, clientid);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: choosing where to play failed`, error);
        }
        for (const ms of [250, 1000]) setTimeout(changed, ms);
    };
    // Steam's own item layout (a tick column, then the words) and tick, found by name; plain words if missing.
    const classes = steamStreamMenuClasses();
    const Check = steamCheckIcon();
    const Item = MenuItem as unknown as ComponentType<Record<string, unknown>>;
    showContextMenu(
        <Menu label={tr('playFrom')} cancelText={tr('cancel')}>
            {choices.map((c) => (
                <Item key={c.clientid} className={classes?.StreamingContextMenuItem} selected={c.selected} onSelected={() => set(c.clientid)}>
                    {classes ? (
                        <>
                            <span className={classes.CheckContainer}>{c.selected && (Check ? <Check /> : '✓')}</span>
                            <span className={classes.StreamingTargetLabel}>{c.label}</span>
                        </>
                    ) : `${c.selected ? '✓ ' : ''}${c.label}`}
                </Item>
            ))}
        </Menu>,
        anchor ?? undefined,
        { bOverlapHorizontal: true },
    );
}

/** Runs a Steam call; if it is missing or throws, opens the game's page instead (Steam's own controls live there). */
function steamOr(what: string, appId: number, call: (api: AppsApi) => boolean) {
    try {
        const api = apps();
        if (api && call(api)) return;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: ${what} failed`, error);
    }
    openPage(appId);
}

/** Steam's game context menu at `anchor`, as the game page's gear opens it (gameMenu); Properties if it is unavailable. */
export function openGameActions(appId: number, anchor: HTMLElement | null) {
    if (openGameMenu(appId, anchor)) return;
    steamOr('properties', appId, (api) => {
        if (!api.OpenAppSettingsDialog) return false;
        api.OpenAppSettingsDialog(appId, '');
        return true;
    });
}

/** The local client's id in Steam's download calls (per_client_data.clientid of this machine). */
const LOCAL_CLIENT = '0';

type DownloadsApi = { EnableAllDownloads?(enable: boolean, clientId: string): void; ResumeAppUpdate?(appId: number, clientId: string): void };

/**
 * A on the pill during a download, as Steam's own button does (probed in its client): pause = EnableAllDownloads(false),
 * resume = ResumeAppUpdate(appid). Focus stays on the pill. If the call is missing or throws, the game page opens.
 */
function toggleDownload(action: 'pause' | 'resume', appId: number) {
    try {
        const downloads = (globalThis as { SteamClient?: { Downloads?: DownloadsApi } }).SteamClient?.Downloads;
        if (action === 'pause' && downloads?.EnableAllDownloads) return void downloads.EnableAllDownloads(false, LOCAL_CLIENT);
        if (action === 'resume' && downloads?.ResumeAppUpdate) return void downloads.ResumeAppUpdate(appId, LOCAL_CLIENT);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: ${action} download failed`, error);
    }
    openPage(appId);
}

function ActionButton({ className, label, onPress, preferredFocus, fill, setRef, action, style, children }: {
    className: string;
    /** What the button is (play, controller, menu, info, cloud, library): the open transition finds the buttons by it. */
    action?: string;
    /** Receives the button element (the gear: the game menu's anchor for View/Select). */
    setRef?(el: HTMLElement | null): void;
    label: string;
    /** Inline custom properties (a Unifideck cloud button's ring colour: --gh-uni-ring). */
    style?: CSSProperties;
    /** 0..100: a fill layer inside the pill that far from the left (the Play pill while Steam downloads the game). */
    fill?: number | null;
    /** `el`: the button itself (null before it mounted). */
    onPress(el: HTMLElement | null): void;
    /** Takes focus when focus enters its row (and on Home's first focus when nothing else is focusable). */
    preferredFocus?: boolean;
    children: ReactNode;
}) {
    const last = useRef(0);
    const self = useRef<HTMLDivElement | null>(null);
    const press = () => {
        const now = Date.now();
        if (now - last.current < REPEAT_GUARD_MS) return;
        last.current = now;
        try {
            onPress(self.current);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: ${label} failed`, error);
        }
    };
    return (
        <Focusable
            ref={(el: HTMLDivElement | null) => {
                self.current = el;
                setRef?.(el);
            }}
            className={`gh-btn ${className}`}
            preferredFocus={preferredFocus}
            focusClassName="gh-focus"
            noFocusRing
            onActivate={press}
            onClick={press}
            role="button"
            aria-label={label}
            data-action={action}
            style={style}
        >
            {typeof fill === 'number' && <span className="gh-btn-fill" style={{ width: `${Math.min(100, Math.max(0, fill))}%` }} />}
            {children}
        </Focusable>
    );
}

/** Steam's own cloud icon in the state's variant (as the game page draws it); ours if Steam's is not found. */
export function CloudIcon({ cloud }: { cloud: CloudState }) {
    const Steam = steamCloudIcon();
    if (Steam) return <Steam {...cloud.icon} />;
    if (cloud.tone === 'off') return <IoCloudOfflineOutline />;
    if (cloud.icon.uploaded) return <IoCloudDoneOutline />;
    if (cloud.icon.save) return <IoCloudUploadOutline />;
    return <IoCloudOutline />;
}

/** Steam's own icon for a circle (as the game page draws it), ours if Steam's is not found. */
function SteamIcon({ steam, fallback }: { steam: ComponentType<Record<string, unknown>> | null; fallback: ReactNode }) {
    const Steam = steam;
    return Steam ? <span className="gh-btn-icon gh-steam-icon"><Steam /></span> : <span className="gh-btn-icon">{fallback}</span>;
}

/** The row's gamepad handlers: L1/R1 (bumper navigation, useBumperSelect), given by SpotlightHome. */
export interface RowButtons {
    onButtonDown?(evt: GamepadEvent): void;
    onButtonUp?(evt: GamepadEvent): void;
}

/** B on the action row: back to the game cards (focusZones.onBack('actions')); the event stops here. */
function backHandler(onBack: (() => void) | undefined) {
    if (!onBack) return undefined;
    return (evt: CustomEvent) => {
        try {
            evt?.stopPropagation?.();
            onBack();
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: back from the actions failed`, error);
        }
    };
}

/** Home's only action when there are no recents: the Library pill, which takes Home's focus then. */
export function LibraryActionRow({ preferred }: { preferred?: boolean }) {
    return (
        <Focusable className="gh-actions" flow-children="row">
            <ActionButton className="gh-btn-library" label={tr('library')} onPress={openLibrary} preferredFocus={preferred} action="library">
                <span className="gh-btn-icon"><IoGrid /></span>
                <span>{tr('library')}</span>
            </ActionButton>
        </Focusable>
    );
}

/**
 * The action row, where Home's focus rests (bumper navigation). With a game selected: the Play pill plus controller,
 * settings and info circles. With the Library card selected (`game` null): a single 280-wide "Open Library" pill. The
 * pill is the same element either way (the first child), so L1/R1 never drop its focus while the selection moves.
 * The cloud circle (last, only when the game page shows a cloud status) shows the selected game's Steam Cloud state
 * in Steam's own icon and, on a sync problem, A opens Steam's conflict or retry dialog, as the page's status does.
 * The gear (and View/Select or Menu anywhere on the row) opens Steam's game context menu for the selected game, as
 * the game page's gear does (gameMenu; Properties if Steam's menu is unavailable).
 * The info circle opens the game page with the open transition (homeNav.openGame: Home morphs into the page). The
 * Play pill's page fallbacks (Resume,
 * Install, missing Steam calls) open it directly. For the running game the pill reads Resume and opens its page
 * rather than launching it again. While Steam installs, updates or downloads the game the pill fills left to right
 * with the progress and reads the state and percent (downloadProgress).
 * `preferred`: the pill takes focus when focus enters the row (Home's first focus is the game cards). B goes back to
 * the game cards (`onBack`, focusZones.onBack('actions')).
 */
export function ActionRow({ game, running = false, download = null, preferred, buttons, cloud = null, onBack, unifideck = null }: {
    game: HomeGame | null;
    /** A Unifideck game (its own install state): the pill wears Unifideck's glyphs, as its button on the game page. */
    unifideck?: { installed: boolean } | null;
    /** The selected game's Steam Cloud state (useCloud); null hides the cloud button, as the game page hides its status. */
    cloud?: CloudState | null;
    running?: boolean;
    download?: DownloadState | null;
    status?: number | null;
    preferred?: boolean;
    buttons?: RowButtons;
    /** B: back to the game cards. */
    onBack?(): void;
}) {
    const gear = useRef<HTMLElement | null>(null);
    // Bumped once Steam has taken a "Play from" choice, so the pill reads Steam's new action (Stream / Play).
    const [, setStreamVersion] = useState(0);
    const row = { className: 'gh-actions', 'flow-children': 'row', navEntryPreferPosition: PREFERRED_CHILD as NavEntryPositionPreferences, onButtonDown: buttons?.onButtonDown, onButtonUp: buttons?.onButtonUp, onCancel: backHandler(onBack) };
    if (!game) {
        return (
            <Focusable {...row}>
                <ActionButton key="primary" className="gh-btn-library" label={tr('library')} onPress={openLibrary} preferredFocus={preferred} action="library">
                    <span className="gh-btn-icon"><IoGrid /></span>
                    <span>{tr('library')}</span>
                </ActionButton>
            </Focusable>
        );
    }
    const gameRow = {
        ...row,
        // View/Select and Menu open the game menu at the gear (focusZones.opensGameMenu); L1/R1 go on to the bumpers.
        onButtonDown: (evt: GamepadEvent) => {
            try {
                if (opensGameMenu(Number(evt?.detail?.button))) {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    if (!evt?.detail?.is_repeat) openMenu(gear.current);
                    return;
                }
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home: game menu button failed`, error);
            }
            buttons?.onButtonDown?.(evt);
        },
    };
    const play = playAction(game.installed, running, download);
    // Steam's own pill for the game (its action, word, glyph and handler), as on the game page; ours if that is unavailable.
    const steamPill = readSteamPill(game.appId);
    const playWord = pillWord(steamPill?.label ?? play.label);
    const fill = steamPill ? (download ? play.fill : null) : play.fill;
    const appId = game.appId;
    // A game on more than one device: the pill ends in Steam's "Play from" segment, and its arrow opens Steam's menu.
    const playFrom = readStreamChoices(appId);
    // Steam's game context menu, as the game page's gear opens it (gameMenu); Properties if it is unavailable.
    const openMenu = (anchor: HTMLElement | null) => openGameActions(appId, anchor);
    return (
        <Focusable {...gameRow}>
            <ActionButton
                key="primary"
                className={`gh-btn-play${fill === null ? '' : ' gh-btn-dl'}`}
                label={playWord}
                fill={fill}
                preferredFocus={preferred}
                action="play"
                onPress={(el) => {
                    if (steamPill) {
                        try {
                            // Steam's Play opens the game's page for its launch screen; the page then shows only the art.
                            if (steamPill.action === 'Play') {
                                markLaunch(appId);
                                playNavSound('LaunchGame'); // Steam's game-start sound, as on the game page
                                skipSteamSound('IntoGameDetail', PLAY_PAGE_SOUND_MS); // not also the page-open sound of Steam's handler
                            }
                            steamPill.run(el?.ownerDocument?.defaultView ?? window);
                            return;
                        } catch (error) {
                            console.warn(`${LOG_PREFIX} Home: Steam's ${steamPill.action} failed`, error);
                        }
                    }
                    if (play.toggle) return toggleDownload(play.toggle, appId);
                    if (!play.launch) return openPage(appId);
                    steamOr('launch', appId, (api) => {
                        if (!api.RunGame) return false;
                        markLaunch(appId);
                        playNavSound('LaunchGame'); // Steam's own sound for starting a game
                        skipSteamSound('IntoGameDetail', PLAY_PAGE_SOUND_MS);
                        api.RunGame(runGameId(appId, game.gameId), '', -1, LAUNCH_SOURCE);
                        return true;
                    });
                }}
            >
                <span className="gh-btn-icon">{unifideck && !download ? (unifideck.installed ? <FaPlay /> : <FaDownload />) : steamPill ? steamPill.icon : play.label === 'Pause' ? <IoPause /> : play.label === 'Download' || play.label === 'Update' ? <IoDownload /> : <IoPlay />}</span>
                <span className="gh-btn-label">{playWord}</span>
                {playFrom && <span className="gh-play-arrow"><PlayFromGlyph /></span>}
            </ActionButton>
            {playFrom && (
                <ActionButton
                    key="stream"
                    className="gh-btn-stream"
                    label={tr('playFrom')}
                    action="stream"
                    onPress={(el) => openPlayFrom(appId, playFrom, el, () => setStreamVersion((v) => v + 1))}
                >
                    <span />
                </ActionButton>
            )}
            <ActionButton
                className="gh-btn-circle"
                label={tr('controllerSettings')}
                action="controller"
                onPress={() => steamOr('controller settings', appId, (api) => {
                    if (!api.ShowControllerConfigurator) return false;
                    api.ShowControllerConfigurator(appId);
                    return true;
                })}
            >
                <SteamIcon steam={steamControllerIcon()} fallback={<IoGameControllerOutline />} />
            </ActionButton>
            <ActionButton className="gh-btn-circle" label={tr('manage')} action="menu" setRef={(el) => { gear.current = el; }} onPress={(el) => openMenu(el)}>
                <SteamIcon steam={steamGearIcon()} fallback={<IoSettingsOutline />} />
            </ActionButton>
            <ActionButton
                className="gh-btn-circle"
                label={tr('gameDetails')}
                action="info"
                onPress={(el) => openGame(appId, el)}
            >
                <span className="gh-btn-icon"><IoInformationCircleOutline /></span>
            </ActionButton>
            {cloud && (
                <ActionButton
                    key="cloud"
                    className={`gh-btn-circle gh-btn-cloud gh-cloud-${cloud.tone}${cloud.unifideck ? ` gh-cloud-uni${cloud.unifideck.dim ? ' gh-cloud-uni-dim' : ''}${cloud.unifideck.breathe ? ' unifideck-breathe' : ''}` : ''}`}
                    style={cloud.unifideck?.ring ? ({ '--gh-uni-ring': cloud.unifideck.ring } as CSSProperties) : undefined}
                    label={cloud.label}
                    action="cloud"
                    onPress={(el) => pressCloud(cloud, appId, el?.ownerDocument?.defaultView ?? window)}
                >
                    <span className="gh-btn-icon">{cloud.unifideck ? <UnifideckCloudGlyph look={cloud.unifideck} /> : <CloudIcon cloud={cloud} />}</span>
                </ActionButton>
            )}
        </Focusable>
    );
}
