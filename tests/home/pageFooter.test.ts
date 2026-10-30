import {act,createElement,useRef} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {parseHTML} from 'linkedom';
import {acquireHomeFooter,discoverNativeFooter} from '../../src/home/homeControlsDom';
import {usePageFooter} from '../../src/home/usePageFooter';
import {useHomeControls} from '../../src/home/useHomeControls';
vi.unmock('react-dom');
let root:Root,win:any,doc:Document,footer:HTMLElement,view={width:828,height:466};
const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top}) as DOMRect;
/** The game page's #Footer as read on the Ally: Menu group, one flex-grow spacer, Select and Back; full width at the viewport bottom. */
beforeEach(()=>{
 const page=parseHTML('<html><body><div id="app"></div><div id="Footer"><div><div><span><svg></svg></span><span>Menu</span></div><div style="flex-grow:1"></div><div><span><svg></svg></span><span>Select</span></div><div><span><svg></svg></span><span>Back</span></div></div></div></body></html>');
 win=page.window;doc=page.document as unknown as Document;vi.stubGlobal('window',win);vi.stubGlobal('document',doc);vi.stubGlobal('HTMLElement',win.HTMLElement);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 view={width:828,height:466};
 Object.defineProperty(doc.documentElement,'clientWidth',{get:()=>view.width,configurable:true});Object.defineProperty(doc.documentElement,'clientHeight',{get:()=>view.height,configurable:true});
 Object.defineProperty(win,'innerWidth',{get:()=>view.width,configurable:true});Object.defineProperty(win,'innerHeight',{get:()=>view.height,configurable:true});
 doc.hasFocus=()=>true;win.getComputedStyle=(e:any)=>({flexGrow:e.style?.flexGrow||'0',display:'block',visibility:'visible'});
 win.requestAnimationFrame=(fn:any)=>setTimeout(fn,0);win.cancelAnimationFrame=clearTimeout;
 footer=doc.getElementById('Footer')! as HTMLElement;footer.getBoundingClientRect=()=>rect(0,view.height-42,view.width,42);
 root=createRoot(doc.getElementById('app')! as unknown as HTMLElement);
});
afterEach(async()=>{await act(()=>root.unmount());vi.unstubAllGlobals();});
const marked=()=>footer.getAttribute('data-gh-footer')==='true';
let shown=false;
function Page({enabled,launching=false}:{enabled:boolean;launching?:boolean}){const ref=useRef<HTMLDivElement|null>(null);shown=usePageFooter(ref,enabled,launching);return createElement('div',{ref,className:'gg-hero'});}
describe('game page footer',()=>{
 it('measures the page against the viewport: Ally handheld 828×42 at 466 of 466, docked 1500×41.75, not when lifted',()=>{
  expect(discoverNativeFooter(doc.documentElement)).not.toBeNull();
  view={width:1500,height:844};footer.getBoundingClientRect=()=>rect(0,844-41.75,1500,41.75);expect(discoverNativeFooter(doc.documentElement)).not.toBeNull();
  footer.getBoundingClientRect=()=>rect(0,600,1500,41.75);expect(discoverNativeFooter(doc.documentElement)).toBeNull();
 });
 it('takes the footer while enabled and gives it back on unmount',async()=>{
  await act(()=>root.render(createElement(Page,{enabled:true})));
  expect(marked()).toBe(true);expect(shown).toBe(true);
  expect(footer.querySelector('[data-gh-footer-side=end][data-gh-footer-edge=last]')?.textContent).toBe('Back');
  await act(()=>root.render(createElement('div')));
  expect(footer.hasAttribute('data-gh-footer')).toBe(false);expect(footer.querySelector('[data-gh-footer-side]')).toBeNull();
 });
 it('leaves Steam’s footer alone while not enabled, and while Steam’s launch screen is up',async()=>{
  await act(()=>root.render(createElement(Page,{enabled:false})));expect(marked()).toBe(false);expect(shown).toBe(false);
  await act(()=>root.render(createElement(Page,{enabled:true,launching:true})));expect(marked()).toBe(false);expect(shown).toBe(false);
  await act(()=>root.render(createElement(Page,{enabled:true})));expect(marked()).toBe(true);
  await act(()=>root.render(createElement(Page,{enabled:false})));expect(marked()).toBe(false);
 });
 it('opening: the page takes the footer while Home holds it, so Home letting go keeps every marker',async()=>{
  const home=doc.createElement('main');home.getBoundingClientRect=()=>rect(0,0,view.width,view.height);doc.body.append(home);
  const lease=acquireHomeFooter(home as HTMLElement,()=>{});expect(marked()).toBe(true);
  await act(()=>root.render(createElement(Page,{enabled:true})));
  lease.dispose();expect(marked()).toBe(true);expect(footer.querySelectorAll('[data-gh-footer-side]').length).toBe(3);
  await act(()=>root.render(createElement('div')));expect(marked()).toBe(false);
 });
 it('back: Home takes it again while the leaving page still holds it; removed only when both have let go',async()=>{
  await act(()=>root.render(createElement(Page,{enabled:true})));
  const home=doc.createElement('main');home.getBoundingClientRect=()=>rect(0,0,view.width,view.height);doc.body.append(home);
  const lease=acquireHomeFooter(home as HTMLElement,()=>{});
  await act(()=>root.render(createElement('div')));expect(marked()).toBe(true);
  lease.dispose();expect(marked()).toBe(false);
 });
});
describe('Home through the open transition',()=>{
 let expanded:any;
 function Home({mounted=true}:{mounted?:boolean}){const ref=useRef<HTMLElement|null>(null);
  expanded=useHomeControls({root:ref,enabled:true,spotlightHome:true,homeStatusBar:true,homeExpandedControls:true,mounted,statusHidden:false,launching:()=>false,stopRepeats:()=>{},returnHome:()=>{}});
  return createElement('main',{ref:(node:HTMLElement|null)=>{ref.current=node;if(node)node.getBoundingClientRect=()=>rect(0,0,view.width,view.height);}});}
 it('keeps the footer (markers and footer CSS) while data-gh-opening is set; the rest of Home still suspends',async()=>{
  const header=doc.createElement('header');header.innerHTML='<span class="avatarHolder"></span><input type="search">';header.getBoundingClientRect=()=>rect(0,0,view.width,40);doc.body.prepend(header);
  await act(()=>root.render(createElement(Home)));
  expect(marked()).toBe(true);expect(expanded.footerActive).toBe(true);
  const main=doc.querySelector('main')!;
  await act(async()=>{main.setAttribute('data-gh-opening','morph');await new Promise(r=>setTimeout(r,0));});
  expect(marked()).toBe(true);expect(expanded.footerActive).toBe(false);expect(expanded.footerShown).toBe(true);
  expect(header.hasAttribute('inert')).toBe(false);
  await act(async()=>{main.removeAttribute('data-gh-opening');await new Promise(r=>setTimeout(r,0));});
  expect(expanded.footerActive).toBe(true);
 });
 it('takes the footer from its first layout, before its content is up, so coming back from the page has no gap',async()=>{
  await act(()=>root.render(createElement(Home,{mounted:false})));
  expect(marked()).toBe(true);expect(expanded.footerShown).toBe(true);expect(expanded.footerActive).toBe(false);
 });
});
