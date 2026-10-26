import * as ReactDOM from 'react-dom';
import { findModule, findModuleExport } from '@decky/ui';
import { Component, cloneElement, isValidElement, useLayoutEffect, useSyncExternalStore, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { Stop } from './model';
import { prepareMenuPresentation } from './presentation';
import { installTokenCss } from '../styles/tokens';
import { ownMethod } from './steam/patchOwnership';
import { registerMenuHost, type HostAttachment, type MenuHostFactory, type NativeOwner } from './steam/runtime';

/** The popup owns the only visible status bar; preserve page layout and restore its copy on release. */
export function hideBackgroundStatus(document: Document): Stop {
    const style = document.createElement('style');
    style.dataset.ggMenuPageStatus = 'true';
    style.textContent = '.gg-status-host:not(.gg-menu-status-host){visibility:hidden!important;opacity:0!important;transition:none!important}';
    document.head.appendChild(style);
    let stopped = false;
    return () => { if (!stopped) { stopped = true; style.remove(); } };
}

/** Borrow native visibility holds; never overwrite another view's hide counters. */
export function hideNativeMenuChrome(owner: Pick<NativeOwner, 'HeaderStore' | 'FooterStore'>): Stop {
    const header = owner.HeaderStore;
    let heldHeader = false;
    let footer: { unhide(): void } | undefined;
    try {
        if (typeof header?.IncrementHideHeader === 'function' && typeof header.DecrementHideHeader === 'function') {
            header.IncrementHideHeader(); heldHeader = true;
        }
        if (typeof owner.FooterStore?.HideFooter === 'function') footer = owner.FooterStore.HideFooter();
    } catch (error) {
        if (heldHeader) header!.DecrementHideHeader();
        throw error;
    }
    let stopped = false;
    return () => {
        if (stopped) return;
        stopped = true;
        try { footer?.unhide(); }
        finally { if (heldHeader) header!.DecrementHideHeader(); }
    };
}

export interface HostSnapshot { active: boolean; node: ReactNode; closing?: boolean }
interface HostSurface { verifyPresentation?(): Promise<void>; conceal?(): Promise<void>; resume?(): void; install(get: () => HostSnapshot, subscribe: (listener: Stop) => Stop, fault: (error: Error) => void): Stop }
export function createNativeHost(surface: HostSurface): HostAttachment {
    let state: HostSnapshot = { active: false, node: null, closing: false };
    let disposed = false;
    let failure: Error | null = null;
    const listeners = new Set<Stop>(), failures = new Set<(error: Error) => void>();
    const emit = () => listeners.forEach(listener => listener());
    const release = surface.install(() => state, listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, error => {
        if (disposed || failure) return;
        console.warn('[Game Glance] menu host failed', error);
        failure = error; state = { active: false, node: null, closing: false }; emit();
        failures.forEach(listener => listener(error));
    });
    return {
        conceal: surface.conceal ? () => surface.conceal!() : undefined,
        async present(node) {
            if (disposed) throw new Error('Menu host was disposed');
            if (failure) throw failure;
            surface.resume?.();
            state = { active: true, node, closing: false }; emit();
            await surface.verifyPresentation?.();
            if (disposed || failure) throw failure ?? new Error('Menu host was disposed');
        },
        suspend() { if (!disposed) { state = { ...state, active: false, closing: false }; emit(); } },
        close() { if (!disposed) { state = { active: false, node: null, closing: true }; emit(); } },
        dispose() {
            if (disposed) return;
            disposed = true; state = { active: false, node: null, closing: false }; emit();
            try { release(); } finally { listeners.clear(); failures.clear(); }
        },
        onFailure(listener) { failures.add(listener); if (failure) listener(failure); return () => { failures.delete(listener); }; },
    };
}

type Tree = ReactElement<Record<string, unknown>>;
export function renderMenuSlot(nativeTree: ReactNode, state: HostSnapshot, fault: (error: Error) => void): ReactNode {
    if (!state.active && !state.closing) return nativeTree;
    if (!isValidElement(nativeTree)) { fault(new Error('Native menu root is unavailable')); return nativeTree; }
    const tree = nativeTree as Tree;
    const provider = tree.props.children;
    if (tree.props.navID !== 'MainNavMenuContainer' || !tree.props.navTreeRef || typeof tree.props.onActivated !== 'function' || typeof tree.props.onDeactivated !== 'function' || !isValidElement(provider)) {
        fault(new Error('Native menu navigation shape changed')); return nativeTree;
    }
    return cloneElement(tree, { className: 'BasicUI gg-menu-native-host' }, cloneElement(provider as Tree, {}, state.closing ? null : state.node));
}

/** Transform only the verified native portal child, keeping ownership/context/portal target. */
export function wrapMenuPortals(tree: unknown, wrap: (component: ComponentType<Record<string, unknown>>) => ComponentType<Record<string, unknown>>): unknown {
    if (!tree || typeof tree !== 'object') return tree;
    if (Array.isArray(tree)) {
        const children = tree.map(child => wrapMenuPortals(child, wrap));
        return children.some((child, i) => child !== tree[i]) ? children : tree;
    }
    const portal = tree as { $$typeof?: symbol; children?: ReactNode };
    if (portal.$$typeof === Symbol.for('react.portal')) {
        const child = portal.children;
        if (isValidElement(child) && typeof child.type === 'function' && child.type.toString().includes('MainNavMenuContainer')) {
            return { ...portal, children: { ...child, type: wrap(child.type as ComponentType<Record<string, unknown>>) } };
        }
        return tree;
    }
    if (!isValidElement(tree)) return tree;
    const element = tree as Tree;
    const children = wrapMenuPortals(element.props.children, wrap);
    return children === element.props.children ? tree : cloneElement(element, {}, children as ReactNode);
}
class MenuBoundary extends Component<{ nativeTree: ReactNode; fault(error: Error): void; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: Error) { this.props.fault(error); }
    render() { return this.state.failed ? this.props.nativeTree : this.props.children; }
}
interface PortalAPI { createPortal(...args: unknown[]): unknown }
/** The live API is called even when React has cached the native memo's inner function. */
export function installMenuPortalHook(api: PortalAPI, wrap: (native: ComponentType<Record<string, unknown>>) => ComponentType<Record<string, unknown>>): Stop {
    return ownMethod(api, 'createPortal', next => function(this: unknown, ...args: unknown[]) {
        const [child, target] = args;
        if (isValidElement(child) && typeof child.type === 'function' && child.type.toString().includes('MainNavMenuContainer')) {
            const props = child.props as Record<string, unknown>;
            const popup = props.popup as Window | undefined;
            const document = (target as Element | undefined)?.ownerDocument;
            if (popup && /^MainMenu(?:_|$)/.test(popup.name) && document?.defaultView === popup && typeof props.open === 'boolean') {
                args[0] = { ...child, type: wrap(child.type as ComponentType<Record<string, unknown>>) };
            }
        }
        return Reflect.apply(next, this, args);
    });
}

