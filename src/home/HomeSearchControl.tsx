import {DialogButton,Focusable,GamepadButton as B,type GamepadEvent} from '@decky/ui';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {LuSearch} from 'react-icons/lu';
import {homeSearchBounds,type HomeSearchSession} from './homeSearch';
import type {HomeStatusControls} from './homeControls';
import {focusElement} from './homeNav';
import {tokenCss} from '../styles/tokens';
import {keyboardStyles} from '../menu/keyboard/styles';
import {radialStyles} from '../menu/radialStyles';
import {createKeyboardSession} from '../menu/keyboard/session';
import type {KeyboardContext} from '../menu/keyboard/context';
import {MenuKeyboard,readSteamLayouts,type Layouts} from '../menu/components/MenuKeyboard';
import {RadialKeyboard} from '../menu/components/RadialKeyboard';
import {menuPreferences,type createMenuPreferences} from '../menu/preferences';
export interface HomeSearchProps {search:HomeSearchSession;active:boolean;account:string|null;controls?:HomeStatusControls;ownsInput():boolean;preferences?:ReturnType<typeof createMenuPreferences>;statusBounds?():{left:number;top:number;width:number;height:number}|null;document?:Document|null}
/** Home owns only a local editor; completion closes it without invoking Steam search. */
export function HomeSearch({search,active,account,controls,ownsInput,preferences=menuPreferences,statusBounds,document:ownerDocument}:HomeSearchProps){
    const state=useSyncExternalStore(search.subscribe,search.get),pref=useSyncExternalStore(preferences.subscribe,preferences.get);
    const [host,setHost]=useState<HTMLDivElement|null>(null),[layouts,setLayouts]=useState<Layouts|null>(null),[failed,setFailed]=useState(false),[bounds,setBounds]=useState<ReturnType<typeof homeSearchBounds>>(null);
    const field=useRef<HTMLElement|null>(null),session=useMemo(createKeyboardSession,[]),previousMode=useRef(pref.socialKeyboard),previousPhase=useRef(state.phase);
    const live=useRef({active,ownsInput,controls});live.current={active,ownsInput,controls};
    const doc=ownerDocument??(typeof document==='undefined'?null:document);
    const usable=useCallback(()=>live.current.active&&live.current.ownsInput(),[]);
    const complete=useCallback(()=>{if(!usable())return;search.dispatch({type:'complete'});session.close();},[search,session,usable]);
    const context=useMemo<KeyboardContext>(()=>({host:()=>host,ownsInput:()=>usable()&&search.get().phase==='editing',restoreFocus:()=>{},completionLabel:'Done'}),[host,search,usable]);
    useEffect(()=>{if(preferences.loadState()==='unloaded'||preferences.loadState()==='failed')void preferences.load().catch(()=>{});},[preferences]);
    useLayoutEffect(()=>{search.dispatch({type:'account',account});},[search,account]);
    useLayoutEffect(()=>{if(!active){search.dispatch({type:'suspend'});session.close();}},[active,search,session]);
    useEffect(()=>{if(previousMode.current!==pref.socialKeyboard){session.close();search.dispatch({type:'suspend'});previousMode.current=pref.socialKeyboard;setFailed(false);}},[pref.socialKeyboard,search,session]);
    useLayoutEffect(()=>{
        if(state.phase==='editing'&&active){setFailed(false);setLayouts(readSteamLayouts());session.open();}
        else session.close();
    },[state.phase,active,session]);
    useEffect(()=>session.subscribe(()=>{if(!session.get().open&&search.get().phase==='editing'&&usable())search.dispatch({type:'complete'});}),[session,search,usable]);
    useLayoutEffect(()=>{
        const was=previousPhase.current;previousPhase.current=state.phase;
        if(was!=='editing'||state.phase!=='top'||!active)return;
        const view=doc?.defaultView;if(!view)return;const frame=view.requestAnimationFrame(()=>{if(usable()&&search.get().phase==='top')focusElement(field.current,'Search');});return()=>view.cancelAnimationFrame(frame);
    },[state.phase,active,doc,search,usable]);
    useLayoutEffect(()=>{
        const view=doc?.defaultView;if(!view||state.phase==='hidden'||!active){setBounds(null);return;}
        const measure=()=>{const status=statusBounds?.()??doc?.querySelector('.gg-status-host:not(.gg-menu-status-host) .gh-status')?.getBoundingClientRect();setBounds(status?homeSearchBounds({width:view.innerWidth,height:view.innerHeight},status,state.phase==='editing'):null);};
        measure();view.addEventListener('resize',measure);
        const status=doc?.querySelector('.gg-status-host:not(.gg-menu-status-host) .gh-status'),observer=view.ResizeObserver?new view.ResizeObserver(measure):null;if(status)observer?.observe(status);
        return()=>{view.removeEventListener('resize',measure);observer?.disconnect();};
    },[doc,statusBounds,state.phase,active]);
    useEffect(()=>()=>{session.close();search.dispatch({type:'suspend'});},[session,search]);
    const register=useCallback((node:HTMLElement|null)=>{field.current=node;controls?.register('search',node);},[controls]);
    const buttons=(event:GamepadEvent)=>{if(state.phase==='editing')return;controls?.button('search',event);};
    if(!doc)return null;
    return createPortal(<Focusable className="gh-keyboard-surface" ref={setHost} onPointerDown={event=>event.stopPropagation()} onPointerUp={event=>event.stopPropagation()} onPointerCancel={event=>event.stopPropagation()} onWheel={event=>event.stopPropagation()} style={{position:'fixed',inset:0,zIndex:5001,pointerEvents:'none'}} onButtonDown={(event:GamepadEvent)=>{if(state.phase==='editing'&&(failed||pref.socialKeyboard==='compact')&&event.detail.button===B.CANCEL){event.preventDefault();event.stopPropagation();complete();}}}>
        <style>{tokenCss('.gh-keyboard-surface')}{keyboardStyles}{radialStyles}</style>
        {active&&state.phase!=='hidden'&&bounds&&<div className="gh-search-position" style={{left:bounds.left,top:bounds.top,width:bounds.width}}>
            <DialogButton ref={register} data-home-search={state.phase} className="gh-search-control" aria-label={state.phase==='editing'?'Search draft':'Search'} aria-expanded={state.phase==='editing'} onGamepadFocus={()=>controls?.focused('search')} onButtonDown={buttons} onClick={()=>{if(usable())search.dispatch({type:'edit'});}}><LuSearch aria-hidden="true"/><span>{state.phase==='editing'?(state.draft||'Search games…'):'Search'}</span></DialogButton>
            {state.phase==='editing'&&failed&&<small className="gh-search-error">Radial keyboard unavailable. Using Compact for this opening.</small>}
        </div>}
        {active&&state.phase==='editing'&&layouts&&host&&(pref.socialKeyboard==='radial'&&!failed?<RadialKeyboard context={context} session={session} layouts={layouts} draft={state.draft} setDraft={text=>{if(usable())search.dispatch({type:'draft',text});}} canSend send={complete} field={()=>field.current} ownsInput={usable} unavailable={()=>setFailed(true)}/>:<MenuKeyboard context={context} session={session} layouts={layouts} draft={state.draft} setDraft={text=>{if(usable())search.dispatch({type:'draft',text});}} canSend send={complete} field={()=>field.current}/>)}
    </Focusable>,doc.body);
}
