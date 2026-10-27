import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
const css = vi.hoisted(() => ({ Container: 'nativeContainer', ViewPlaceholder: 'nativePlaceholder', Fullscreen: 'nativeFull', BackgroundGlass: 'nativeBackdrop', Visible: 'nativeVisible', DrawBackground: 'nativeDraw', Blur: 'nativeBlur' }));
vi.mock('@decky/ui',()=>({findModuleExport:()=>undefined, findModule:(predicate:(value:unknown)=>boolean)=>predicate(css)?css:undefined}));
const rpc=vi.hoisted(()=>vi.fn(async(..._args:unknown[]):Promise<unknown>=>null));
vi.mock('@decky/api',()=>({callable:(name:string)=>(...args:unknown[])=>rpc(name,...args)}));
import { stretchMenuViewport } from '../../../src/menu/host';
describe('menu viewport frost wiring',()=>{
    it('starts the frost host for an enabled Quick Access session and holds the reveal on it',async()=>{
        const owner=parseHTML('<html><head></head><body><div class="nativeBackdrop"><div class="nativePlaceholder"></div></div></body></html>');
        const popup=parseHTML('<html><head></head><body><div class="gg-menu"><i data-gg-frost-region="bar"></i><i data-gg-frost-region="panel"></i><i data-gg-frost-region="notifications"></i></div></body></html>');
        owner.document.querySelector('.nativePlaceholder')!.getBoundingClientRect=()=>({left:0,top:0,width:800,height:480} as DOMRect);
        const stop=stretchMenuViewport(owner.document as unknown as Document,['nativeContainer'],popup.document as unknown as Document,()=>null,{generation:1,enabled:true});
        for(let i=0;i<5;i++)await Promise.resolve();
        expect(rpc.mock.calls.map(c=>c[0])).toContain('frost_environment');stop();
    });
});