/** Hide the departing native container until its closed state has actually painted.
 * Restoring Steam's 70% black glass during its 300ms close hold flashes the whole scene.
 */
export function retireMenuBackdrop(document: Document, backdrop: HTMLElement, visibleClass: string): Stop {
    const view = document.defaultView;
    const style = document.createElement('style');
    style.dataset.ggMenuCloseGuard = 'true';
    style.textContent = '[data-gg-menu-retiring]{opacity:0!important;visibility:hidden!important;transition:none!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
    backdrop.dataset.ggMenuRetiring = 'true'; document.head.append(style);
    let finished = false, frame: number | undefined;
    const finish = () => {
        if (finished) return;
        finished = true; observer?.disconnect();
        if (frame !== undefined) view?.cancelAnimationFrame(frame);
        style.remove(); delete backdrop.dataset.ggMenuRetiring;
    };
    const check = () => {
        if (finished || frame !== undefined || backdrop.classList.contains(visibleClass)) return;
        if (!view?.requestAnimationFrame) { finish(); return; }
        // Keep the zero-opacity style through a paint before restoring the native transition.
        frame = view.requestAnimationFrame(() => { frame = view.requestAnimationFrame(finish); });
    };
    const observer = view?.MutationObserver ? new view.MutationObserver(check) : undefined;
    observer?.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    check();
    return finish;
}

