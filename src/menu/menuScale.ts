import { Router } from '@decky/ui';
import { sizeFactor } from '../home/scale';

type WindowSize = { innerWidth: number; innerHeight: number };

/** The menu's transform scale: normalized against the approved 829 px handheld viewport, times its size (menuSize). */
export const menuScale = (viewportWidth: number, size = 1): number => viewportWidth * 0.65 / 829 * size;

const usable = (w: WindowSize | null | undefined): w is WindowSize =>
    !!w && Number.isFinite(w.innerWidth) && Number.isFinite(w.innerHeight) && w.innerWidth > 0 && w.innerHeight > 0;

/**
 * How much smaller the menu is drawn: Home's size factor (home/scale sizeFactor) for Big Picture's own window, which
 * keeps Steam's TV or handheld layout while a game runs (the menu's window is resized in-game); the menu's own window
 * when Big Picture is unknown. Pure.
 */
export function menuSize(view: WindowSize, main: WindowSize | null | undefined): number {
    const w = usable(main) ? main : view;
    return sizeFactor(w.innerWidth, w.innerHeight);
}

/** menuSize with Steam's main window (Router.WindowStore, read only); the menu's own window if reading it fails. */
export function menuWindowSize(view: WindowSize): number {
    let main: WindowSize | undefined;
    try { main = (Router as unknown as { WindowStore?: { GamepadUIMainWindowInstance?: { BrowserWindow?: WindowSize } } })?.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow; }
    catch { main = undefined; }
    return menuSize(view, main);
}
