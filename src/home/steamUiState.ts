import {useCallback,useSyncExternalStore} from 'react';
import {menuOpen,steamMenuStore} from './steamMenu';
import {createTopBarFinder,focusInTopBar} from './topBar';
export interface SteamUiState {foreground:boolean;menu:boolean;nativeHeaderFocused:boolean;account:string|null}
const EMPTY:SteamUiState={foreground:false,menu:false,nativeHeaderFocused:false,account:null};
const stores=new WeakMap<Document,ReturnType<typeof createState>>();
function createState(doc:Document){
    const find=createTopBarFinder(doc),listeners=new Set<()=>void>();let stop:(()=>void)|null=null;
    const read=():SteamUiState=>{let account:string|null=null;try{const id=(globalThis as {App?:{m_CurrentUser?:{strSteamID?:unknown}}}).App?.m_CurrentUser?.strSteamID;account=typeof id==='string'&&id?id:null;}catch{/* account not ready */}const foreground=doc.hasFocus();return{foreground,menu:menuOpen(steamMenuStore(),foreground),nativeHeaderFocused:focusInTopBar(find(),doc.activeElement),account};};
    let state=read();
    const update=()=>{const next=read();if((Object.keys(next) as (keyof SteamUiState)[]).every(key=>next[key]===state[key]))return;state=next;for(const fn of [...listeners])fn();};
    return {get:()=>state,subscribe(fn:()=>void){listeners.add(fn);if(!stop){const view=doc.defaultView;doc.addEventListener('focusin',update);doc.addEventListener('visibilitychange',update);view?.addEventListener('focus',update);view?.addEventListener('blur',update);const timer=setInterval(update,250);stop=()=>{clearInterval(timer);doc.removeEventListener('focusin',update);doc.removeEventListener('visibilitychange',update);view?.removeEventListener('focus',update);view?.removeEventListener('blur',update);};update();}return()=>{listeners.delete(fn);if(!listeners.size){stop?.();stop=null;}};}};
}
const store=(doc:Document)=>{let value=stores.get(doc);if(!value){value=createState(doc);stores.set(doc,value);}return value;};
export const getSteamUiState=(doc:Document):SteamUiState=>store(doc).get();
export const subscribeSteamUiState=(doc:Document,listener:()=>void):(()=>void)=>store(doc).subscribe(listener);
const nothing=()=>()=>{};
export function useSteamUiState(doc:Document|null):SteamUiState {
    return useSyncExternalStore(useCallback(fn=>doc?subscribeSteamUiState(doc,fn):nothing(),[doc]),useCallback(()=>doc?getSteamUiState(doc):EMPTY,[doc]));
}
