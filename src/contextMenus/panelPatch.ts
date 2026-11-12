import { callOriginal, replacePatch } from '@decky/ui';
import { createElement, type ComponentType } from 'react';
import { LOG_PREFIX } from '../constants';
import { reshapeGameMenu } from './reshape';

/** The prop GameMenuPanel puts on Steam's Rt element: only these menus are reshaped into the panel. */
export const PANEL_MARK = '__ggPanel';

type Renderable = { prototype: { render(...a: unknown[]): unknown } };
const installed = new Map<Renderable, () => void>();
let live = false;
/** On while the menu patch is installed; off, no render patch is (re)installed, so a menu still open cannot bring it back. */
export const setPanelLive = (on: boolean) => { live = on; };
export const panelLive = () => live;

/**
 * Patches Steam's game-menu class so a marked menu renders `View` with the reshaped model, on every render.
 *
 * Steam's Rt is a MobX observer (probed 2026-11-12): the prototype's render runs once per instance, defines a sealed
 * instance `render` (the reactive one) and calls it; later renders never touch the prototype. So for a marked instance,
 * while that first call runs (synchronously), Object.defineProperty is wrapped to hand MobX a reactive render that
 * reshapes its result on later renders; the first render is reshaped after every other plugin's patch on Rt has run.
 * Object.defineProperty is restored before the call returns. Unmarked instances are left untouched.
 */
export function installPanelRenderPatchOn(Rt: Renderable, View: ComponentType<any>): () => void {
    if (!live) return () => undefined;
    const existing = installed.get(Rt);
    if (existing) return existing;
    const transform = (props: Record<string, unknown>, ret: unknown) => {
        try {
            const model = reshapeGameMenu(ret);
            return model ? createElement(View, { model, instance: props.instance, overview: props.overview }) : ret;
        } catch {
            return ret;
        }
    };
    const patch = replacePatch(Rt.prototype, 'render', function (this: { props?: Record<string, unknown> }, args: unknown[]) {
        const self = this, props = self?.props;
        if (!props?.[PANEL_MARK] || Object.prototype.hasOwnProperty.call(self, 'render')) return callOriginal;
        const define = Object.defineProperty;
        let first = true;
        Object.defineProperty = function <T>(target: T, key: PropertyKey, desc: PropertyDescriptor & ThisType<any>): T {
            if (target === (self as unknown) && key === 'render' && typeof desc?.value === 'function') {
                const reactive = desc.value as (...a: unknown[]) => unknown;
                // The first render goes back through every other plugin's patch on Rt (SteamGridDB adds its row there), so it
                // is reshaped below, once they have run; later renders only come here.
                desc = { ...desc, value: function (this: { props: Record<string, unknown> }, ...a: unknown[]) { const out = reactive.apply(this, a); return first ? out : transform(this.props, out); } };
            }
            return define(target, key, desc);
        } as typeof Object.defineProperty;
        let ret: unknown;
        try {
            ret = patch.original.apply(self, args);
        } finally {
            Object.defineProperty = define;
            first = false;
        }
        return transform(props, ret);
    });
    const remove = () => {
        if (installed.get(Rt) !== remove) return;
        installed.delete(Rt);
        try { patch.unpatch(); } catch (error) { console.warn(`${LOG_PREFIX} could not remove the game menu render patch`, error); }
    };
    installed.set(Rt, remove);
    return remove;
}

/** Removes every render patch (the toggle off, Game Glance unloading). */
export const removePanelRenderPatches = () => { live = false; [...installed.values()].forEach((remove) => remove()); };
