import { describe, expect, it } from 'vitest';
import { nativeFooterFixture } from '../home/fixtures/home-controls-native';
import { acquireHomeFooter } from '../../src/home/homeControlsDom';
import { homeFooterCss } from '../../src/home/homeControlsCss';
import { installCalmFilter } from '../../src/styles/tokens';
import { holdPageFooter, pageFooterCanRestore } from '../../src/menu/pageFooter';
const flush = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };
function fixture() {
    const f=nativeFooterFixture(),doc=f.document as unknown as Document,win=f.window as any;
    Object.defineProperty(doc.documentElement,'clientWidth',{value:1000,configurable:true});
    Object.defineProperty(doc.documentElement,'clientHeight',{value:600,configurable:true});
    win.getComputedStyle=(e:HTMLElement)=>({flexGrow:e.style.flexGrow||'0',display:e.style.display||'block',visibility:e.style.visibility||'visible',opacity:e.style.opacity||'1'});
    let state={foreground:false,menu:true};const listeners=new Set<()=>void>();
    const ui={get:()=>state,subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}};
    return {...f,doc,ui,listeners,setState(next:typeof state){state=next;for(const fn of [...listeners])fn();},sheet:()=>doc.querySelector('[data-gg-menu-page-footer]')};
}
describe('custom menu footer appearance',()=>{
    it.each([false,true])('retains the opted-in appearance even if source already suspended (%s)', suspended=>{
        const f=fixture(),source=acquireHomeFooter(f.root,()=>{});if(suspended)source.suspend(true);
        const hold=holdPageFooter(f.doc,{restyle:true,ui:f.ui})!;source.suspend(true);
        expect(hold).not.toBeNull();expect(f.footer.getAttribute('data-gh-footer')).toBe('true');
        expect(f.sheet()?.textContent).toBe(homeFooterCss);expect(f.doc.querySelectorAll('#gg-calm')).toHaveLength(1);
        expect(f.groups[1].getAttribute('role')).toBeNull();expect(f.groups[1].getAttribute('tabindex')).toBeNull();
        hold.dispose();hold.dispose();source.dispose();
        expect(f.sheet()).toBeNull();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);expect(f.doc.querySelector('#gg-calm')).toBeNull();
    });
    it('hands back only after source ownership AND its stylesheet are restored',async()=>{
        const f=fixture(),source=acquireHomeFooter(f.root,()=>{}),hold=holdPageFooter(f.doc,{restyle:true,ui:f.ui})!;
        source.suspend(true);hold.handoff();expect(f.listeners.size).toBe(1);
        f.setState({foreground:true,menu:false});expect(f.sheet()).not.toBeNull();
        source.suspend(false);await flush();expect(f.sheet()).not.toBeNull();
        const filter=installCalmFilter(f.doc),sheet=f.doc.createElement('style');sheet.textContent=homeFooterCss;f.doc.head.append(sheet);await flush();
        expect(f.sheet()).toBeNull();expect(f.listeners.size).toBe(0);expect(f.footer.getAttribute('data-gh-footer')).toBe('true');
        expect(f.doc.querySelectorAll('#gg-calm')).toHaveLength(1);
        hold.dispose();source.dispose();filter();sheet.remove();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);
    });
    it('cleans immediately on native handoff, failure or disposal even while awaiting source focus',()=>{
        const f=fixture(),hold=holdPageFooter(f.doc,{restyle:true,ui:f.ui})!;hold.handoff();hold.dispose();hold.dispose();
        expect(f.listeners.size).toBe(0);expect(f.sheet()).toBeNull();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);expect(f.doc.querySelector('#gg-calm')).toBeNull();
    });
    it('releases a pending ordinary-close hold if its original page is gone',()=>{
        const f=fixture();let present=true;const hold=holdPageFooter(f.doc,{restyle:true,canRestore:()=>present,ui:f.ui})!;
        hold.handoff();present=false;f.setState({foreground:true,menu:false});expect(f.sheet()).toBeNull();expect(f.listeners.size).toBe(0);
    });
    it.each(['hidden','inert','aria-hidden','visibility'] as const)('releases when source becomes %s while waiting for handoff',async kind=>{
        const f=fixture();f.root.className='gh-root';f.root.getClientRects=()=>[f.root.getBoundingClientRect()] as unknown as DOMRectList;
        const hold=holdPageFooter(f.doc,{restyle:true,canRestore:()=>pageFooterCanRestore(f.doc),ui:f.ui})!;
        expect(pageFooterCanRestore(f.doc)).toBe(true);hold.handoff();
        if(kind==='visibility')f.root.style.visibility='hidden';else f.root.setAttribute(kind,kind==='aria-hidden'?'true':'');
        await flush();expect(pageFooterCanRestore(f.doc)).toBe(false);expect(f.sheet()).toBeNull();expect(f.listeners.size).toBe(0);
    });
    it('preserves an eligible native footer without restyling it when expansion is off',()=>{
        const f=fixture(),hold=holdPageFooter(f.doc,{restyle:false,ui:f.ui});expect(hold).not.toBeNull();
        expect(f.sheet()).toBeNull();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);expect(f.doc.querySelector('#gg-calm')).toBeNull();hold!.handoff();hold!.dispose();
    });
    it('does not create or reveal an absent or already-hidden footer',()=>{
        const f=fixture();f.footer.style.visibility='hidden';expect(holdPageFooter(f.doc,{restyle:true,ui:f.ui})).toBeNull();
        f.footer.style.visibility='visible';f.footer.style.opacity='0';expect(holdPageFooter(f.doc,{restyle:true,ui:f.ui})).toBeNull();
        f.footer.remove();expect(holdPageFooter(f.doc,{restyle:true,ui:f.ui})).toBeNull();expect(f.sheet()).toBeNull();
    });
});
