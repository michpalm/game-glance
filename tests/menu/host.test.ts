import { parseHTML } from 'linkedom';
import { createElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNativeHost, renderMenuSlot, wrapMenuPortals, installMenuPortalHook, stretchMenuViewport, holdPageStatus, hideNativeMenuChrome, type HostSnapshot } from '../../src/menu/host';
const css = vi.hoisted(() => ({ Container: 'nativeContainer', ViewPlaceholder: 'nativePlaceholder', Fullscreen: 'nativeFull', BackgroundGlass: 'nativeBackdrop', Visible: 'nativeVisible', DrawBackground: 'nativeDraw', Blur: 'nativeBlur' }));
vi.mock('@decky/ui',()=>({findModuleExport:()=>undefined, findModule:(predicate:(value:unknown)=>boolean)=>predicate(css)?css:undefined}));
function nativeTree(){return createElement('native-tree',{navID:'MainNavMenuContainer',navTreeRef:{current:{}},onActivated:vi.fn(),onDeactivated:vi.fn(),enabled:true,className:'native',children:createElement('native-provider',{},'Native content')});}
describe('native menu host',()=>{
    it('forwards frost generations without coupling frost failure to native presentation',async()=>{
        const setFrostSession=vi.fn(),clearFrost=vi.fn(async()=>{}),warmFrost=vi.fn();
        const host=createNativeHost({install:()=>()=>{},setFrostSession,clearFrost,warmFrost});
        host.warmFrost?.();host.setFrostSession?.({generation:7,enabled:true});await host.clearFrost?.(7);await host.present('menu');
        expect(warmFrost).toHaveBeenCalledOnce();
        expect(setFrostSession).toHaveBeenCalledWith({generation:7,enabled:true});expect(clearFrost).toHaveBeenCalledWith(7);host.dispose();
    });
    it('mounts the popup without adding any separate background-blur panes', () => {
        const owner = parseHTML('<html><head></head><body><div class="nativeBackdrop"><div class="nativePlaceholder"></div></div></body></html>');
        const popup = parseHTML('<html><head></head><body><div class="gg-menu"><div class="gg-menu-bar"></div><div class="gg-menu-panel"></div></div></body></html>');
        const viewport = owner.document.querySelector('.nativePlaceholder')!;
        viewport.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 480 } as DOMRect);
        const stop = stretchMenuViewport(owner.document as unknown as Document, ['nativeContainer'], popup.document as unknown as Document);
        expect(owner.document.querySelector('[data-gg-menu-frost]')).toBeNull(); stop();
    });
    it('keeps the native popup blank during custom close instead of repainting Steam menu content', () => {
        const tree = nativeTree();
        const closed = renderMenuSlot(tree, { active: false, node: null, closing: true }, vi.fn()) as ReactElement<Record<string, unknown>>;
        expect(closed).not.toBe(tree);
        expect(closed.props.className).toBe('BasicUI gg-menu-native-host');
        expect((closed.props.children as ReactElement<{children: unknown}>).props.children).toBeNull();
        expect(renderMenuSlot(tree, { active: false, node: null, closing: false }, vi.fn())).toBe(tree);
    });
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
    it('distinguishes closing from a native handoff even when the custom node has already been cleared', async () => {
        let read!: () => HostSnapshot;
        const host = createNativeHost({ install: get => { read = get; return () => {}; } });
        await host.present('menu'); host.close();
        expect(read()).toMatchObject({ active: false, node: null, closing: true });
        host.suspend();
        expect(read()).toMatchObject({ active: false, node: null, closing: false });
        host.dispose();
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
    const { document } = parseHTML('<html><head></head><body><div class="nativeBackdrop"><div class="nativePlaceholder"></div></div></body></html>');
    const stop = stretchMenuViewport(document as unknown as Document, ['BasicUI', 'nativeContainer']);
    expect(document.querySelector('[data-gg-menu-viewport]')?.textContent).toContain('.nativePlaceholder');
    expect(document.querySelector('.nativePlaceholder')).not.toBeNull();
    const foreign = document.createElement('style'); foreign.textContent = '.other{}'; document.head.append(foreign);
    stop(); stop(); expect(document.querySelector('[data-gg-menu-viewport]')).toBeNull(); expect(foreign.isConnected).toBe(true);
});

it('preserves popup dimensions through close until native handoff, reopen or disposal releases the retained lease', () => {
    const { document } = parseHTML('<html><head></head><body><div class="nativeBackdrop nativeVisible"><div class="nativePlaceholder"></div></div></body></html>');
    const stop = stretchMenuViewport(document as unknown as Document, ['nativeContainer']);
    const finish = stop(true);
    expect(document.querySelector('[data-gg-menu-viewport]')).not.toBeNull();
    expect(finish).toBeTypeOf('function'); finish!();
    expect(document.querySelector('[data-gg-menu-viewport]')).toBeNull();
    expect(document.querySelector('[data-gg-menu-close-guard]')).toBeNull();
});

