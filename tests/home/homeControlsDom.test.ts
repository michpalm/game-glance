import {describe,it,expect,vi} from 'vitest';
import {nativeFooterFixture} from './fixtures/home-controls-native';
import {discoverNativeFooter,acquireHomeFooter} from '../../src/home/homeControlsDom';
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
describe('Home footer ownership',()=>{
 it.each([false,true])('recognises original prompt structure independent of glyph family (%s)',svg=>{const f=nativeFooterFixture(svg,['Menú','Seleccionar','Atrás']);expect(discoverNativeFooter(f.root)).toMatchObject({footer:f.footer,wrapper:f.wrapper,groups:f.groups,spacer:f.spacer});});
 it('rejects missing, ambiguous or malformed structures',()=>{const f=nativeFooterFixture();f.spacer.remove();expect(discoverNativeFooter(f.root)).toBeNull();f.footer.remove();expect(discoverNativeFooter(f.root)).toBeNull();});
 it('keeps unsupported geometry unavailable when the same footer rebinds',async()=>{const f=nativeFooterFixture(),ready=vi.fn();f.footer.getBoundingClientRect=()=>({width:10,height:40,bottom:600} as DOMRect);const lease=acquireHomeFooter(f.root,ready);expect(ready).toHaveBeenLastCalledWith(false);f.groups[0].lastElementChild!.textContent='Long localized menu';f.footer.parentNode!.appendChild(f.footer);await settle();expect(ready.mock.calls.map(c=>c[0])).toEqual([false]);expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);lease.dispose();});
 it('marks original nodes without replacing descendants or handlers, then restores exactly',()=>{const f=nativeFooterFixture(),ready=vi.fn(),click=vi.fn();f.groups[0].addEventListener('click',click);const glyph=f.groups[0].firstElementChild!.firstElementChild;f.footer.setAttribute('data-gh-footer','prior');const lease=acquireHomeFooter(f.root,ready);
  expect(ready).toHaveBeenLastCalledWith(true);expect(f.footer.getAttribute('data-gh-footer')).toBe('true');expect(f.groups[0].getAttribute('data-gh-footer-side')).toBe('start');expect(f.groups[1].getAttribute('data-gh-footer-edge')).toBe('first');expect(f.groups[2].getAttribute('data-gh-footer-edge')).toBe('last');expect(f.groups[0].firstElementChild!.firstElementChild).toBe(glyph);f.groups[0].click();expect(click).toHaveBeenCalledOnce();lease.dispose();lease.dispose();expect(f.footer.getAttribute('data-gh-footer')).toBe('prior');expect(f.groups[0].hasAttribute('data-gh-footer-side')).toBe(false);
 });
 it('restores on suspend and reclaims on resume without repeated notifications',async()=>{const f=nativeFooterFixture(),ready=vi.fn(),lease=acquireHomeFooter(f.root,ready);await settle();expect(ready).toHaveBeenCalledOnce();lease.suspend(true);expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);lease.suspend(false);expect(f.footer.getAttribute('data-gh-footer')).toBe('true');await settle();expect(ready.mock.calls.map(c=>c[0])).toEqual([true,false,true]);lease.dispose();});
 it('rebinds after native footer replacement and releases old markers',async()=>{const f=nativeFooterFixture(),lease=acquireHomeFooter(f.root,()=>{}),replacement=f.footer.cloneNode(true) as HTMLElement;replacement.removeAttribute('data-gh-footer');replacement.querySelectorAll('[data-gh-footer-side]').forEach(e=>{e.removeAttribute('data-gh-footer-side');e.removeAttribute('data-gh-footer-edge');});replacement.getBoundingClientRect=f.footer.getBoundingClientRect;f.footer.replaceWith(replacement);await settle();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);expect(replacement.getAttribute('data-gh-footer')).toBe('true');lease.dispose();expect(replacement.hasAttribute('data-gh-footer')).toBe(false);});
 it('releases removed groups and keeps markers until the last lease releases',async()=>{const f=nativeFooterFixture(),a=acquireHomeFooter(f.root,()=>{}),b=acquireHomeFooter(f.root,()=>{});a.dispose();expect(f.footer.getAttribute('data-gh-footer')).toBe('true');const removed=f.groups[2];removed.remove();await settle();expect(removed.hasAttribute('data-gh-footer-side')).toBe(false);b.dispose();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);});
});
it('recovers from temporarily unavailable startup geometry without a DOM remount',async()=>{const f=nativeFooterFixture(),ready=vi.fn();const rect=f.footer.getBoundingClientRect;let shown=false,notify=()=>{};const previous=(f.window as any).ResizeObserver;(f.window as any).ResizeObserver=class{constructor(fn:()=>void){notify=fn;}observe(){}unobserve(){}disconnect(){}};f.footer.getBoundingClientRect=()=>shown?rect():({width:1000,height:0,bottom:600} as DOMRect);const lease=acquireHomeFooter(f.root,ready);expect(ready).toHaveBeenLastCalledWith(false);shown=true;notify();await settle();expect(ready).toHaveBeenLastCalledWith(true);expect(f.footer.getAttribute('data-gh-footer')).toBe('true');lease.dispose();(f.window as any).ResizeObserver=previous;});

