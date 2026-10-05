import { Focusable } from '@decky/ui';
import type { GamepadEvent, NavEntryPositionPreferences } from '@decky/ui';
import { ReactNode, useRef } from 'react';
import { IoCloudDoneOutline, IoCloudOfflineOutline, IoCloudOutline, IoCloudUploadOutline, IoDownload, IoGrid, IoGameControllerOutline, IoInformationCircleOutline, IoPause, IoPlay, IoSettingsOutline } from 'react-icons/io5';
import { LOG_PREFIX } from '../constants';
import type { CloudState } from './cloud';
import { opensGameMenu, PREFERRED_CHILD } from './focusZones';
import { openGameMenu } from './gameMenu';
import { pressCloud, steamCloudIcon } from './steamCloud';
import { readSteamPill } from './steamPill';
import { gameOpenArt, openGame, openLibrary, openPage } from './homeNav';
import type { DownloadState } from './downloadProgress';
import { playAction, runGameId } from './homeView';
import type { HomeGame } from './useHomeData';

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

/** The expanded recents capsule (the selected game's card), the info button's transition source. */
function focusedCapsule(from: HTMLElement | null): HTMLElement | null {
    try {
        return (from?.closest('.gh-root')?.querySelector('.gh-cap-wide') as HTMLElement | null) ?? null;
    } catch {
        return null;
    }
}

function ActionButton({ className, label, onPress, preferredFocus, fill, setRef, children }: {
    className: string;
    /** Receives the button element (the gear: the game menu's anchor for View/Select). */
    setRef?(el: HTMLElement | null): void;
    label: string;
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
        >
            {typeof fill === 'number' && <span className="gh-btn-fill" style={{ width: `${Math.min(100, Math.max(0, fill))}%` }} />}
            {children}
        </Focusable>
    );
}

/** Steam's own cloud icon in the state's variant (as the game page draws it); ours if Steam's is not found. */
function CloudIcon({ cloud }: { cloud: CloudState }) {
    const Steam = steamCloudIcon();
    if (Steam) return <Steam {...cloud.icon} />;
    if (cloud.tone === 'off') return <IoCloudOfflineOutline />;
    if (cloud.icon.uploaded) return <IoCloudDoneOutline />;
    if (cloud.icon.save) return <IoCloudUploadOutline />;
    return <IoCloudOutline />;
}

/** The row's gamepad handlers: L1/R1 (bumper navigation, useBumperSelect), given by SpotlightHome. */
export interface RowButtons {
    onButtonDown?(evt: GamepadEvent): void;
    onButtonUp?(evt: GamepadEvent): void;
}

/** Home's only action when there are no recents: the Library pill, which takes Home's focus then. */
export function LibraryActionRow({ preferred }: { preferred?: boolean }) {
    return (
        <Focusable className="gh-actions" flow-children="row">
            <ActionButton className="gh-btn-library" label="Open Library" onPress={openLibrary} preferredFocus={preferred}>
                <span className="gh-btn-icon"><IoGrid /></span>
                <span>Open Library</span>
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
 * The info circle opens the game page with the open transition, expanding from the selected capsule (the handoff's
 * clone of the focused card; the button itself if that is not found). The Play pill's page fallbacks (Resume,
 * Install, missing Steam calls) open it directly. For the running game the pill reads Resume and opens its page
 * rather than launching it again. While Steam installs, updates or downloads the game the pill fills left to right
 * with the progress and reads the state and percent (downloadProgress).
 * `preferred`: the pill takes focus when focus enters the row and on Home's first focus. B is not handled here, so
 * it reaches Steam's own handling exactly as on stock Home (focusZones.onBack('actions') === 'stock').
 */
export function ActionRow({ game, running = false, download = null, preferred, buttons, cloud = null }: {
    game: HomeGame | null;
    /** The selected game's Steam Cloud state (useCloud); null hides the cloud button, as the game page hides its status. */
    cloud?: CloudState | null;
    running?: boolean;
    download?: DownloadState | null;
    status?: number | null;
    preferred?: boolean;
    buttons?: RowButtons;
}) {
    const gear = useRef<HTMLElement | null>(null);
    const row = { className: 'gh-actions', 'flow-children': 'row', navEntryPreferPosition: PREFERRED_CHILD as NavEntryPositionPreferences, onButtonDown: buttons?.onButtonDown, onButtonUp: buttons?.onButtonUp };
    if (!game) {
        return (
            <Focusable {...row}>
                <ActionButton key="primary" className="gh-btn-library" label="Open Library" onPress={openLibrary} preferredFocus={preferred}>
                    <span className="gh-btn-icon"><IoGrid /></span>
                    <span>Open Library</span>
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
    const fill = steamPill ? (download ? play.fill : null) : play.fill;
    const appId = game.appId;
    // Steam's game context menu, as the game page's gear opens it (gameMenu); Properties if it is unavailable.
    function openMenu(anchor: HTMLElement | null) {
        if (openGameMenu(appId, anchor)) return;
        steamOr('properties', appId, (api) => {
            if (!api.OpenAppSettingsDialog) return false;
            api.OpenAppSettingsDialog(appId, '');
            return true;
        });
    }
    return (
        <Focusable {...gameRow}>
            <ActionButton
                key="primary"
                className={`gh-btn-play${fill === null ? '' : ' gh-btn-dl'}`}
                label={steamPill?.label ?? play.label}
                fill={fill}
                preferredFocus={preferred}
                onPress={(el) => {
                    if (steamPill) {
                        try {
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
                        api.RunGame(runGameId(appId, game.gameId), '', -1, LAUNCH_SOURCE);
                        return true;
                    });
                }}
            >
                <span className="gh-btn-icon">{steamPill ? steamPill.icon : play.label === 'Pause' ? <IoPause /> : play.label === 'Download' || play.label === 'Update' ? <IoDownload /> : <IoPlay />}</span>
                <span className="gh-btn-label">{steamPill?.label ?? play.label}</span>
            </ActionButton>
            <ActionButton
                className="gh-btn-circle"
                label="Controller settings"
                onPress={() => steamOr('controller settings', appId, (api) => {
                    if (!api.ShowControllerConfigurator) return false;
                    api.ShowControllerConfigurator(appId);
                    return true;
                })}
            >
                <span className="gh-btn-icon"><IoGameControllerOutline /></span>
            </ActionButton>
            <ActionButton className="gh-btn-circle" label="Manage" setRef={(el) => { gear.current = el; }} onPress={(el) => openMenu(el)}>
                <span className="gh-btn-icon"><IoSettingsOutline /></span>
            </ActionButton>
            <ActionButton
                className="gh-btn-circle"
                label="Game details"
                onPress={(el) => openGame(appId, focusedCapsule(el) ?? el, gameOpenArt(appId))}
            >
                <span className="gh-btn-icon"><IoInformationCircleOutline /></span>
            </ActionButton>
            {cloud && (
                <ActionButton
                    key="cloud"
                    className={`gh-btn-circle gh-btn-cloud gh-cloud-${cloud.tone}`}
                    label={cloud.label}
                    onPress={(el) => pressCloud(cloud, appId, el?.ownerDocument?.defaultView ?? window)}
                >
                    <span className="gh-btn-icon"><CloudIcon cloud={cloud} /></span>
                </ActionButton>
            )}
        </Focusable>
    );
}