describe('borrowed native menu chrome', () => {
    it('balances only its own header/footer holds and releases once on handoff or close', () => {
        let header = 2, footer = 3;
        const owner = { HeaderStore: { IncrementHideHeader: () => { header++; }, DecrementHideHeader: () => { header--; } }, FooterStore: { HideFooter: () => { footer++; return { unhide: () => { footer--; } }; } } };
        const stop = hideNativeMenuChrome(owner);
        expect([header, footer]).toEqual([3, 4]); stop(); stop();
        expect([header, footer]).toEqual([2, 3]);
    });
    it('does not hide an already-visible footer held by the custom menu',()=>{
        const hide=vi.fn(),owner={HeaderStore:{IncrementHideHeader:vi.fn(),DecrementHideHeader:vi.fn()},FooterStore:{HideFooter:hide}};
        const stop=hideNativeMenuChrome(owner,true);expect(hide).not.toHaveBeenCalled();
        expect(owner.HeaderStore.IncrementHideHeader).toHaveBeenCalledOnce();stop();stop();
        expect(owner.HeaderStore.DecrementHideHeader).toHaveBeenCalledOnce();
    });
    it('releases an acquired header hold if footer acquisition fails', () => {
        let header = 0;
        const owner = { HeaderStore: { IncrementHideHeader: () => { header++; }, DecrementHideHeader: () => { header--; } }, FooterStore: { HideFooter: () => { throw Error('unavailable'); } } };
        expect(() => hideNativeMenuChrome(owner)).toThrow('unavailable'); expect(header).toBe(0);
    });
    it('leaves unsupported stores unchanged', () => {
        expect(() => hideNativeMenuChrome({})()).not.toThrow();
    });
});

it('removes only the backdrop surrounding the borrowed menu viewport and restores it with the viewport lease', () => {
    const { document } = parseHTML('<html><head></head><body><div class="nativeBackdrop"><div class="nativePlaceholder"></div></div><div class="nativeBackdrop other-native-menu"></div></body></html>');
    const stop = stretchMenuViewport(document as unknown as Document, ['nativeContainer']);
    const rule = document.querySelector('[data-gg-menu-backdrop]')!.textContent;
    expect(rule).toContain('.nativeBackdrop:has(.nativePlaceholder)');
    expect(rule).toContain('backdrop-filter:none!important');
    expect(document.querySelector('.other-native-menu')?.getAttribute('style')).toBeNull();
    stop(); expect(document.querySelector('[data-gg-menu-viewport]')).toBeNull();
});


it('refuses the custom surface when the native dark backdrop cannot be safely cleared', () => {
    const { document } = parseHTML('<html><head></head><body><div class="unknownBackdrop"><div class="nativePlaceholder"></div></div></body></html>');
    expect(() => stretchMenuViewport(document as unknown as Document, ['nativeContainer'])).toThrow('Native menu backdrop shape changed');
    expect(document.querySelector('[data-gg-menu-viewport]')).toBeNull();
});


it('hides only the background Game Glance status copies for the custom-menu lease',()=>{
    const {document}=parseHTML('<html><head></head><body><div class="gg-status-host"></div><div class="gg-status-host gg-menu-status-host"></div><div id="unrelated"></div></body></html>');
    const foreign=document.createElement('style');foreign.textContent='.other{}';document.head.append(foreign);
    const stop=holdPageStatus(document as unknown as Document,false);
    const rule=document.querySelector('[data-gg-menu-page-status]')?.textContent;
    expect(rule).toContain('.gg-status-host:not(.gg-menu-status-host)');
    expect(rule).toContain('visibility:hidden!important');expect(rule).toContain('transition:none!important');
    expect(document.querySelector('#unrelated')?.getAttribute('style')).toBeNull();
    stop();stop();expect(document.querySelector('[data-gg-menu-page-status]')).toBeNull();expect(foreign.isConnected).toBe(true);
});

it('keeps the page status bar on Home, through the menu opening, instead of swapping in the popup copy',()=>{
    const {document}=parseHTML('<html><head></head><body><div class="gg-status-host"></div></body></html>');
    const stop=holdPageStatus(document as unknown as Document,true);
    const rule=document.querySelector('[data-gg-menu-page-status]')?.textContent??'';
    // Steam's menu store reads as "a menu is open", which would step the page copy aside: hold it at full opacity.
    expect(rule).toContain('.gg-status-host:not(.gg-menu-status-host) .gh-status');
    expect(rule).toContain('opacity:1!important');
    expect(rule).not.toContain('visibility:hidden');
    stop();expect(document.querySelector('[data-gg-menu-page-status]')).toBeNull();
});
