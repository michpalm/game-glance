import {hideKeyboardNavigation} from '../keyboard/navigationVisibility';
import {findModuleExport} from '@decky/ui';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {keyboardContext,createKeyboardBoundsReporter,type KeyboardContext} from '../keyboard/context';
import {takeSteamFocus} from '../../home/steamFocus';
import {ControllerFeed,ControllerFeedGuard,activeControllerIndex,discoverControllerFeeds} from '../keyboard/controllerFeed';
import {buildRadialLayout,type RadialLayout,type Side} from '../keyboard/radialLayout';
import {radialBounds,type WheelBounds} from '../keyboard/radialPlacement';
import {applyRadialCommand,syncRadialDraft,type AxesSnapshot,type ButtonsSnapshot,type RadialViewState} from '../keyboard/radialInput';
import {startRadialRuntime} from '../keyboard/radialRuntime';
import {installRadialSurface} from '../keyboard/radialSurface';
import type {KeyboardSession} from '../keyboard/session';
import {clearHeld,cursorOf,moveCursor,type TypingState} from '../keyboard/typing';
import {installPhysicalKeys,nextLayout,physicalKey,type Layouts} from './MenuKeyboard';
const EMPTY:RadialViewState={selection:[null,null],extra:[false,false],uppercase:false};
export interface RadialKeyboardProps {context?:KeyboardContext;session:KeyboardSession;layouts:Layouts;draft:string;setDraft(text:string):void;canSend:boolean;send():void;field():HTMLElement|null;unavailable():void;ownsInput():boolean}
const point=(r:number,a:number)=>[50+r*Math.cos(a),50+r*Math.sin(a)];
export function RadialKeyboardView({bounds,layout,state,short,type,completionLabel='Send',frost=true}:{completionLabel?:string;frost?:boolean;bounds:[WheelBounds,WheelBounds];layout:RadialLayout;state:RadialViewState;short:string;type(side:Side,index:number):void}){
 return <>{([0,1] as const).map(side=>{
  const b=bounds[side],keys=(state.extra[side]?layout.symbols:layout.letters)[side],step=Math.PI*2/keys.length;
  const label=(index:number)=>state.uppercase&&!state.extra[side]?(keys[index].shifted??keys[index].char.toUpperCase()):keys[index].char;
  return <div key={side}>
   <div className="gg-radial-wheel" data-gg-frost-region={frost?(side===0?'keyboard-left':'keyboard-right'):undefined} role="group" aria-label={`${side===0?'Left':'Right'} keyboard wheel`} style={{left:b.left,top:b.top,width:b.diameter,height:b.diameter,'--gg-radial-diameter':`${b.diameter}px`} as CSSProperties}>
    <svg viewBox="0 0 100 100" aria-hidden="true">{keys.map((_,i)=>{
     const angle=-Math.PI/2+(i-1)*step,half=step/2-.008,a=point(49.5,angle-half),b=point(49.5,angle+half),c=point(17,angle+half),d=point(17,angle-half);
     return <path key={i} className="gg-radial-sector" data-selected={state.selection[side]===i} d={`M${a} A49.5 49.5 0 ${step>Math.PI?1:0} 1 ${b} L${c} A17 17 0 ${step>Math.PI?1:0} 0 ${d} Z`}/>;
    })}</svg>
    {keys.map((_,i)=>{const p=point(37,-Math.PI/2+(i-1)*step);return <button type="button" className="gg-radial-key" key={i} style={{left:`${p[0]}%`,top:`${p[1]}%`}} aria-label={`Type ${label(i)}`} onClick={()=>type(side,i)}>{label(i)}</button>;})}
    <div className="gg-radial-centre"><span className="gg-radial-chosen">{state.selection[side]===null?'':label(state.selection[side]!)}</span><small>{side===0?'L3':'R3'}</small></div>
   </div>
   <div className="gg-radial-hint" style={{left:b.left,top:b.top+b.diameter+8,width:b.diameter}}>{side===0?'L3 Type · L2 Symbols':'R3 Type · R2 Symbols'}</div>
  </div>;
 })}<div className="gg-radial-actions"><span>{`Y Space · B Delete · A ${completionLabel} · X Close`}</span><span>D-pad Move cursor · L1 Uppercase · R1 Layout · {short}</span></div></>;
}
/** Wrapper ensures all hooks/effects below are torn down whenever this chat's session closes. */
export function RadialKeyboard(props:RadialKeyboardProps){
 const open=useSyncExternalStore(props.session.subscribe,()=>props.session.get().open);
 return open?<OpenRadialKeyboard {...props}/>:null;
}
function OpenRadialKeyboard(props:RadialKeyboardProps){
 const ctx=keyboardContext(props.context);
 const live=useRef(props);live.current=props;
 const [host,setHost]=useState<HTMLElement|null>(null),[bounds,setBounds]=useState<[WheelBounds,WheelBounds]|null>(null);
 const [index,setIndex]=useState(activeControllerIndex),[layoutIndex,setLayoutIndex]=useState(props.layouts.current),[state,setState]=useState<RadialViewState>(EMPTY);
 const stateRef=useRef(state);stateRef.current=state;
 const typing=useRef<TypingState>({text:props.draft,shift:'off',held:null}),previousDraft=useRef(props.draft);
 if(previousDraft.current!==props.draft){typing.current=syncRadialDraft(typing.current,props.draft);previousDraft.current=props.draft;}
 const layoutIndexRef=useRef(layoutIndex);layoutIndexRef.current=layoutIndex;
 const snapshot=useRef<{axes:AxesSnapshot;buttons:ButtonsSnapshot}|null>(null);
 const onSnapshot=useCallback((value:typeof snapshot.current)=>{snapshot.current=value;},[]);
 const feeds=useMemo(()=>discoverControllerFeeds(findModuleExport),[]);
 const current=props.layouts.layouts[layoutIndex]??props.layouts.layouts[props.layouts.current];
 const layout=useMemo(()=>buildRadialLayout(current),[current]);
 const layoutRef=useRef(layout);layoutRef.current=layout;
 const boundsReporter=useMemo(()=>createKeyboardBoundsReporter(ctx),[ctx]);
 useLayoutEffect(()=>()=>boundsReporter.dispose(),[boundsReporter]);
 useLayoutEffect(()=>{boundsReporter.report(bounds?.map(b=>({left:b.left,top:b.top,width:b.diameter,height:b.diameter}))??[]);},[bounds,boundsReporter]);
 const close=useCallback(()=>live.current.session.close(),[]);
 const commit=useCallback((next:TypingState)=>{typing.current=next;live.current.setDraft(next.text);live.current.session.setCursor(cursorOf(next));},[]);
 useLayoutEffect(()=>{
  const field=live.current.field(),root=field?ctx.host(field):null,doc=field?.ownerDocument;
  if(!field||!root||!doc||!feeds){live.current.unavailable();return;}
  const element=doc.createElement('div');element.className='gg-radial-keyboard-host';
  const style=doc.defaultView?.getComputedStyle(root);
  if(style)for(let i=0;i<style.length;i++){const name=style.item(i);if(name.startsWith('--gg-'))element.style.setProperty(name,style.getPropertyValue(name));}
  doc.body.append(element);setHost(element);props.session.setMode('radial');
  const resize=()=>{const win=doc.defaultView!,r=field.getBoundingClientRect();const pair=radialBounds({width:win.innerWidth,height:win.innerHeight},{left:r.left,top:r.top,width:r.width,height:r.height});if(!pair){live.current.unavailable();return;}setBounds(pair);};
  const stop=installRadialSurface(field,()=>[element],close,resize);
  return ()=>{stop();element.remove();props.session.setMode(null);typing.current=clearHeld(typing.current);if(props.context){if(ctx.ownsInput())ctx.restoreFocus(field);}else if(field.isConnected&&doc.querySelector('[data-gg-focus="social:compose"]')?.contains(field.querySelector('button')??field)){const button=field.querySelector<HTMLElement>('button');button?.focus({preventScroll:true});if(button)takeSteamFocus(button);}};
 },[feeds,close,props.session]);
 useLayoutEffect(()=>host&&bounds?hideKeyboardNavigation(host.ownerDocument):undefined,[host,!!bounds]);
 useEffect(()=>{
  if(!host||!bounds)return;
  const doc=host.ownerDocument,view=doc.defaultView!;
  const owns=()=>{const next=activeControllerIndex();if(next!==index){snapshot.current=null;setIndex(next);return false;}return live.current.session.get().open&&keyboardContext(live.current.context).ownsInput()&&live.current.ownsInput()&&host.isConnected&&view.getComputedStyle(host).visibility!=='hidden'&&doc.visibilityState!=='hidden';};
  const stop=startRadialRuntime({document:doc,view,read:()=>snapshot.current,layout:()=>layoutRef.current,ownsInput:owns,canChangeLayout:()=>nextLayout(live.current.layouts.layouts,layoutIndexRef.current)!==layoutIndexRef.current,direction:move=>{if(!owns())return;commit(moveCursor(typing.current,move));},changed:setState,failed:()=>live.current.unavailable(),command:command=>{
   if(command.type==='close'){close();return;}
   if(command.type==='send'){if(live.current.canSend)live.current.send();return;}
   if(command.type==='layout'){const next=nextLayout(live.current.layouts.layouts,layoutIndexRef.current);if(next!==layoutIndexRef.current){typing.current=clearHeld(typing.current);setLayoutIndex(next);}return;}
   commit(applyRadialCommand(typing.current,command));
  }});
  const keys=installPhysicalKeys(view,event=>{if(!owns())return false;const action=physicalKey(typing.current,event,live.current.canSend);if(!action)return false;if(action.send)live.current.send();if(action.state)commit(action.state);return true;});
  return ()=>{stop();keys();};
 },[host,!!bounds,index,close,commit]);
 if(!host||!bounds||!feeds)return null;
 return createPortal(<><ControllerFeedGuard key={index} failed={()=>live.current.unavailable()}><ControllerFeed feeds={feeds} index={index} snapshot={onSnapshot}/></ControllerFeedGuard><RadialKeyboardView completionLabel={ctx.completionLabel} frost={!props.context} bounds={bounds} layout={layout} state={state} short={current.short} type={(side,i)=>{if(!live.current.ownsInput())return;const key=(stateRef.current.extra[side]?layoutRef.current.symbols:layoutRef.current.letters)[side][i];if(key)commit(applyRadialCommand(typing.current,{type:'key',key,uppercase:stateRef.current.uppercase}));}}/></>,host);
}
