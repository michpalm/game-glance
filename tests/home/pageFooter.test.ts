import {act,createElement,useRef} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {parseHTML} from 'linkedom';
import {settings} from '../../src/data/settings';
import {discoverNativeFooter} from '../../src/home/homeControlsDom';
import {chromeClaims,type ChromeClaim} from '../../src/chrome/claims';
import {chromeReturn} from '../../src/chrome/policy';
import {ChromeHost} from '../../src/chrome/ChromeHost';
import {useChromeClaim,usePageShown} from '../../src/chrome/useChromeClaim';
import {useChromeHeld} from '../../src/chrome/useChrome';
import {GameStatusBar} from '../../src/components/GameStatusBar';
import {useHomeClaim} from '../../src/home/useHomeClaim';
import {clearLaunch,LAUNCH_INTENT_MS,launchPending,markLaunch} from '../../src/data/launchIntent';
vi.unmock('react-dom');
const steam=vi.hoisted(()=>({ui:{foreground:true,menu:false,nativeHeaderFocused:false,account:null as string|null},listeners:new Set<()=>void>()}));
vi.mock('@decky/ui',async()=>({...await import('@decky/ui/dist/components/FooterLegend.js'),Focusable:()=>null,DialogButton:'button',findModule:()=>{},findModuleExport:()=>null}));
vi.mock('../../src/home/steamUiState',()=>({
 getSteamUiState:()=>steam.ui,
 subscribeSteamUiState:(_doc:Document,fn:()=>void)=>{steam.listeners.add(fn);return()=>{steam.listeners.delete(fn);};},
 useSteamUiState:()=>steam.ui,
}));
vi.mock('../../src/screensaver/steamScreensaver',()=>({useScreensaverActive:()=>false}));
vi.mock('../../src/components/GameStatusBar',async()=>{const {createElement:h}=await import('react');return {GameStatusBar:()=>h('div',{'data-test-bar':''})};});
vi.mock('../../src/home/HomeSearchControl',()=>({HomeSearch:()=>null}));
let root:Root,win:any,doc:Document,footer:HTMLElement,view={width:828,height:466};
const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top}) as DOMRect;
/** The game page's #Footer as read on the Ally (Menu group, one flex-grow spacer, Select and Back) and Steam's top bar. */
beforeEach(async()=>{
 const page=parseHTML('<html><body><header><span class="avatarHolder"></span><input type="search"></header><div id="app"></div><div id="Footer"><div><div><span><svg></svg></span><span>Menu</span></div><div style="flex-grow:1"></div><div><span><svg></svg></span><span>Select</span></div><div><span><svg></svg></span><span>Back</span></div></div></div></body></html>');
 win=page.window;doc=page.document as unknown as Document;vi.stubGlobal('window',win);vi.stubGlobal('document',doc);vi.stubGlobal('HTMLElement',win.HTMLElement);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 view={width:828,height:466};
 Object.defineProperty(doc.documentElement,'clientWidth',{get:()=>view.width,configurable:true});Object.defineProperty(doc.documentElement,'clientHeight',{get:()=>view.height,configurable:true});
 Object.defineProperty(win,'innerWidth',{get:()=>view.width,configurable:true});Object.defineProperty(win,'innerHeight',{get:()=>view.height,configurable:true});
 doc.hasFocus=()=>true;win.getComputedStyle=(e:any)=>({flexGrow:e.style?.flexGrow||'0',display:'block',visibility:'visible'});
 win.requestAnimationFrame=(fn:any)=>setTimeout(fn,0);win.cancelAnimationFrame=clearTimeout;
 footer=doc.getElementById('Footer')! as HTMLElement;footer.getBoundingClientRect=()=>rect(0,view.height-42,view.width,42);
 (doc.querySelector('header') as HTMLElement).getBoundingClientRect=()=>rect(0,0,view.width,40);
 await settings.setEnabled(true);await settings.setSpotlightHome(true);await settings.setHomeStatusBar(true);await settings.setHomeExpandedControls(true);await settings.setChromeEveryPage(false);
 root=createRoot(doc.getElementById('app')! as unknown as HTMLElement);
});
afterEach(async()=>{await act(()=>root.unmount());vi.unstubAllGlobals();});
const claims=()=>chromeClaims.get();
const marked=()=>footer.getAttribute('data-gh-footer')==='true';
describe('the game page footer',()=>{
 it('measures the page against the viewport: Ally handheld 828×42 at 466 of 466, docked 1500×41.75, not when lifted',()=>{
  expect(discoverNativeFooter(doc.documentElement)).not.toBeNull();
  view={width:1500,height:844};footer.getBoundingClientRect=()=>rect(0,844-41.75,1500,41.75);expect(discoverNativeFooter(doc.documentElement)).not.toBeNull();
  footer.getBoundingClientRect=()=>rect(0,600,1500,41.75);expect(discoverNativeFooter(doc.documentElement)).toBeNull();
 });
});
describe('Home and the game page claim the chrome host',()=>{
 let ownBar=false;
 /** Home's wiring (SpotlightHome): its action row (Play, Info), the recents row, the feed sheet state and the launch check. */
 /** `launching` unset: Home's real check (SpotlightHome), Steam's launch intent for the focused game (7). `content`: Home's content is up. */
 function Home({sheetUp=false,launching,content=true}:{sheetUp?:boolean;launching?:boolean;content?:boolean}){
  const rootRef=useRef<HTMLElement|null>(null),lastAction=useRef<HTMLElement|null>(null),recents=useRef<HTMLElement|null>(null);
  ownBar=useHomeClaim({root:rootRef,lastAction,recents,statusHidden:sheetUp,launching:()=>launching??launchPending(7)}).ownBar;
  return createElement('main',{ref:rootRef},content&&createElement('div',{className:'gh-actions'},createElement('button',{id:'play',className:'gh-btn'}),createElement('button',{id:'info',className:'gh-btn'})),content&&createElement('div',{id:'recents',ref:recents,tabIndex:0}));
 }
 function Page({claim}:{claim:ChromeClaim|null}){useChromeClaim(claim);return null;}
 it('Home claims while mounted, with its feed sheet state and return target',async()=>{
  await act(()=>root.render(createElement(Home)));
  expect(claims()).toHaveLength(1);expect(claims()[0]).toMatchObject({page:'home',statusHidden:false,launching:false});
  await act(()=>root.render(createElement(Home,{sheetUp:true})));
  expect(claims()).toHaveLength(1);expect(claims()[0].statusHidden).toBe(true);
  await act(()=>root.render(createElement(Home,{launching:true})));
  expect(claims()[0]).toMatchObject({statusHidden:false,launching:true});
  // Down/B's last resort in the host: Home's own target, Play first, then the recents row.
  const play=doc.getElementById('play') as HTMLElement,recents=doc.getElementById('recents') as HTMLElement;
  const toPlay=vi.spyOn(play,'focus'),toRecents=vi.spyOn(recents,'focus');
  chromeReturn(claims())!();expect(toPlay).toHaveBeenCalledTimes(1);
  doc.querySelector('.gh-actions')!.remove();chromeReturn(claims())!();expect(toRecents).toHaveBeenCalledTimes(1);
  await act(()=>root.render(createElement('div')));
  expect(claims()).toHaveLength(0);
 });
 it('Home sees a launch marked without a re-render of its own (Play runs the game straight away)',async()=>{
  clearLaunch();await act(()=>root.render(createElement(Home)));expect(claims()[0].launching).toBe(false);
  await act(()=>{markLaunch(7);});
  expect(claims()[0].launching).toBe(true);
  await act(()=>{clearLaunch();});expect(claims()[0].launching).toBe(false);
 });
 it('a second Play inside the launch window re-arms the expiry, so the claim lets go once the last mark runs out',async()=>{
  vi.useFakeTimers();
  try{
   clearLaunch();await act(()=>root.render(createElement(Home)));
   await act(()=>{markLaunch(7);});expect(claims()[0].launching).toBe(true);
   await act(()=>{vi.advanceTimersByTime(LAUNCH_INTENT_MS/2);markLaunch(7);});
   await act(()=>{vi.advanceTimersByTime(LAUNCH_INTENT_MS/2+1);});expect(claims()[0].launching).toBe(true);
   await act(()=>{vi.advanceTimersByTime(LAUNCH_INTENT_MS/2);});expect(claims()[0].launching).toBe(false);
  }finally{clearLaunch();vi.useRealTimers();}
 });
 it('Home lets go while it is not rendered and claims again when shown',async()=>{
  const seen:(()=>void)[]=[],notify=()=>seen.forEach(fn=>fn());const previous=win.ResizeObserver;win.ResizeObserver=class{constructor(fn:()=>void){seen.push(fn);}observe(){}unobserve(){}disconnect(){}};
  try{
   await act(()=>root.render(createElement(Home)));expect(claims()).toHaveLength(1);
   const main=doc.querySelector('main')!;
   main.setAttribute('aria-hidden','true');await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(0);
   main.removeAttribute('aria-hidden');await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(1);
   (main as any).getClientRects=()=>[];await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(0);
  }finally{win.ResizeObserver=previous;}
 });
 it('cold start: our footer at once, before Home’s content is up',async()=>{
  await act(()=>root.render(createElement('div',null,createElement(ChromeHost),createElement(Home,{content:false}))));
  expect(claims()).toEqual([expect.objectContaining({page:'home'})]);expect(marked()).toBe(true);
 });
 it('Home re-renders with an unchanged claim without publishing again',async()=>{
  await act(()=>root.render(createElement(Home)));
  const seen=vi.fn(),stop=chromeClaims.subscribe(seen);
  await act(()=>root.render(createElement(Home)));
  expect(seen).not.toHaveBeenCalled();stop();
 });
 it('the game page claims while mounted and releases on unmount',async()=>{
  await act(()=>root.render(createElement(Page,{claim:{page:'game',statusHidden:false,launching:false}})));
  expect(claims()).toEqual([expect.objectContaining({page:'game',statusHidden:false,launching:false})]);
  await act(()=>root.render(createElement(Page,{claim:{page:'game',statusHidden:false,launching:true}})));
  expect(claims()).toEqual([expect.objectContaining({page:'game',launching:true})]);
  await act(()=>root.render(createElement(Page,{claim:null})));
  expect(claims()).toHaveLength(0);
  await act(()=>root.render(createElement(Page,{claim:{page:'game',statusHidden:false,launching:false}})));
  expect(claims()).toHaveLength(1);
  await act(()=>root.render(createElement('div')));
  expect(claims()).toHaveLength(0);
 });
 it('the game page lets go while it is not rendered and claims again when shown',async()=>{
  const seen:(()=>void)[]=[],notify=()=>seen.forEach(fn=>fn());const previous=win.ResizeObserver;win.ResizeObserver=class{constructor(fn:()=>void){seen.push(fn);}observe(){}unobserve(){}disconnect(){}};
  // GameHero's wiring: the claim only while the page's hero is rendered.
  function GamePage(){const ref=useRef<HTMLDivElement|null>(null),shown=usePageShown(ref,1);useChromeClaim(shown?{page:'game',statusHidden:false,launching:false}:null);return createElement('div',{ref,className:'gg-hero'});}
  await act(()=>root.render(createElement(GamePage)));expect(claims()).toHaveLength(1);
  const node=doc.querySelector('.gg-hero') as any;let rendered=false;node.getClientRects=()=>rendered?[rect(0,0,1,1)]:[];
  await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(0);
  rendered=true;await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(1);
  node.setAttribute('aria-hidden','true');await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(0);
  node.removeAttribute('aria-hidden');await act(async()=>{notify();await Promise.resolve();});expect(claims()).toHaveLength(1);
  await act(()=>root.render(createElement('div')));expect(claims()).toHaveLength(0);
  win.ResizeObserver=previous;
 });
 it('the host takes the footer in the same commit Home mounts in, and Home leaves the bar to it',async()=>{
  await act(()=>root.render(createElement('div',null,createElement(ChromeHost),createElement(Home))));
  expect(marked()).toBe(true);expect(ownBar).toBe(false);
  await act(()=>root.render(createElement('div',null,createElement(ChromeHost))));
  expect(claims()).toHaveLength(0);expect(marked()).toBe(false);
 });
 it('Home with the host off still shows its read-only status bar as before',async()=>{
  await act(()=>settings.setHomeExpandedControls(false));
  await act(()=>root.render(createElement('div',null,createElement(ChromeHost),createElement(Home))));
  expect(marked()).toBe(false);expect(ownBar).toBe(true);
  await act(()=>settings.setHomeExpandedControls(true));
  expect(marked()).toBe(true);expect(ownBar).toBe(false);
 });
});
describe('one status bar under the menu',()=>{
 /** Home's gate (SpotlightHome: ownBar) and the game page's (GameHero: !hostBar) beside the real host. */
 function Pages(){
  const rootRef=useRef<HTMLElement|null>(null),a=useRef<HTMLElement|null>(null),b=useRef<HTMLElement|null>(null);
  const {ownBar}=useHomeClaim({root:rootRef,lastAction:a,recents:b,statusHidden:false,launching:()=>false}),hostBar=useChromeHeld();
  return createElement('main',{ref:rootRef},ownBar&&createElement(GameStatusBar),!hostBar&&createElement(GameStatusBar));
 }
 const bars=()=>doc.querySelectorAll('[data-test-bar]').length;
 const menu=(value:boolean)=>act(()=>{steam.ui={...steam.ui,menu:value};steam.listeners.forEach(fn=>fn());});
 it('is the host\'s alone while active and when the side menu opens, and the page\'s only when the host never owned it',async()=>{
  await act(()=>settings.setChromeEveryPage(true));
  await act(()=>root.render(createElement('div',null,createElement(ChromeHost),createElement(Pages))));
  expect(bars()).toBe(1);
  await menu(true);expect(bars()).toBe(1);
  await menu(false);expect(bars()).toBe(1);
  await act(()=>settings.setChromeEveryPage(false));await act(()=>root.render(createElement('div')));
  steam.ui={...steam.ui,menu:true};await act(()=>settings.setChromeEveryPage(true));
  await act(()=>root.render(createElement('div',null,createElement(ChromeHost),createElement(Pages))));
  expect(bars()).toBe(2);
 });
});