type ViewportRelease = ((closing?: boolean) => Stop | undefined) & { conceal(): Promise<void>; resume(): void };
export function stretchMenuViewport(document: Document, classes: readonly string[], source?: Document): ViewportRelease {
    const styles = findModule(value => typeof value?.Container === 'string' && classes.includes(value.Container) && typeof value.ViewPlaceholder === 'string' && typeof value.Fullscreen === 'string');
    const placeholder = styles?.ViewPlaceholder;
    if (typeof placeholder !== 'string' || !/^[-_a-zA-Z0-9]+$/.test(placeholder) || document.getElementsByClassName(placeholder).length !== 1) throw new Error('Native menu viewport shape changed');
    const style = document.createElement('style');
    style.dataset.ggMenuViewport = 'true';
    style.textContent = `.${placeholder}{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important}`;
    const backdropStyle = document.createElement('style');
    backdropStyle.dataset.ggMenuBackdrop = 'true';
    // Steam's MainMenuBrowserView adds a separate 70%-black/8px-blur scrim.
    // The parent scrim composites the translucent child BrowserView as opaque black in-game.
    // Clear it so the glass-only custom menu has no background-blur layer.
    // Native Steam menus regain their original scrim on release.
    const backdropStyles = findModule(value => typeof value?.BackgroundGlass === 'string' && typeof value.DrawBackground === 'string' && typeof value.Blur === 'string');
    const backdrop = backdropStyles?.BackgroundGlass;
    const visible = backdropStyles?.Visible;
    const background = typeof backdrop === 'string' && /^[-_a-zA-Z0-9]+$/.test(backdrop) ? document.getElementsByClassName(placeholder)[0]?.closest<HTMLElement>(`.${backdrop}`) : null;
    if (!background || typeof visible !== 'string' || !/^[-_a-zA-Z0-9]+$/.test(visible)) throw new Error('Native menu backdrop shape changed');
    // The popup's glass is the only menu visual; do not fade a separate native scrim.
    backdropStyle.textContent = `.${backdrop}:has(.${placeholder}){background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:1!important;transition:none!important}`;
    document.head.append(style, backdropStyle);
    const releaseTokens: Stop[] = [];
    try {
        const selector = '.gg-menu,.gg-menu-status-host';
        releaseTokens.push(installTokenCss(document, selector));
        if (source && source !== document) releaseTokens.push(installTokenCss(source, selector));
        const presentation = source ? prepareMenuPresentation(document, source, document.getElementsByClassName(placeholder)[0] as HTMLElement) : undefined;
        let stopped = false;
        const release = (closing = false) => {
            if (stopped) return;
            stopped = true;
            const finish = closing ? retireMenuBackdrop(document, background, visible) : undefined;
            try { presentation?.(); } finally {
                backdropStyle.remove();
                // Keep the external BrowserView at full size while it hides. Restoring
                // native dimensions now stretches its last submitted custom-menu frame.
                if (!closing) style.remove();
                for (const release of releaseTokens) release();
            }
            return closing ? () => { finish?.(); style.remove(); } : undefined;
        };
        return Object.assign(release, { conceal: () => presentation?.conceal() ?? Promise.resolve(), resume: () => presentation?.resume() });
    } catch (error) { style.remove(); backdropStyle.remove(); for (const release of releaseTokens) release(); throw error; }
}

