import { parseHTML } from 'linkedom';
import { createElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNativeHost, renderMenuSlot, wrapMenuPortals, installMenuPortalHook, stretchMenuViewport, type HostSnapshot } from '../../src/menu/host';
const css = vi.hoisted(() => ({ Container: 'nativeContainer', ViewPlaceholder: 'nativePlaceholder', Fullscreen: 'nativeFull' }));
vi.mock('@decky/ui',()=>({findModuleExport:()=>undefined, findModule:(predicate:(value:unknown)=>boolean)=>predicate(css)?css:undefined}));
function nativeTree(){return createElement('native-tree',{navID:'MainNavMenuContainer',navTreeRef:{current:{}},onActivated:vi.fn(),onDeactivated:vi.fn(),enabled:true,className:'native',children:createElement('native-provider',{},'Native content')});}
describe('native menu host',()=>{
    it('preserves native identity and focus callbacks when replacing only owned content',()=>{
        const tree=nativeTree(),content=createElement('section',{},'Custom menu');
        expect(renderMenuSlot(tree,{active:false,node:content},vi.fn())).toBe(tree);
        const changed=renderMenuSlot(tree,{active:true,node:content},vi.fn()) as ReactElement<Record<string,unknown>>;
        expect(changed.type).toBe(tree.type);expect(changed.props.navTreeRef).toBe(tree.props.navTreeRef);expect(changed.props.onActivated).toBe(tree.props.onActivated);expect(changed.props.onDeactivated).toBe(tree.props.onDeactivated);
        const provider=changed.props.children as ReactElement<{children:unknown}>;expect(provider.props.children).toBe(content);
    });
    it('returns an unknown native tree unchanged and reports compatibility failure',()=>{
        const tree=createElement('div',{},'Steam'),fail=vi.fn();
        expect(renderMenuSlot(tree,{active:true,node:'menu'},fail)).toBe(tree);expect(fail).toHaveBeenCalledTimes(1);
    });
    it('replaces only the recognized portal container and leaves unrelated portals intact',()=>{
        function Container(){return createElement('div',{navID:'MainNavMenuContainer'});}
        const portal={$$typeof:Symbol.for('react.portal'),key:null,children:createElement(Container),containerInfo:{}};
        const wrap=vi.fn(()=>()=>null);const changed=wrapMenuPortals(portal,wrap) as typeof portal;
        expect(changed.children.type).not.toBe(Container);expect(changed.containerInfo).toBe(portal.containerInfo);expect(wrap).toHaveBeenCalledTimes(1);
        const other={...portal,children:createElement('div')};expect(wrapMenuPortals(other,wrap)).toBe(other);
    });
    it('suspends, closes and disposes idempotently without disposing the borrowed Steam tree',async()=>{
        let read!:()=>HostSnapshot;const release=vi.fn();
        const host=createNativeHost({install:get=>{read=get;return release;}});
        expect(read().active).toBe(false);await host.present('menu');expect(read()).toMatchObject({active:true,node:'menu'});
        host.suspend();expect(read().active).toBe(false);await host.present('next');host.close();expect(read().node).toBeNull();
        host.dispose();host.dispose();expect(release).toHaveBeenCalledTimes(1);await expect(host.present('late')).rejects.toThrow();
    });
    it('does not report presentation success before the native render confirms it', async () => {
        let confirm!: () => void;
        const verified = new Promise<void>(resolve => { confirm = resolve; });
        const host = createNativeHost({ install: () => vi.fn(), verifyPresentation: () => verified });
        let presented = false;
        const pending = host.present('menu').then(() => { presented = true; });
        await Promise.resolve(); expect(presented).toBe(false);
        confirm(); await pending; expect(presented).toBe(true); host.dispose();
    });
    it('rejects a mounted export that never reaches the native renderer', async () => {
        const host = createNativeHost({ install: () => vi.fn(), verifyPresentation: async () => { throw Error('Native render did not confirm'); } });
        await expect(host.present('menu')).rejects.toThrow('Native render did not confirm'); host.dispose();
    });
    it('reports a late React failure and refuses another custom mount',async()=>{
        let fault!:(e:Error)=>void;const release=vi.fn(),failure=vi.fn();
        const host=createNativeHost({install:(_get,_subscribe,onFault)=>{fault=onFault;return release;}});host.onFailure!(failure);
        await host.present('menu');fault(Error('bad render'));expect(failure).toHaveBeenCalledTimes(1);await expect(host.present('retry')).rejects.toThrow('bad render');host.dispose();expect(release).toHaveBeenCalledTimes(1);
    });
});

describe('mounted Steam portal interception', () => {
    it('reaches an already-mounted caller through the live portal API and restores ownership', () => {
        function Native() { return createElement('div', { navID: 'MainNavMenuContainer' }); }
        const popup = { name: 'MainMenu_uid2' };
        const target = { ownerDocument: { defaultView: popup } };
        const original = vi.fn((...args: unknown[]) => args);
        const api = { createPortal: original };
        const mountedCaller = () => api.createPortal(createElement(Native, { popup, open: true } as never), target, 'stable-key');
        const wrap = vi.fn(() => () => null);
        const stop = installMenuPortalHook(api, wrap);
        const result = mountedCaller();
        expect((result[0] as ReactElement).type).not.toBe(Native);
        expect(result.slice(1)).toEqual([target, 'stable-key']); expect(wrap).toHaveBeenCalledTimes(1);
        stop(); expect(api.createPortal).toBe(original); expect((mountedCaller()[0] as ReactElement).type).toBe(Native);
    });
    it('passes unrelated or mismatched-window portals through unchanged', () => {
        function Native() { return createElement('div', { navID: 'MainNavMenuContainer' }); }
        const api = { createPortal: vi.fn((...args: unknown[]) => args) }, wrap = vi.fn(() => () => null);
        const stop = installMenuPortalHook(api, wrap);
        const popup = { name: 'QuickAccess_uid2' }, child = createElement(Native, { popup, open: true } as never);
        expect(api.createPortal(child, { ownerDocument: { defaultView: popup } })[0]).toBe(child);
        expect(api.createPortal(createElement('div'), {})[0]).toEqual(createElement('div'));
        expect(wrap).not.toHaveBeenCalled(); stop();
    });
});

it('finds the stylesheet module and restores only the owned viewport rule', () => {
    const { document } = parseHTML('<html><head></head><body><div class="nativePlaceholder"></div></body></html>');
    const stop = stretchMenuViewport(document as unknown as Document, ['BasicUI', 'nativeContainer']);
    expect(document.querySelector('[data-gg-menu-viewport]')?.textContent).toContain('.nativePlaceholder');
    expect(document.querySelector('.nativePlaceholder')).not.toBeNull();
    const foreign = document.createElement('style'); foreign.textContent = '.other{}'; document.head.append(foreign);
    stop(); stop(); expect(document.querySelector('[data-gg-menu-viewport]')).toBeNull(); expect(foreign.isConnected).toBe(true);
});
