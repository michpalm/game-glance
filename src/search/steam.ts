import {Navigation} from '@decky/ui';
import {createLibrarySource,once,type LibrarySource} from './library';
import type {Stop} from './model';
export interface RouteSource {get():string|null;subscribe(changed:()=>void):Stop}
export interface SearchEnvironment {library:LibrarySource;route:RouteSource;navigate(path:string):void}
interface History {location?:{pathname?:string};listen?(changed:()=>void):Stop}
export function routeSource(source:History|null|undefined|(()=>History|null|undefined),strict=false):RouteSource {
 const history=()=>typeof source==='function'?source():source;
 return {get:()=>{try{const path=history()?.location?.pathname;return typeof path==='string'?path:null;}catch{return null;}},subscribe:fn=>{
  try{const stop=history()?.listen?.(fn);if(typeof stop!=='function'){if(strict)throw Error('Route observation unavailable');return()=>{};}return once(stop);}catch(error){if(strict)throw error;return()=>{};}
 }};
}
interface Observable {observe_?(changed:()=>void,immediate?:boolean):Stop}
interface Root {App?:{m_CurrentUser?:{strSteamID?:string}};appStore?:{m_bIsInitialized?:boolean;allApps?:unknown[]};collectionStore?:{BIsHidden?(id:number):boolean;GetCollection?(id:string):unknown;allAppsCollection?:{allApps?:unknown[];visibleApps?:unknown[]}};SteamUIStore?:{WindowStore?:{GamepadUIMainWindowInstance?:{BrowserWindow?:Window;History?:History}}}}
function observables(object:unknown):Map<string,Observable>|undefined {
 if(!object||typeof object!=='object')return;
 const symbol=Object.getOwnPropertySymbols(object).find(s=>String(s)==='Symbol(mobx administration)');
 return symbol?(object as Record<symbol,{values_?:Map<string,Observable>}>)[symbol]?.values_:undefined;
}
export function searchEnvironment(doc:Document):SearchEnvironment {
 const root=globalThis as unknown as Root;
 let fault=false;
 const history=()=>{const window=root.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;return window?.BrowserWindow?.document===doc?window.History:null;};
 const library=createLibrarySource({
  account:()=>root.App?.m_CurrentUser?.strSteamID??null,
  ready:()=>{if(fault)throw Error('Library observation unavailable');return root.appStore?.m_bIsInitialized===true;},
  apps:()=>{
   const store=root.collectionStore;
   if(!store?.GetCollection?.('hidden')||typeof store.BIsHidden!=='function'||typeof history()?.listen!=='function'||!observables(store.allAppsCollection)?.get('allApps')?.observe_)throw Error('Library contract unavailable');
   const apps=store.allAppsCollection?.allApps;if(!Array.isArray(apps))throw Error('Library unavailable');return apps;
  },
  hidden:id=>{const store=root.collectionStore;if(typeof store?.BIsHidden!=='function')throw Error('Hidden state unavailable');return store.BIsHidden(id);},
  subscribe:changed=>{
   let stopped=false,queued=false,stops:Stop[]=[];
   const clear=()=>{for(const stop of stops.splice(0)){try{stop();}catch{/* continue releasing the other observers */}}};
   const attach=()=>{
    clear();const store=root.collectionStore,app=root.appStore;
    if(!observables(store?.allAppsCollection)?.get('allApps')?.observe_||typeof store?.BIsHidden!=='function')throw Error('Library observation unavailable');
    const watch=(o:unknown,keys:string[])=>{const values=observables(o);for(const key of keys){const value=values?.get(key);if(value?.observe_){const stop=value.observe_(refresh);if(typeof stop!=='function')throw Error('Library observer cannot be disposed');stops.push(once(stop));}}};
    try{watch(store,['allAppsCollection']);watch(app,['allApps']);watch(store?.allAppsCollection,['allApps','visibleApps']);watch(store?.GetCollection?.('hidden'),['m_rgApps']);for(const a of app?.allApps??[])watch(a,['display_name','visible_in_game_list','subscribed_to','installed']);fault=false;}
    catch(error){fault=true;clear();throw error;}
   };
   const refresh=()=>{if(stopped||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(stopped)return;try{attach();}catch{fault=true;}changed();});};
   try{attach();}catch(error){fault=true;clear();throw error;}
   return once(()=>{stopped=true;clear();});
  },
 });
 return {library,route:routeSource(history,true),navigate:path=>Navigation.Navigate(path)};
}
