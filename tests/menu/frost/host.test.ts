import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
const rpc=vi.fn<(name:string,...args:unknown[])=>Promise<unknown>>(async()=>null);
vi.mock('@decky/api',()=>({callable:(name:string)=>(...args:unknown[])=>rpc(name,...args)}));
import { createMenuFrostHost, frostRegionElements } from '../../../src/menu/frost/host';
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
describe('menu frost regions',()=>{
    it('finds the status bar copy, which is portalled outside the menu root, as the fourth area',()=>{
        const {document}=parseHTML('<html><body><div class="gg-menu"><i data-gg-frost-region="bar"></i><i data-gg-frost-region="panel"></i><i data-gg-frost-region="notifications"></i></div>'+
            '<div class="gg-status-host gg-menu-status-host"><div class="gh-status"><div class="gh-status-pill"></div></div></div></body></html>');
        const found=frostRegionElements(document as unknown as Document);
        expect(found.slice(0,3).map(e=>e?.getAttribute('data-gg-frost-region'))).toEqual(['bar','panel','notifications']);
        expect(found[3]?.className).toBe('gh-status-pill');
    });
});

// The Social chat's keyboard mounts and unmounts while the menu is open over a game. Its element appearing restarts the
// measurement, which must not publish a null first: that would release the live effect and lose this opening's frost.
describe('menu frost host and the keyboard',()=>{
    function gameFixture(shouldThrow=()=>false){
        const owner=parseHTML('<html><body><section><div id="viewport"></div></section></body></html>');
        const source=parseHTML('<html><body><div class="gg-menu"><i data-gg-frost-region="bar"></i><i data-gg-frost-region="panel"></i><i data-gg-frost-region="notifications"></i></div>'+
            '<div class="gg-status-host gg-menu-status-host"><div class="gh-status"><div class="gh-status-pill"></div></div></div></body></html>');
        const view={innerWidth:1000,innerHeight:500,devicePixelRatio:1,requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},
            getComputedStyle:()=>({borderTopLeftRadius:'8px',visibility:'visible'}),addEventListener:()=>{},removeEventListener:()=>{}};
        const ownerView={...view},sourceView={...view};
        Object.defineProperty(owner.document,'defaultView',{value:ownerView,configurable:true});
        Object.defineProperty(source.document,'defaultView',{value:sourceView,configurable:true});
        const placeholder=owner.document.getElementById('viewport')! as unknown as HTMLElement;
        placeholder.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:500} as DOMRect);
        const area=(e:Element,left:number,top:number)=>{
            (e as unknown as HTMLElement).getBoundingClientRect=()=>({left,top,width:200,height:100} as DOMRect);
            Object.defineProperties(e,{offsetWidth:{value:200,configurable:true},offsetHeight:{value:100,configurable:true}});
        };
        [...source.document.querySelectorAll('[data-gg-frost-region],.gh-status-pill')].forEach((e,i)=>area(e,i*210,10));
        const measured:unknown[]=[];
        const host=createMenuFrostHost(owner.document as unknown as Document,source.document as unknown as Document,placeholder,
            ()=>{if(shouldThrow())throw Error('temporary geometry failure');return {viewportId:'v1',background:'game',outputWidth:1000,outputHeight:500,dpr:1,fit:'fit',colorMode:'sdr'};},{measured:frame=>measured.push(frame)});
        const openKeyboard=()=>{const k=source.document.createElement('div');k.setAttribute('data-gg-frost-region','keyboard');area(k,500,300);source.document.querySelector('.gg-menu')!.appendChild(k);return k;};
        return {host,openKeyboard,measured};
    }
    const calls=(name:string)=>rpc.mock.calls.filter(c=>c[0]===name);
    it('sends the opened keyboard as an update of the live effect, and its closing too',async()=>{
        vi.useFakeTimers();
        rpc.mockImplementation(async name=>({frost_prepare:{status:'ready',key:'key'},frost_activate:{status:'active',token:'token'},frost_update:true,frost_renew:true,frost_environment:{hdr:false,maxScale:2}} as Record<string,unknown>)[name]??null);
        const f=gameFixture();f.host.setSession({generation:1,enabled:true});await flush();
        f.host.presented();await flush();
        expect(calls('frost_activate')).toHaveLength(1);
        const keyboard=f.openKeyboard();await vi.advanceTimersByTimeAsync(250);await flush();
        const update=calls('frost_update').at(-1)!;
        expect((update[3] as {regions:{keyboard:{x:number;width:number}}}).regions.keyboard).toMatchObject({x:.5,width:.2});
        keyboard.remove();await vi.advanceTimersByTimeAsync(250);await flush();
        expect((calls('frost_update').at(-1)![3] as {regions:{keyboard:{width:number}}}).regions.keyboard.width).toBe(0);
        expect(calls('frost_cancel')).toEqual([]);expect(calls('frost_release')).toEqual([]);
        expect(calls('frost_prepare')).toHaveLength(1);expect(calls('frost_activate')).toHaveLength(1);
        f.host.dispose();await flush();expect(calls('frost_release')).toHaveLength(1);
        vi.useRealTimers();
    });
    it('restores identical geometry after a temporary context error clears frost',async()=>{
        vi.useFakeTimers();let fail=false;
        rpc.mockImplementation(async name=>({frost_prepare:{status:'ready',key:'key'},frost_activate:{status:'active',token:'token'},frost_update:true,frost_renew:true,frost_environment:{hdr:false,maxScale:2}} as Record<string,unknown>)[name]??null);
        const f=gameFixture(()=>fail);try{
            f.host.setSession({generation:1,enabled:true});await flush();f.host.presented();await flush();expect(f.measured).toHaveLength(1);
            fail=true;await vi.advanceTimersByTimeAsync(250);await flush();expect(calls('frost_release')).toHaveLength(1);
            fail=false;await vi.advanceTimersByTimeAsync(250);await flush();expect(f.measured).toHaveLength(2);expect(calls('frost_prepare')).toHaveLength(2);
        }finally{f.host.dispose();vi.useRealTimers();}
    });

});

