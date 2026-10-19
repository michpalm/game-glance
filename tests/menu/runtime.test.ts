import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverMenuRuntime, registerMenuHost, registerNativeRoutes } from '../../src/menu/steam/runtime';
import { ownMethod } from '../../src/menu/steam/patchOwnership';
const stops:Array<()=>void>=[];
afterEach(()=>{stops.splice(0).reverse().forEach(s=>s());vi.unstubAllGlobals();});
function native(){
    class Menu {
        state=0;tab=4;m_cSuppressRequests=0;
        GetOpenSideMenu(){return this.state;}GetQuickAccessTab(){return this.tab;}
        OpenSideMenu(n:number){if(!this.m_cSuppressRequests)this.state=n;}
        CloseSideMenus(){this.state=0;}
        ToggleSideMenu(n:number){if(this.state===n)this.CloseSideMenus();else this.OpenSideMenu(n);}
        OpenQuickAccessMenu(n:number,open=true){this.tab=n;if(open)this.OpenSideMenu(2);}
    }
    const menu=new Menu();Object.defineProperty(menu,'OpenQuickAccessMenu',{value:menu.OpenQuickAccessMenu.bind(menu),writable:false,configurable:false});
    let keyboardDismissals=0,restoreConfig=false;
    const owner={MenuStore:menu,MainRunningAppID:0,IsAnyVRWindow:()=>false,OnHomeButtonPressed(){keyboardDismissals++;if(restoreConfig)return;menu.ToggleSideMenu(1);},OnQuickAccessButtonPressed(){keyboardDismissals++;menu.ToggleSideMenu(2);}};
    vi.stubGlobal('SteamUIStore',{WindowStore:{GamepadUIMainWindowInstance:owner}});
    stops.push(registerMenuHost(()=>({present:async()=>{},suspend(){},close(){},dispose(){}})));
    return {owner,menu,keyboardDismissals:()=>keyboardDismissals,restoreConfigurator:()=>{restoreConfig=true;}};
}
describe('native menu ownership',()=>{
    it('refuses discovery without a verified host and does not patch during discovery',()=>{
        expect(discoverMenuRuntime()).toBeNull();const n=native(),original=n.owner.OnHomeButtonPressed;
        expect(discoverMenuRuntime()).not.toBeNull();expect(n.owner.OnHomeButtonPressed).toBe(original);
    });
    it('preserves a later foreign patch and makes its own retained wrapper inert',()=>{
        const target={fn:()=>1},original=target.fn;
        const stop=ownMethod(target,'fn',next=>()=>next()+1);const ours=target.fn;const foreign=()=>ours()+10;target.fn=foreign;
        stop();expect(target.fn).toBe(foreign);expect(target.fn()).toBe(11);
        const clean={fn:original};const cleanStop=ownMethod(clean,'fn',next=>()=>next()+2);cleanStop();cleanStop();expect(clean.fn).toBe(original);
    });
    it('captures hardware intent while keeping bound QAM and programmatic opens native',()=>{
        const n=native(),bound=n.menu.OpenQuickAccessMenu,b=discoverMenuRuntime()!;const open=vi.fn();
        stops.push(b.installIntentHandlers({open,closed:vi.fn(),suspended:vi.fn()}));
        n.menu.OpenQuickAccessMenu(5,false);expect(open).not.toHaveBeenCalled();expect(n.menu.state).toBe(0);
        n.menu.OpenQuickAccessMenu(999);expect(open).not.toHaveBeenCalled();expect(n.menu.state).toBe(2);
        n.menu.CloseSideMenus();n.owner.OnHomeButtonPressed();expect(open).toHaveBeenCalledTimes(1);expect(open.mock.calls[0][0]).toBe('home');
        expect(n.menu.OpenQuickAccessMenu).toBe(bound);expect(n.keyboardDismissals()).toBe(1);
    });
    it('preserves original suppression, VR exclusion and configurator-return branches',()=>{
        const n=native(),open=vi.fn();stops.push(discoverMenuRuntime()!.installIntentHandlers({open,closed:vi.fn(),suspended:vi.fn()}));
        n.menu.m_cSuppressRequests=1;n.owner.OnHomeButtonPressed();expect(open).not.toHaveBeenCalled();n.menu.m_cSuppressRequests=0;
        n.owner.IsAnyVRWindow=()=>true;n.owner.OnQuickAccessButtonPressed();expect(open).not.toHaveBeenCalled();
        n.owner.IsAnyVRWindow=()=>false;n.restoreConfigurator();n.owner.OnHomeButtonPressed();expect(open).not.toHaveBeenCalled();expect(n.keyboardDismissals()).toBe(3);
    });
    it('captures a closing native toggle as the next hardware intent without patch recursion',()=>{
        const n=native(),b=discoverMenuRuntime()!,open=vi.fn();stops.push(b.installIntentHandlers({open,closed:vi.fn(),suspended:vi.fn()}));
        b.showMenuHost();expect(n.menu.state).toBe(1);n.owner.OnHomeButtonPressed();
        expect(open).toHaveBeenCalledTimes(1);expect(n.menu.state).toBe(1);
        const replay=open.mock.calls[0][1];replay();expect(n.menu.state).toBe(0);expect(open).toHaveBeenCalledTimes(1);
    });
    it('continues restoring hooks if an external change makes one descriptor unrestoreable',()=>{
        const n=native();n.menu.CloseSideMenus=n.menu.CloseSideMenus.bind(n.menu);const original=n.menu.OpenSideMenu;const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
        const stop=discoverMenuRuntime()!.installIntentHandlers({open:vi.fn(),closed:vi.fn(),suspended:vi.fn()});
        Object.defineProperty(n.menu,'CloseSideMenus',{value:n.menu.CloseSideMenus,writable:false,configurable:false});
        expect(()=>stop()).not.toThrow();expect(n.menu.OpenSideMenu).toBe(original);warning.mockRestore();
    });
    it('keeps bypass active across an asynchronous native action and releases it after errors',async()=>{
        const n=native(),b=discoverMenuRuntime()!,suspended=vi.fn(),open=vi.fn();
        stops.push(b.installIntentHandlers({open,closed:vi.fn(),suspended}));
        stops.push(registerNativeRoutes(async()=>{await Promise.resolve();n.menu.OpenSideMenu(2);throw Error('destination failed');}));
        await expect(b.openNative({kind:'navigate',destination:'profile'})).rejects.toThrow('destination failed');
        expect(suspended).not.toHaveBeenCalled();n.owner.OnHomeButtonPressed();expect(open).toHaveBeenCalledTimes(1);
    });
    it('restores native descriptors after stopping, including partial patch installation failure',()=>{
        const n=native(),original=n.owner.OnHomeButtonPressed,b=discoverMenuRuntime()!;
        const stop=b.installIntentHandlers({open:vi.fn(),closed:vi.fn(),suspended:vi.fn()});stop();stop();expect(n.owner.OnHomeButtonPressed).toBe(original);
        const originalOpen=n.menu.OpenSideMenu;Object.defineProperty(n.owner,'OnQuickAccessButtonPressed',{value:n.owner.OnQuickAccessButtonPressed,writable:false,configurable:false});
        expect(()=>b.installIntentHandlers({open:vi.fn(),closed:vi.fn(),suspended:vi.fn()})).toThrow();
        expect(n.owner.OnHomeButtonPressed).toBe(original);expect(n.menu.OpenSideMenu).toBe(originalOpen);
    });
});
