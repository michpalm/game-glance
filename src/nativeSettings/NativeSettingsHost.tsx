import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useSettings} from '../data/settings';
import {menuPreferences} from '../menu/preferences';
import {useSteamUiState,subscribeSteamUiState,getSteamUiState} from '../home/steamUiState';
import {useScreensaverActive} from '../screensaver/steamScreensaver';
import {heroShownApp,heroArtFor,resolveArt} from '../home/HeroBackground';
import {routeSource} from '../search/steam';
import {createSettingsBackdrop,type SettingsArtContext} from './backdrop';
import {createSettingsActivation,startSettingsPresentation} from './runtime';
interface History {location?:{pathname?:string};listen?(fn:()=>void):()=>void}
function historyFor(doc:Document):History|null {
 const root=globalThis as unknown as {SteamUIStore?:{WindowStore?:{GamepadUIMainWindowInstance?:{BrowserWindow?:Window;History?:History}}}};
 const owner=root.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
 return owner?.BrowserWindow?.document===doc?owner.History??null:null;
}
/** Shares the custom-menu opt-in, independent of Home's optional chrome. */
export function NativeSettingsHost({masterReady}:{masterReady?:Promise<void>}={}){
 const master=useSettings(),preferences=useSyncExternalStore(menuPreferences.subscribe,menuPreferences.get),load=useSyncExternalStore(menuPreferences.subscribe,menuPreferences.loadState);
 const [ready,setReady]=useState(!masterReady);
 useEffect(()=>{let live=true;setReady(!masterReady);masterReady?.then(()=>{if(live)setReady(true);},()=>{});return()=>{live=false;};},[masterReady]);
 const [doc,setDoc]=useState<Document|null>(null),marker=useCallback((e:HTMLSpanElement|null)=>{if(e)setDoc(e.ownerDocument);},[]);
 useEffect(()=>{if(ready&&master.enabled&&load==='unloaded')void menuPreferences.load().catch(()=>{});},[ready,master.enabled,load]);
 return <><span ref={marker} style={{display:'none'}}/>{doc&&ready&&master.enabled&&load==='ready'&&preferences.enabled&&<NativeSettingsOn doc={doc}/>}</>;
}
function NativeSettingsOn({doc}:{doc:Document}){
 const ui=useSteamUiState(doc),screensaver=useScreensaverActive(),suspended=ui.menu||screensaver||!ui.foreground;
 const current=useRef(suspended);current.current=suspended;
 const activation=useRef<ReturnType<typeof createSettingsActivation>|null>(null);
 useEffect(()=>{
  const route=routeSource(()=>historyFor(doc),true);let context:SettingsArtContext={account:null,appId:null};
  const readContext=():SettingsArtContext=>{
   const account=getSteamUiState(doc).account,path=route.get();
   if(account!==context.account)context={account,appId:null};
   if(!path||/^\/settings(?:\/|$)/.test(path))return context;
   const match=/^\/library\/app\/(\d+)(?:\/|$)/.exec(path),appId=match?Number(match[1]):path==='/library/home'?heroShownApp():null;
   const art=appId?heroArtFor(appId):null;context={account,appId,revision:art&&art.mode!=='none'?art.url:undefined};return context;
  };
  let backdrop:ReturnType<typeof createSettingsBackdrop>|undefined;
  try{
   backdrop=createSettingsBackdrop({readContext,resolve:async id=>heroArtFor(id)??await resolveArt(id),subscribe:changed=>{
    const stops=[route.subscribe(changed)];let observer:MutationObserver|undefined;
    try{stops.push(subscribeSteamUiState(doc,changed));observer=doc.defaultView?.MutationObserver?new doc.defaultView.MutationObserver(changed):undefined;observer?.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','src']});}
    catch(error){stops.forEach(stop=>stop());observer?.disconnect();throw error;}
    return()=>{stops.forEach(stop=>stop());observer?.disconnect();};
   }});
   const source=backdrop,owner=createSettingsActivation(()=>startSettingsPresentation(doc,{route,backdrop:source}));activation.current=owner;
   owner.update({master:true,menu:true,ready:true,suspended:current.current});
   return()=>{activation.current=null;owner.dispose();source.dispose();};
  }catch{backdrop?.dispose();return undefined;}
 },[doc]);
 useEffect(()=>{activation.current?.update({master:true,menu:true,ready:true,suspended});},[suspended]);
 return null;
}