it('rechecks transient startup placement on the next layout frame without a resize',async()=>{
 const f=nativeFooterFixture(),ready=vi.fn();let bottom=590,frame:(()=>void)|undefined;
 const previous=(f.window as any).requestAnimationFrame,previousCancel=(f.window as any).cancelAnimationFrame;
 (f.window as any).requestAnimationFrame=(fn:()=>void)=>{frame=fn;return 1;};(f.window as any).cancelAnimationFrame=()=>{frame=undefined;};
 const rect=f.root.getBoundingClientRect;f.root.getBoundingClientRect=()=>({...rect(),bottom});
 const lease=acquireHomeFooter(f.root,ready);expect(ready).toHaveBeenLastCalledWith(false);
 bottom=600;expect(discoverNativeFooter(f.root)).not.toBeNull();
 frame?.();await settle();expect(ready).toHaveBeenLastCalledWith(true);expect(f.footer.getAttribute('data-gh-footer')).toBe('true');
 lease.dispose();(f.window as any).requestAnimationFrame=previous;(f.window as any).cancelAnimationFrame=previousCancel;
});
it.each(['transitionend','animationend','transitioncancel','animationcancel'])('recovers when native startup placement settles via %s without changing size',async type=>{
 const f=nativeFooterFixture(),ready=vi.fn();let bottom=590;const rect=f.root.getBoundingClientRect;
 f.root.getBoundingClientRect=()=>({...rect(),bottom});const lease=acquireHomeFooter(f.root,ready);
 expect(ready).toHaveBeenLastCalledWith(false);bottom=600;
 f.document.body.dispatchEvent(new f.window.Event(type,{bubbles:true}));await settle();
 expect(ready).toHaveBeenLastCalledWith(true);expect(f.footer.getAttribute('data-gh-footer')).toBe('true');lease.dispose();
});
it('does not reacquire after disposal when a late native transition completes',async()=>{
 const f=nativeFooterFixture(),ready=vi.fn();const lease=acquireHomeFooter(f.root,ready);lease.dispose();const calls=ready.mock.calls.length;
 f.document.body.dispatchEvent(new f.window.Event('transitionend',{bubbles:true}));await settle();
 expect(ready).toHaveBeenCalledTimes(calls);expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);
});

it('ignores settling while suspended, retries on resume, and cancels a pending startup frame on disposal',async()=>{
 const f=nativeFooterFixture(),ready=vi.fn();let bottom=590,frame:(()=>void)|undefined;
 const oldFrame=(f.window as any).requestAnimationFrame,oldCancel=(f.window as any).cancelAnimationFrame;
 (f.window as any).requestAnimationFrame=(fn:()=>void)=>{frame=fn;return 1;};(f.window as any).cancelAnimationFrame=()=>{frame=undefined;};
 try{
  const rect=f.root.getBoundingClientRect;f.root.getBoundingClientRect=()=>({...rect(),bottom});
  const lease=acquireHomeFooter(f.root,ready);const late=frame;lease.suspend(true);bottom=600;
  f.document.body.dispatchEvent(new f.window.Event('transitionend',{bubbles:true}));await settle();
  expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);expect(ready).toHaveBeenLastCalledWith(false);
  bottom=590;lease.suspend(false);bottom=600;frame?.();await settle();expect(ready).toHaveBeenLastCalledWith(true);
  lease.dispose();const other=acquireHomeFooter(f.root,ready);other.dispose();late?.();await settle();expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);
  bottom=590;const pending=acquireHomeFooter(f.root,ready),queued=frame;pending.dispose();const count=ready.mock.calls.length;bottom=600;queued?.();await settle();
  expect(ready).toHaveBeenCalledTimes(count);expect(f.footer.hasAttribute('data-gh-footer')).toBe(false);
 }finally{(f.window as any).requestAnimationFrame=oldFrame;(f.window as any).cancelAnimationFrame=oldCancel;}
});
