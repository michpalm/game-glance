import { findModuleExport } from '@decky/ui';
import { Component, Fragment, cloneElement, createElement, isValidElement, useLayoutEffect, useSyncExternalStore, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { Stop } from './model';
import { ownMethod } from './steam/patchOwnership';
import { registerMenuHost, type HostAttachment, type MenuHostFactory } from './steam/runtime';

export interface HostSnapshot { active: boolean; node: ReactNode }
interface HostSurface { verifyPresentation?(): Promise<void>; install(get: () => HostSnapshot, subscribe: (listener: Stop) => Stop, fault: (error: Error) => void): Stop }
export function createNativeHost(surface: HostSurface): HostAttachment {
    let state: HostSnapshot = { active: false, node: null };
    let disposed = false;
    let failure: Error | null = null;
    const listeners = new Set<Stop>(), failures = new Set<(error: Error) => void>();
    const emit = () => listeners.forEach(listener => listener());
    const release = surface.install(() => state, listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, error => {
        if (disposed || failure) return;
        failure = error; state = { active: false, node: null }; emit();
        failures.forEach(listener => listener(error));
    });
    return {
        async present(node) {
            if (disposed) throw new Error('Menu host was disposed');
            if (failure) throw failure;
            state = { active: true, node }; emit();
            await surface.verifyPresentation?.();
            if (disposed || failure) throw failure ?? new Error('Menu host was disposed');
        },
        suspend() { if (!disposed) { state = { ...state, active: false }; emit(); } },
        close() { if (!disposed) { state = { active: false, node: null }; emit(); } },
        dispose() {
            if (disposed) return;
            disposed = true; state = { active: false, node: null }; emit();
            try { release(); } finally { listeners.clear(); failures.clear(); }
        },
        onFailure(listener) { failures.add(listener); if (failure) listener(failure); return () => { failures.delete(listener); }; },
    };
}

type Tree = ReactElement<Record<string, unknown>>;
export function renderMenuSlot(nativeTree: ReactNode, state: HostSnapshot, fault: (error: Error) => void): ReactNode {
    if (!state.active) return nativeTree;
    if (!isValidElement(nativeTree)) { fault(new Error('Native menu root is unavailable')); return nativeTree; }
    const tree = nativeTree as Tree;
    const provider = tree.props.children;
    if (tree.props.navID !== 'MainNavMenuContainer' || !tree.props.navTreeRef || typeof tree.props.onActivated !== 'function' || typeof tree.props.onDeactivated !== 'function' || !isValidElement(provider)) {
        fault(new Error('Native menu navigation shape changed')); return nativeTree;
    }
    return cloneElement(tree, { className: 'BasicUI gg-menu-native-host' }, cloneElement(provider as Tree, {}, state.node));
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
function stretchPlaceholder(tree: ReactNode): ReactNode {
    if (!isValidElement(tree)) return tree;
    const element = tree as Tree;
    if (element.props.browser && typeof element.props.visible === 'boolean') return cloneElement(element, { className: `${element.props.className ?? ''} gg-menu-native-placeholder` });
    const children = element.props.children;
    if (Array.isArray(children)) return cloneElement(element, {}, children.map(child => stretchPlaceholder(child)));
    return children ? cloneElement(element, {}, stretchPlaceholder(children as ReactNode)) : tree;
}

/** Registered only when the native browser-view memo's source shape is recognized. */
export function registerDiscoveredMenuHost(): Stop | null {
    let memo: { type: (props: Record<string, unknown>) => ReactNode } | undefined;
    try {
        memo = findModuleExport(value => typeof value?.type === 'function' && value.type.toString().includes('MainMenuBrowserView') && value.type.toString().includes('createPortal'));
    } catch { return null; }
    if (!memo) return null;
    const factory: MenuHostFactory = (owner) => {
        if (owner.IsAnyVRWindow()) throw new Error('VR menu host is unsupported');
        let read: () => HostSnapshot;
        let confirmed: ReactNode;
        const pending = new Set<{ resolve(): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
        return createNativeHost({
            verifyPresentation() {
                if (read().active && confirmed === read().node) return Promise.resolve();
                return new Promise<void>((resolve, reject) => {
                    const request = { resolve, reject, timer: setTimeout(() => {
                        pending.delete(request);
                        reject(new Error('Steam menu renderer did not confirm presentation'));
                    }, 1000) };
                    pending.add(request);
                });
            },
            install(get, subscribe, fault) {
            read = get;
            const wrapped = new WeakMap<object, ComponentType<Record<string, unknown>>>();
            const wrap = (native: ComponentType<Record<string, unknown>>) => {
                const existing = wrapped.get(native); if (existing) return existing;
                function Gate({ tree }: { tree: ReactNode }) {
                    const snapshot = useSyncExternalStore(subscribe, get);
                    const replaced = renderMenuSlot(tree, snapshot, error => queueMicrotask(() => fault(error)));
                    useLayoutEffect(() => {
                        if (!snapshot.active || replaced === tree) { confirmed = undefined; return; }
                        confirmed = snapshot.node;
                        for (const request of pending) { clearTimeout(request.timer); request.resolve(); }
                        pending.clear();
                    }, [snapshot, replaced, tree]);
                    return <MenuBoundary nativeTree={tree} fault={fault}>{replaced}</MenuBoundary>;
                }
                // The native component's hooks retain their order in this stable wrapper type.
                const component = function NativeMenuContent(props: Record<string, unknown>) {
                    const tree = (native as (props: Record<string, unknown>) => ReactNode)(props);
                    return <Gate tree={tree} />;
                };
                wrapped.set(native, component); return component;
            };
            function BrowserGate({ tree }: { tree: ReactNode }) {
                const snapshot = useSyncExternalStore(subscribe, get);
                return <Fragment>{snapshot.active && <style>{'.gg-menu-native-placeholder{width:100vw!important;height:100vh!important;inset:0!important}'}</style>}{snapshot.active ? stretchPlaceholder(tree) : tree}</Fragment>;
            }
            const release = ownMethod(memo!, 'type', next => function(props) {
                const tree = next(props);
                const transformed = wrapMenuPortals(tree, wrap) as ReactNode;
                return createElement(BrowserGate, { tree: transformed });
            });
            return () => {
                try { release(); }
                finally {
                    for (const request of pending) { clearTimeout(request.timer); request.reject(new Error('Menu host was disposed')); }
                    pending.clear();
                }
            };
        } });
    };
    return registerMenuHost(factory);
}