/** Native portal/window/context stay owned by Steam; no mounted React internals are modified. */
export function registerDiscoveredMenuHost(): Stop | null {
    try {
        const memo = findModuleExport(value => typeof value?.type === 'function' && value.type.toString().includes('MainMenuBrowserView') && value.type.toString().includes('createPortal'));
        if (!memo || typeof ReactDOM.createPortal !== 'function') return null;
    } catch { return null; }
    const factory: MenuHostFactory = owner => {
        if (owner.IsAnyVRWindow()) throw new Error('VR menu host is unsupported');
        const document = owner.BrowserWindow?.document;
        if (!document?.head) throw new Error('Steam menu owner window is unavailable');
        let stopViewport: ViewportRelease | undefined;
        let stopClosingBackdrop: Stop | undefined;
        let stopChrome: Stop | undefined;
        let stopPageStatus: Stop | undefined;
        const releaseEffects = () => {
            const chrome = stopChrome, pageStatus = stopPageStatus;
            stopChrome = stopPageStatus = undefined;
            try { chrome?.(); } finally { pageStatus?.(); }
        };
        const releaseViewport = (closing = false) => {
            if (!stopViewport) return;
            const release = stopViewport; stopViewport = undefined;
            stopClosingBackdrop?.(); stopClosingBackdrop = release(closing);
        };
        function stretchViewport(tree: Tree, popup?: Window) {
            if (!popup?.document) throw new Error('Native menu popup is unavailable');
            stopClosingBackdrop?.(); stopClosingBackdrop = undefined;
            if (!stopViewport) stopViewport = stretchMenuViewport(document!, String(tree.props.className ?? '').split(/\s+/), popup.document);
        }
        let read: () => HostSnapshot;
        let confirmed: ReactNode;
        const pending = new Set<{ resolve(): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
        return createNativeHost({
            conceal: () => stopViewport?.conceal() ?? Promise.resolve(),
            resume: () => stopViewport?.resume(),
            verifyPresentation() {
                if (read().active && confirmed === read().node) return Promise.resolve();
                return new Promise<void>((resolve, reject) => {
                    const request = { resolve, reject, timer: setTimeout(() => {
                        pending.delete(request); reject(new Error('Steam menu renderer did not confirm presentation'));
                    }, 1000) };
                    pending.add(request);
                });
            },
            install(get, subscribe, fault) {
                read = get;
                const releaseChromeSubscription = subscribe(() => {
                    try {
                        if (get().active) {
                            stopChrome ??= hideNativeMenuChrome(owner);
                            stopPageStatus ??= hideBackgroundStatus(document!);
                        } else {
                            // A native handoff may arrive after close consumed the viewport lease.
                            // Clear its pending guard even though there is no viewport left to release.
                            if (!get().closing) { stopClosingBackdrop?.(); stopClosingBackdrop = undefined; }
                            releaseEffects();
                        }
                    } catch (error) { fault(error as Error); }
                });
                const wrapped = new WeakMap<object, ComponentType<Record<string, unknown>>>();
                const wrap = (native: ComponentType<Record<string, unknown>>) => {
                    const existing = wrapped.get(native); if (existing) return existing;
                    function Gate({ tree, popup }: { tree: ReactNode; popup?: Window }) {
                        const snapshot = useSyncExternalStore(subscribe, get);
                        const replaced = renderMenuSlot(tree, snapshot, error => queueMicrotask(() => fault(error)));
                        const usingCustomSlot = replaced !== tree;
                        // Native focus/store updates create fresh React trees. They must not tear down
                        // and recreate the owner-document glass/backdrop lease every time.
                        useLayoutEffect(() => {
                            if (!snapshot.active || !usingCustomSlot) { releaseViewport(); return; }
                            try { stretchViewport(tree as Tree, popup); }
                            catch (error) { fault(error as Error); return; }
                            return () => releaseViewport(get().closing === true);
                        }, [snapshot.active, usingCustomSlot, popup]);
                        // A newly presented node still needs acknowledgement even when its viewport is reused.
                        useLayoutEffect(() => {
                            if (!snapshot.active || !usingCustomSlot || !stopViewport) { confirmed = undefined; return; }
                            confirmed = snapshot.node;
                            for (const request of pending) { clearTimeout(request.timer); request.resolve(); }
                            pending.clear();
                        }, [snapshot.active, snapshot.node, usingCustomSlot, popup]);
                        return <MenuBoundary nativeTree={tree} fault={fault}>{replaced}</MenuBoundary>;
                    }
                    const component = function NativeMenuContent(props: Record<string, unknown>) {
                        const tree = (native as (props: Record<string, unknown>) => ReactNode)(props);
                        return <Gate tree={tree} popup={props.popup as Window | undefined} />;
                    };
                    wrapped.set(native, component); return component;
                };
                const release = installMenuPortalHook(ReactDOM as unknown as PortalAPI, wrap);
                return () => {
                    try { release(); }
                    finally {
                        releaseViewport();
                        stopClosingBackdrop?.(); stopClosingBackdrop = undefined;
                        releaseChromeSubscription(); releaseEffects();
                        for (const request of pending) { clearTimeout(request.timer); request.reject(new Error('Menu host was disposed')); }
                        pending.clear();
                    }
                };
            },
        });
    };
    return registerMenuHost(factory);
}
