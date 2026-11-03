import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {parseHTML} from 'linkedom';
import {settings} from '../../src/data/settings';
import {chromeClaims} from '../../src/chrome/claims';
import {useChrome} from '../../src/chrome/useChrome';
import {ChromeHost} from '../../src/chrome/ChromeHost';
vi.unmock('react-dom');
const steam=vi.hoisted(()=>({ui:{foreground:true,menu:false,nativeHeaderFocused:false,account:null as string|null},listeners:new Set<()=>void>(),screensaver:false}));
vi.mock('@decky/ui',async()=>({...await import('@decky/ui/dist/components/FooterLegend.js'),Focusable:()=>null,DialogButton:'button',findModule:()=>{},findModuleExport:()=>null}));
vi.mock('../../src/home/steamUiState',()=>({
 getSteamUiState:()=>steam.ui,
 subscribeSteamUiState:(_doc:Document,fn:()=>void)=>{steam.listeners.add(fn);return()=>{steam.listeners.delete(fn);};},
 useSteamUiState:()=>steam.ui,
}));
vi.mock('../../src/screensaver/steamScreensaver',()=>({useScreensaverActive:()=>steam.screensaver}));
vi.mock('../../src/components/GameStatusBar',()=>({GameStatusBar:()=>null}));
vi.mock('../../src/home/HomeSearchControl',()=>({HomeSearch:()=>null}));
const FOOTER='<div><div><span><svg></svg></span><span>Menu</span></div><div style="flex-grow:1"></div><div><span><svg></svg></span><span>Select</span></div><div><span><svg></svg></span><span>Back</span></div></div>';
let root:Root,win:any,doc:Document,footer:HTMLElement,header:HTMLElement,view={width:828,height:466},watchers:MutationCallback[]=[];
const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top}) as DOMRect;
const releases:(()=>void)[]=[];
const claim=(value:Partial<Parameters<typeof chromeClaims.claim>[0]>={})=>{const handle=chromeClaims.claim({page:'home',statusHidden:false,launching:false,...value});releases.push(handle.release);return handle;};
/** #Footer as on the Ally (Menu | spacer | Select, Back) and Steam's top bar (avatar holder in a full-width strip). */
beforeEach(async()=>{
 const page=parseHTML(`<html><body><header><span class="avatarHolder"></span><input type="search"></header><div id="app"></div><button id="card"></button><div id="Footer">${FOOTER}</div></body></html>`);
 win=page.window;doc=page.document as unknown as Document;vi.stubGlobal('window',win);vi.stubGlobal('document',doc);vi.stubGlobal('HTMLElement',win.HTMLElement);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 view={width:828,height:466};
 Object.defineProperty(doc.documentElement,'clientWidth',{get:()=>view.width,configurable:true});Object.defineProperty(doc.documentElement,'clientHeight',{get:()=>view.height,configurable:true});
 Object.defineProperty(win,'innerWidth',{get:()=>view.width,configurable:true});Object.defineProperty(win,'innerHeight',{get:()=>view.height,configurable:true});
 doc.hasFocus=()=>true;win.getComputedStyle=(e:any)=>({flexGrow:e.style?.flexGrow||'0',display:'block',visibility:'visible'});
 win.requestAnimationFrame=(fn:any)=>setTimeout(fn,0);win.cancelAnimationFrame=clearTimeout;
 // linkedom's MutationObserver never fires: keep the callbacks to feed records by hand. Its window is a proxy with
 // read-only globals, so the document's view is a stand-in over it (as in headerRedirect.test).
 watchers=[];const view$=Object.create(win,{MutationObserver:{value:class{constructor(fn:MutationCallback){watchers.push(fn);}observe(){}disconnect(){}}}});
 Object.defineProperty(doc,'defaultView',{configurable:true,value:view$});
 footer=doc.getElementById('Footer')! as HTMLElement;footer.getBoundingClientRect=()=>rect(0,view.height-42,view.width,42);
 header=doc.querySelector('header')! as HTMLElement;header.getBoundingClientRect=()=>rect(0,0,view.width,40);
 steam.ui={foreground:true,menu:false,nativeHeaderFocused:false,account:null};steam.screensaver=false;
 await settings.setEnabled(true);await settings.setSpotlightHome(true);await settings.setHomeStatusBar(true);await settings.setHomeExpandedControls(true);await settings.setChromeEveryPage(false);
 root=createRoot(doc.getElementById('app')! as unknown as HTMLElement);
});
afterEach(async()=>{await act(()=>root.unmount());await act(()=>{releases.splice(0).forEach(fn=>fn());});vi.unstubAllGlobals();});
let chrome:ReturnType<typeof useChrome>;
function Probe(){chrome=useChrome(doc);return null;}
const show=()=>act(()=>root.render(createElement(Probe)));
const marked=()=>footer.getAttribute('data-gh-footer')==='true'&&header.getAttribute('data-gh-header')==='true';
const anyMarks=()=>[...doc.querySelectorAll('*')].some(node=>[...node.attributes].some(attr=>attr.name.startsWith('data-gh-')));
const everyPage=(value:boolean)=>act(()=>settings.setChromeEveryPage(value));
describe('useChrome',()=>{
 it('takes the footer and header on any page when On every page is on',async()=>{
  await everyPage(true);await show();
  expect(marked()).toBe(true);expect(chrome.footer).toBe(true);expect(chrome.mode).toBe('active');expect(chrome.controls).toBeDefined();
 });
 it('only with a Home or game claim when it is off',async()=>{
  await show();
  expect(anyMarks()).toBe(false);expect(chrome.mode).toBe('off');expect(chrome.footer).toBe(false);
  await act(()=>{claim({page:'home'});});
  expect(marked()).toBe(true);expect(chrome.mode).toBe('active');
 });
 it('keeps them across a route change: no release, no re-acquire',async()=>{
  await everyPage(true);const home=claim({page:'home'});await show();expect(marked()).toBe(true);
  const removed=[vi.spyOn(footer,'removeAttribute'),vi.spyOn(header,'removeAttribute')],set=vi.spyOn(footer,'setAttribute');
  await act(()=>{home.release();});
  expect(marked()).toBe(true);
  for(const spy of removed)expect(spy).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
 });
 it('re-marks a remounted footer before paint',async()=>{
  await everyPage(true);await show();expect(marked()).toBe(true);
  const fresh=doc.createElement('div');fresh.id='Footer';fresh.innerHTML=FOOTER;fresh.getBoundingClientRect=()=>rect(0,view.height-42,view.width,42);
  footer.replaceWith(fresh);
  watchers.forEach(fn=>fn([{type:'childList',target:doc.body,addedNodes:[fresh],removedNodes:[footer]} as any],{} as any));
  await Promise.resolve();
  expect(fresh.getAttribute('data-gh-footer')).toBe('true');expect(fresh.querySelectorAll('[data-gh-footer-side]').length).toBe(3);
 });
 it('steps aside with a side menu open and comes back',async()=>{
  await everyPage(true);await show();expect(marked()).toBe(true);
  await act(()=>{steam.ui={...steam.ui,menu:true};steam.listeners.forEach(fn=>fn());});
  expect(anyMarks()).toBe(false);expect(chrome.mode).toBe('suspended');expect(chrome.footer).toBe(false);expect(chrome.controls).toBeUndefined();
  await act(()=>{steam.ui={...steam.ui,menu:false};steam.listeners.forEach(fn=>fn());});
  expect(marked()).toBe(true);expect(chrome.mode).toBe('active');
 });
 it('steps aside while Steam’s screensaver is on',async()=>{
  await everyPage(true);steam.screensaver=true;await show();
  expect(anyMarks()).toBe(false);expect(chrome.mode).toBe('suspended');
  steam.screensaver=false;await show();expect(marked()).toBe(true);
 });
 it('gives everything back on unmount and when the toggle goes off',async()=>{
  const css=()=>[...doc.querySelectorAll('style')].some(style=>style.textContent?.includes('[data-gh-header=true]'));
  await everyPage(true);await act(()=>root.render(createElement(ChromeHost)));
  expect(marked()).toBe(true);expect(css()).toBe(true);
  await everyPage(false);
  expect(anyMarks()).toBe(false);expect(css()).toBe(false);
  await everyPage(true);expect(marked()).toBe(true);
  await act(()=>root.render(createElement('div')));
  expect(anyMarks()).toBe(false);expect(css()).toBe(false);
 });
 it('hides our bar while Home’s feed sheet covers it',async()=>{
  await act(()=>{claim({page:'home',statusHidden:true});});await show();
  expect(chrome.statusHidden).toBe(true);expect(chrome.controls).toBeUndefined();expect(chrome.ownsInput()).toBe(false);expect(marked()).toBe(true);
 });
 it('enters Search from Steam’s header and Down/B goes back where focus came from (Home’s target when it is gone)',async()=>{
  const {GamepadButton:B}=await import('@decky/ui/dist/components/FooterLegend.js');
  const returnHome=vi.fn();claim({page:'home',returnHome});await show();
  const card=doc.getElementById('card') as HTMLElement,input=header.querySelector('input')!;
  const enter=async()=>act(()=>{input.dispatchEvent(Object.assign(new win.Event('focusin',{bubbles:true}),{relatedTarget:card}));});
  await enter();expect(chrome.search.get().phase).toBe('top');
  const cell=doc.createElement('button');doc.body.append(cell);chrome.controls!.register('clock',cell);
  const back=()=>chrome.controls!.button('clock',{detail:{button:B.CANCEL,is_repeat:false},preventDefault(){},stopPropagation(){}} as any);
  const focus=vi.spyOn(card,'focus');back();expect(focus).toHaveBeenCalledTimes(1);expect(returnHome).not.toHaveBeenCalled();expect(chrome.search.get().phase).toBe('hidden');
  await enter();card.remove();back();expect(returnHome).toHaveBeenCalledTimes(1);
 });
});
