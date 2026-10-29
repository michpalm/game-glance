import {act,createElement,forwardRef} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {parseHTML} from 'linkedom';
import {HomeSearch} from '../../src/home/HomeSearchControl';
import {createHomeSearch} from '../../src/home/homeSearch';
import {createMenuPreferences} from '../../src/menu/preferences';
import {MenuKeyboard} from '../../src/menu/components/MenuKeyboard';
import {BUILTIN_QWERTY} from '../../src/menu/keyboard/layouts';
import {createKeyboardSession} from '../../src/menu/keyboard/session';
const kv=vi.hoisted(()=>({resolve:null as null|((value:unknown)=>void),set:vi.fn()}));
vi.unmock('react-dom');
vi.mock('../../src/data/kv',()=>({backendKv:{get:()=>new Promise(resolve=>{kv.resolve=resolve;}),set:kv.set}}));
vi.mock('@decky/ui',()=>({Focusable:forwardRef(({children,onButtonDown,onButtonUp,noFocusRing,...props}:any,ref:any)=>createElement('div',{...props,ref},children)),DialogButton:forwardRef(({children,onGamepadFocus,...props}:any,ref:any)=>createElement('button',{...props,ref},children)),findModule:()=>{},findModuleExport:()=>null}));
let root:Root,win:any,field:HTMLElement,host:HTMLElement,owned:boolean,active:HTMLElement;
beforeEach(()=>{const p=parseHTML('<html><body><div id="app"></div><div id="host"><button id="field">Search</button></div><button id="other">New owner</button></body></html>');win=p.window;vi.stubGlobal('document',p.document);vi.stubGlobal('window',win);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);Object.defineProperty(win,'innerWidth',{configurable:true,writable:true,value:1280});Object.defineProperty(win,'innerHeight',{configurable:true,writable:true,value:800});win.requestAnimationFrame=(fn:any)=>setTimeout(fn,0);win.cancelAnimationFrame=clearTimeout;active=p.document.body as unknown as HTMLElement;Object.defineProperty(p.document,'activeElement',{configurable:true,get:()=>active});vi.spyOn(win.HTMLElement.prototype,'focus').mockImplementation(function(this:HTMLElement){active=this;});host=p.document.getElementById('host')! as unknown as HTMLElement;field=p.document.getElementById('field')! as unknown as HTMLElement;host.getBoundingClientRect=()=>({left:0,top:0,width:win.innerWidth,height:win.innerHeight} as DOMRect);Object.defineProperty(host,'offsetWidth',{get:()=>win.innerWidth});field.getBoundingClientRect=()=>({left:400,top:4,width:360,height:32} as DOMRect);owned=true;kv.resolve=null;kv.set.mockClear();root=createRoot(p.document.getElementById('app')!);});
afterEach(async()=>{owned=false;await act(()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();});
async function mount(){const session=createKeyboardSession();session.open();await act(()=>root.render(createElement(MenuKeyboard,{context:{host:()=>host,ownsInput:()=>owned,restoreFocus:()=>{},completionLabel:'Done'},session,layouts:{layouts:[BUILTIN_QWERTY],current:0},draft:'',setDraft:()=>{},canSend:true,send:()=>{},field:()=>field})));return session;}
it('does not place or autofocus after deferred loading loses input ownership',async()=>{await mount();owned=false;const other=document.getElementById('other')! as unknown as HTMLElement;other.focus();await act(async()=>{kv.resolve?.({spot:'right'});await Promise.resolve();});expect(document.activeElement).toBe(other);expect((document.querySelector('.gg-keyboard') as HTMLElement).style.visibility).toBe('hidden');});
it('settles a right-positioned real Compact keyboard inside a shrinking viewport without saving a drag',async()=>{await mount();await act(async()=>{kv.resolve?.({spot:'right'});await Promise.resolve();});const panel=document.querySelector('.gg-keyboard') as HTMLElement;expect(parseFloat(panel.style.left)).toBeGreaterThan(829);win.innerWidth=829;win.innerHeight=467;await act(()=>win.dispatchEvent(new win.Event('resize')));expect(parseFloat(panel.style.left)+409).toBeLessThanOrEqual(829);expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(0);expect(parseFloat(panel.style.top)).toBeGreaterThanOrEqual(36);expect(kv.set).not.toHaveBeenCalled();});

it('keeps actual Compact key gestures inside the Home Search portal',async()=>{
 const preferences=createMenuPreferences({get:async()=>null,set:async()=>{}});await preferences.load();const search=createHomeSearch(),pointer=vi.fn(),wheel=vi.fn();
 await act(()=>root.render(createElement('main',{onPointerDown:pointer,onPointerUp:pointer,onWheel:wheel},createElement(HomeSearch,{search,active:true,account:'one',ownsInput:()=>owned,preferences,statusBounds:()=>({left:900,top:4,width:350,height:32})}))));
 await act(()=>search.dispatch({type:'enter'}));const fieldButton=document.querySelector('[data-home-search]')!;await act(()=>fieldButton.dispatchEvent(new win.Event('click',{bubbles:true})));await act(async()=>{kv.resolve?.({spot:'right'});await Promise.resolve();});
 const key=document.querySelector('.gg-keyboard-key')!;expect(key).toBeTruthy();await act(()=>{for(const type of ['pointerdown','pointerup','wheel'])key.dispatchEvent(new win.Event(type,{bubbles:true}));});expect(pointer).not.toHaveBeenCalled();expect(wheel).not.toHaveBeenCalled();expect(search.get().phase).toBe('editing');
});
