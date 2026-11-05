import {DialogButton,Focusable,GamepadButton as B,type GamepadEvent} from '@decky/ui';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {LuSearch} from 'react-icons/lu';
import {homeSearchBounds,searchOverlayOpen,type HomeSearchSession} from './homeSearch';
import type {HomeStatusControls} from './homeControls';
import {focusElement} from './homeNav';
import {homeCanvas} from './scale';
import {tokenCss,installCalmFilter} from '../styles/tokens';
import {installSearchOwnership} from '../search/ownership';
import {keyboardStyles} from '../menu/keyboard/styles';
import {radialStyles} from '../menu/radialStyles';
import {createKeyboardSession} from '../menu/keyboard/session';
import type {KeyboardContext,KeyboardRect} from '../menu/keyboard/context';
import {MenuKeyboard,readSteamLayouts,type Layouts} from '../menu/components/MenuKeyboard';
import {RadialKeyboard} from '../menu/components/RadialKeyboard';
import {DraftText} from '../menu/components/DraftText';
import {menuPreferences,type createMenuPreferences} from '../menu/preferences';
import {SearchOverlay} from '../search/SearchOverlay';
import {searchOverlayLayout,resultWindow} from '../search/layout';
import {searchStyles} from '../search/styles';
import {searchEnvironment,type SearchEnvironment} from '../search/steam';
import {useLibrarySearch} from '../search/useLibrarySearch';
export interface HomeSearchProps {search:HomeSearchSession;active:boolean;account:string|null;controls?:HomeStatusControls;ownsInput():boolean;preferences?:ReturnType<typeof createMenuPreferences>;statusBounds?():KeyboardRect|null;document?:Document|null;environment?:SearchEnvironment;returnToPage?():void}
const noop=()=>{};
const unavailable:SearchEnvironment={library:{read:account=>({status:'unavailable',account}),subscribe:()=>noop},route:{get:()=>null,subscribe:()=>noop},navigate:()=>{throw Error('No Steam window');}};
export function HomeSearch({search,active,account,controls,ownsInput,preferences=menuPreferences,statusBounds,document:ownerDocument,environment:suppliedEnvironment,returnToPage=noop}:HomeSearchProps){
 const state=useSyncExternalStore(search.subscribe,search.get),pref=useSyncExternalStore(preferences.subscribe,preferences.get),overlay=searchOverlayOpen(state);
 const doc=ownerDocument??(typeof document==='undefined'?null:document);
 const [host,setHost]=useState<HTMLDivElement|null>(null),[layouts,setLayouts]=useState<Layouts|null>(null),[failed,setFailed]=useState(false),[keyboards,setKeyboards]=useState<readonly KeyboardRect[]>([]);
 const [geometry,setGeometry]=useState(()=>({width:doc?.defaultView?.innerWidth??0,height:doc?.defaultView?.innerHeight??0,status:statusBounds?.()??null as KeyboardRect|null}));
 const fieldArmed=useRef(false);
 useLayoutEffect(()=>{fieldArmed.current=false;},[state.phase]);
 const field=useRef<HTMLElement|null>(null),list=useRef<HTMLDivElement|null>(null),session=useMemo(createKeyboardSession,[]),previousMode=useRef(pref.socialKeyboard);
 const live=useRef({active,ownsInput,controls});live.current={active,ownsInput,controls};
 const usable=useCallback(()=>live.current.active&&live.current.ownsInput(),[]);
 const environment=useMemo(()=>suppliedEnvironment??(doc?searchEnvironment(doc):unavailable),[doc,suppliedEnvironment]);
 const scale=homeCanvas(geometry.width,geometry.height).scale;
 const bounds=geometry.status?homeSearchBounds(geometry,geometry.status,overlay):null;
 const layout=useMemo(()=>{const box=searchOverlayLayout({viewport:geometry,scale,statusBottom:geometry.status?geometry.status.top+geometry.status.height:36,keyboards:state.phase==='editing'?keyboards:[],rowHeight:88*scale,anchor:bounds?{...bounds,height:32}:undefined,editing:state.phase==='editing'});return box?{...box,listHeight:Math.min(box.listHeight,Math.max(box.rowHeight,state.matches.length*box.rowHeight))}:null;},[geometry,scale,keyboards,state.phase,state.matches.length]);
 const layoutRef=useRef(layout);layoutRef.current=layout;
 const window=layout?resultWindow({count:state.matches.length,scrollTop:state.scrollTop,rowHeight:layout.rowHeight,viewportHeight:layout.listHeight,focusedIndex:state.phase==='results'?state.matches.findIndex(a=>a.appId===state.focusedAppId):-1}):null;
 const visible=window?.indices.map(i=>state.matches[i])??[];
 const runtime=useLibrarySearch({doc,search,active:active&&!!layout,environment,returnToPage,ownsInput:usable,visibleEntries:visible});
 const complete=useCallback(()=>{if(!usable())return;search.dispatch({type:'results'});session.close();},[search,session,usable]);
 const context=useMemo<KeyboardContext>(()=>({host:()=>host,ownsInput:()=>usable()&&search.get().phase==='editing',restoreFocus:noop,completionLabel:'Results',completeOnRelease:true,portalZIndex:5002,inside:()=>[...doc?.querySelectorAll<HTMLElement>('.gg-search-overlay')??[]],placementBounds:()=>layoutRef.current?.keyboardBand??null,onBoundsChange:rects=>{if(usable())setKeyboards(old=>JSON.stringify(old)===JSON.stringify(rects)?old:rects);}}),[host,doc,search,usable]);
 useLayoutEffect(()=>{if(overlay)controls?.release?.();},[overlay,controls]);
 useLayoutEffect(()=>{if(active&&overlay&&!layout){search.dispatch({type:'suspend'});session.close();}},[active,overlay,!!layout,search,session]);
 useLayoutEffect(()=>doc&&overlay?installCalmFilter(doc):undefined,[doc,overlay]);
 useLayoutEffect(()=>{
  if(!doc||!host||!active||!overlay||!layout)return;
  return installSearchOwnership(doc,{ownsInput:()=>usable()&&!!layoutRef.current&&searchOverlayOpen(search.get())&&search.get().account===account,roots:()=>[host,...doc.querySelectorAll<HTMLElement>('.gg-radial-keyboard-host')],fallback:()=>search.get().phase==='results'?doc.querySelector<HTMLElement>(`[data-search-result="${search.get().focusedAppId}"]`)??field.current:field.current,focus:node=>focusElement(node,'Search')});
 },[doc,host,active,overlay,!!layout,usable,search,account]);
 useEffect(()=>{if(preferences.loadState()==='unloaded'||preferences.loadState()==='failed')void preferences.load().catch(()=>{});},[preferences]);
 useLayoutEffect(()=>{search.dispatch({type:'account',account});},[search,account]);
 useLayoutEffect(()=>{if(!active){search.dispatch({type:'suspend'});session.close();}},[active,search,session]);
 useEffect(()=>{if(previousMode.current!==pref.socialKeyboard){search.dispatch({type:'keyboard-close'});session.close();previousMode.current=pref.socialKeyboard;setFailed(false);}},[pref.socialKeyboard,search,session]);
 useLayoutEffect(()=>{if(state.phase==='editing'&&active){setFailed(false);setLayouts(readSteamLayouts());session.open();}else session.close();},[state.phase,active,session]);
 useEffect(()=>session.subscribe(()=>{if(!session.get().open&&search.get().phase==='editing'&&usable())search.dispatch({type:'keyboard-close'});}),[session,search,usable]);
 useLayoutEffect(()=>{
  const view=doc?.defaultView;if(!view||state.phase==='hidden'||!active)return;
  const measure=()=>{const r=statusBounds?.()??doc?.querySelector('.gg-status-host:not(.gg-menu-status-host) .gh-status')?.getBoundingClientRect();setGeometry({width:view.innerWidth,height:view.innerHeight,status:r?{left:r.left,top:r.top,width:r.width,height:r.height}:null});};
  measure();view.addEventListener('resize',measure);const r=doc?.querySelector('.gg-status-host:not(.gg-menu-status-host) .gh-status'),observer=view.ResizeObserver?new view.ResizeObserver(measure):null;if(r)observer?.observe(r);
  return()=>{view.removeEventListener('resize',measure);observer?.disconnect();};
 },[doc,statusBounds,state.phase==='hidden',active]);
 useLayoutEffect(()=>{if(list.current&&layout&&overlay){const max=Math.max(0,state.matches.length*layout.rowHeight-layout.listHeight);list.current.scrollTop=Math.min(state.scrollTop,max);}},[overlay,layout?.listHeight,state.scrollTop,state.matches.length]);
 useLayoutEffect(()=>{
  if(!overlay||!active||!layout||state.phase==='editing')return;
  const epoch=state.epoch,node=state.phase==='results'?doc?.querySelector<HTMLElement>(`[data-search-result="${state.focusedAppId}"]`):field.current;
  if(!usable()||search.get().epoch!==epoch||!node?.isConnected)return;
  if(state.phase==='results'&&list.current){const index=state.matches.findIndex(a=>a.appId===state.focusedAppId),top=index*layout.rowHeight,bottom=top+layout.rowHeight;if(top<list.current.scrollTop)list.current.scrollTop=top;else if(bottom>list.current.scrollTop+layout.listHeight)list.current.scrollTop=bottom-layout.listHeight;if(list.current.scrollTop!==state.scrollTop)search.dispatch({type:'scroll',top:list.current.scrollTop});}
  focusElement(node,'Search');
 },[overlay,active,state.phase,state.focusedAppId,state.epoch,state.matches.findIndex(a=>a.appId===state.focusedAppId),doc,layout?.rowHeight,layout?.listHeight,usable,search]);

 useEffect(()=>()=>{session.close();search.dispatch({type:'suspend'});},[session,search]);
 const register=useCallback((node:HTMLElement|null)=>{field.current=node;controls?.register('search',node);},[controls]);
 const back=()=>{if(state.phase==='results')search.dispatch({type:'back'});else if(state.phase==='editing'){search.dispatch({type:'keyboard-close'});session.close();}else runtime.dismiss(true);};
 const enterResults=()=>{if(search.get().library.status==='unavailable'){const retry=doc?.querySelector<HTMLElement>('[data-search-retry]');if(retry)focusElement(retry,'Search retry');}else search.dispatch({type:'results'});};
 const fieldButtons=(e:GamepadEvent)=>{const current=search.get();if(!searchOverlayOpen(current)){live.current.controls?.button('search',e);return;}if(current.phase==='editing')return;if(e.detail.button===B.OK){e.preventDefault();e.stopPropagation();if(!e.detail.is_repeat)fieldArmed.current=true;return;}if(e.detail.button===B.CANCEL||e.detail.button===B.DIR_DOWN){e.preventDefault();e.stopPropagation();if(e.detail.button===B.CANCEL)back();else enterResults();}};
 const fieldRelease=(e:GamepadEvent)=>{if(!searchOverlayOpen(search.get())){live.current.controls?.buttonUp?.('search',e);return;}if(e.detail.button!==B.OK)return;e.preventDefault();e.stopPropagation();const reopen=fieldArmed.current;fieldArmed.current=false;if(reopen&&usable())search.dispatch({type:'edit'});};
 useLayoutEffect(()=>{const node=field.current;if(!node||!overlay)return;const down=(event:Event)=>{if((event as GamepadEvent).detail.button!==B.OK)return;event.stopImmediatePropagation();fieldButtons(event as GamepadEvent);},up=(event:Event)=>{if((event as GamepadEvent).detail.button!==B.OK)return;event.stopImmediatePropagation();fieldRelease(event as GamepadEvent);};node.addEventListener('vgp_onbuttondown',down,true);node.addEventListener('vgp_onbuttonup',up,true);return()=>{node.removeEventListener('vgp_onbuttondown',down,true);node.removeEventListener('vgp_onbuttonup',up,true);};});
 const fieldNode=<DialogButton ref={register} data-home-search={state.phase} className="gh-search-control" aria-label="Search library" aria-expanded={overlay} onGamepadFocus={()=>{if(!searchOverlayOpen(search.get()))live.current.controls?.focused('search');}} onButtonDown={fieldButtons} onGamepadBlur={()=>{fieldArmed.current=false;}} onButtonUp={fieldRelease} onClick={()=>{if(usable())search.dispatch({type:'edit'});}}><LuSearch aria-hidden="true"/><span>{overlay?(state.draft?<DraftText text={state.draft} session={session}/>:'Search games…'):'Search'}</span></DialogButton>;
 if(!doc)return null;
 return createPortal(<Focusable className="gh-keyboard-surface" role={overlay?'dialog':undefined} aria-modal={overlay?true:undefined} aria-label={overlay?'Search library':undefined} ref={setHost} style={{position:'fixed',inset:0,zIndex:5001,pointerEvents:'none'}} onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onPointerCancel={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} onKeyDown={e=>{if(!overlay||state.phase==='editing')return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();}else if(e.key==='ArrowDown'&&state.phase==='field'){e.preventDefault();e.stopPropagation();enterResults();}}} onButtonDown={(e:GamepadEvent)=>{if(state.phase==='editing'&&(failed||pref.socialKeyboard==='compact')&&e.detail.button===B.CANCEL){e.preventDefault();e.stopPropagation();back();}}}>
  <style>{tokenCss('.gh-keyboard-surface')}{keyboardStyles}{radialStyles}{searchStyles}</style>
  {active&&state.phase!=='hidden'&&bounds&&<div className="gh-search-position" style={{left:bounds.left,top:bounds.top,width:bounds.width,zIndex:3}}>{fieldNode}</div>}
  {active&&overlay&&layout&&<><div className="gg-search-backdrop" onClick={e=>{e.preventDefault();e.stopPropagation();if(state.phase==='editing')back();else runtime.dismiss(true);}}/><SearchOverlay state={state} layout={layout} metadata={runtime.metadata} listRef={list} onResult={appId=>void runtime.openResult(appId)} onFocus={appId=>{if(usable())search.dispatch({type:'focus-result',appId});}} onBack={back} onRetry={runtime.retry} onScroll={top=>search.dispatch({type:'scroll',top})}/></>}
  {overlay&&failed&&<small className="gh-search-error" style={{position:'fixed',left:layout?.left,top:layout?layout.top-20:0,pointerEvents:'none'}}>Radial keyboard unavailable. Using Compact for this opening.</small>}
  {active&&layout&&state.phase==='editing'&&layouts&&host&&(pref.socialKeyboard==='radial'&&!failed?<RadialKeyboard context={context} session={session} layouts={layouts} draft={state.draft} setDraft={text=>{if(usable())search.dispatch({type:'draft',text});}} canSend send={complete} field={()=>field.current} ownsInput={usable} unavailable={()=>setFailed(true)}/>:<MenuKeyboard context={context} session={session} layouts={layouts} draft={state.draft} setDraft={text=>{if(usable())search.dispatch({type:'draft',text});}} canSend send={complete} field={()=>field.current}/>)}
 </Focusable>,doc.body);
}
