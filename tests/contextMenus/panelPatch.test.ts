import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { installPanelRenderPatchOn, PANEL_MARK, setPanelLive } from '../../src/contextMenus/panelPatch';
import { beforeEach } from 'vitest';
import { afterPatch } from '@decky/ui';
import { steamTree } from './steamTree';

const View = () => null;
/** Steam's MobX observer: the prototype's render runs once per instance and pins a sealed instance render (probed 2026-11-12). */
const observer = (tree: () => unknown) => class Rt {
    props: Record<string, unknown> = {};
    render(): unknown {
        const reactive = function (this: Rt) { return tree(); };
        Object.defineProperty(this, 'render', { configurable: false, writable: false, value: reactive });
        return this.render();
    }
};
const marked = <T extends { props: Record<string, unknown> }>(r: T) => { r.props = { [PANEL_MARK]: true, instance: 'inst', overview: { appid: 620 } }; return r; };

describe('installPanelRenderPatchOn', () => {
    beforeEach(() => setPanelLive(true));
    it('patches nothing once the menu patch is gone (a menu still open re-rendering)', () => {
        const tree = steamTree();
        const Rt = observer(() => tree);
        setPanelLive(false);
        installPanelRenderPatchOn(Rt, View)();
        expect(marked(new Rt()).render()).toBe(tree);
    });
    it('draws the panel on a marked menu\'s first render and every render after', () => {
        let fav = true;
        const Rt = observer(() => steamTree({ fav }));
        const remove = installPanelRenderPatchOn(Rt, View);
        const r = marked(new Rt());
        const first = r.render() as ReactElement<Record<string, any>>;
        expect(first.type).toBe(View);
        expect(first.props.model.favorite.on).toBe(true);
        expect(first.props.instance).toBe('inst');
        fav = false;
        const again = r.render() as ReactElement<Record<string, any>>;
        expect(again.type).toBe(View);
        expect(again.props.model.favorite.on).toBe(false);
        remove();
    });
    it('lets another plugin\'s patch (SteamGridDB) see Steam\'s rows first, then draws the panel with its row', () => {
        const Rt = observer(() => steamTree());
        const sgdb = afterPatch(Rt.prototype, 'render', (_: unknown[], ret: any) => {
            const kids = ret.props.children as unknown[];
            kids.find(Boolean);
            const added = { ...ret, props: { ...ret.props, children: [...kids.slice(0, 9), steamTree({ plugin: true }).props.children[9], kids[9]] } };
            return added;
        });
        const remove = installPanelRenderPatchOn(Rt, View);
        const out = marked(new Rt()).render() as ReactElement<Record<string, any>>;
        expect(out.type).toBe(View);
        expect(out.props.model.after.map((e: ReactElement) => e.key)).toEqual(['sgdb-change-artwork']);
        remove();
        sgdb.unpatch();
    });
    it('leaves every unmarked menu as Steam drew it, and Object.defineProperty as it was', () => {
        const tree = steamTree();
        const Rt = observer(() => tree);
        const define = Object.defineProperty;
        const remove = installPanelRenderPatchOn(Rt, View);
        const r = new Rt();
        expect(r.render()).toBe(tree);
        expect(r.render()).toBe(tree);
        marked(new Rt()).render();
        expect(Object.defineProperty).toBe(define);
        remove();
    });
    it('falls back to Steam\'s menu when the shape is unknown', () => {
        const odd = { type: 'x', props: { children: [] } };
        const Rt = observer(() => odd);
        const remove = installPanelRenderPatchOn(Rt, View);
        expect(marked(new Rt()).render()).toBe(odd);
        remove();
    });
    it('patches once, and new menus are Steam\'s after removal', () => {
        const tree = steamTree();
        const Rt = observer(() => tree);
        const a = installPanelRenderPatchOn(Rt, View), b = installPanelRenderPatchOn(Rt, View);
        expect(a).toBe(b);
        a();
        expect(marked(new Rt()).render()).toBe(tree);
    });
});
