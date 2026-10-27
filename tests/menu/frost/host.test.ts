import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
const rpc=vi.fn<(name:string,...args:unknown[])=>Promise<unknown>>(async()=>null);
vi.mock('@decky/api',()=>({callable:(name:string)=>(...args:unknown[])=>rpc(name,...args)}));
import { createMenuFrostHost } from '../../../src/menu/frost/host';
function fixture(){
    const owner=parseHTML('<html><body><section><div id="viewport"></div></section></body></html>');
    const source=parseHTML('<html><body><div class="gg-menu"><i data-gg-frost-region="bar"></i><i data-gg-frost-region="panel"></i><i data-gg-frost-region="notifications"></i></div></body></html>');
    const placeholder=owner.document.getElementById('viewport')! as unknown as HTMLElement;
    // Integer scaling, for example: no supported frost mapping exists.
    const host=createMenuFrostHost(owner.document as unknown as Document,source.document as unknown as Document,placeholder,()=>null);
    return {host};
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
afterEach(()=>{rpc.mockReset();rpc.mockImplementation(async()=>null);});
describe('menu frost host reveal hold',()=>{
    it('resolves at once when frost is off for this opening',async()=>{
        const f=fixture();f.host.setSession({generation:1,enabled:false});
        await expect(f.host.ready()).resolves.toBeUndefined();f.host.dispose();
    });
    it('settles an unsupported context as soon as the environment is known, not at the cap',async()=>{
        let answer!:(value:unknown)=>void;
        rpc.mockImplementation(name=>name==='frost_environment'?new Promise(r=>{answer=r;}):Promise.resolve(null));
        const f=fixture();f.host.setSession({generation:1,enabled:true});
        let settled=false;void f.host.ready().then(()=>{settled=true;});
        await flush();expect(settled).toBe(false);
        answer({hdr:false,maxScale:2});await flush();expect(settled).toBe(true);f.host.dispose();
    });
});
