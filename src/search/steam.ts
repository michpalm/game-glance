import {Navigation} from '@decky/ui';
import {createLibrarySource,once,type LibrarySource} from './library';
import type {Stop} from './model';
export interface RouteSource {get():string|null;subscribe(changed:()=>void):Stop}
export interface SearchEnvironment {library:LibrarySource;route:RouteSource;navigate(path:string):void}
interface History {location?:{pathname?:string};listen?(changed:()=>void):Stop}
export function routeSource(history:History|null|undefined):RouteSource {return {get:()=>typeof history?.location?.pathname==='string'?history.location.pathname:null,subscribe:fn=>{try{return once(history?.listen?.(fn)??(()=>{}));}catch{return()=>{};}}};}
interface Observable {observe_?(changed:()=>void,immediate?:boolean):Stop}
interface Root {App?:{m_CurrentUser?:{strSteamID?:string}};appStore?:{m_bIsInitialized?:boolean;allApps?:unknown[]};collectionStore?:{BIsHidden?(id:number):boolean;GetCollection?(id:string):unknown;allAppsCollection?:{allApps?:unknown[];visibleApps?:unknown[]}};SteamUIStore?:{WindowStore?:{GamepadUIMainWindowInstance?:{BrowserWindow?:Window;History?:History}}}}
function observables(object:unknown):Map<string,Observable>|undefined {if(!object||typeof object!=='object')return;const symbol=Object.getOwnPropertySymbols(object).find(s=>String(s)==='Symbol(mobx administration)');return symbol?(object as Record<symbol,{values_?:Map<string,Observable>}>)[symbol]?.values_:undefined;}
export function searchEnvironment(doc:Document):SearchEnvironment {
 const root=globalThis as unknown as Root,store=root.collectionStore,app=root.appStore;
 const window=root.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
 const history=window?.BrowserWindow?.document===doc?window.History:null;
 const library=createLibrarySource({account:()=>root.App?.m_CurrentUser?.strSteamID??null,
 ready:()=>app?.m_bIsInitialized===true,
 apps:()=>{if(!store?.GetCollection?.('hidden')||!history||!observables(store.allAppsCollection)?.get('allApps')?.observe_)throw Error('Library contract unavailable');const apps=store.allAppsCollection?.allApps;if(!Array.isArray(apps))throw Error('Library unavailable');return apps;},
 hidden:typeof store?.BIsHidden==='function'?id=>store.BIsHidden!(id):undefined,
 subscribe:changed=>{
  let stopped=false,queued=false,stops:Stop[]=[];
  const refresh=()=>{if(stopped||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(stopped)return;attach();changed();});};
  const attach=()=>{stops.splice(0).forEach(stop=>stop());const watch=(o:unknown,keys:string[])=>{const values=observables(o);for(const key of keys){const v=values?.get(key);if(v?.observe_)stops.push(v.observe_(refresh));}};
   watch(store,['allAppsCollection']);watch(app,['allApps']);watch(store?.allAppsCollection,['allApps','visibleApps']);watch(store?.GetCollection?.('hidden'),['m_rgApps']);
   for(const a of app?.allApps??[])watch(a,['display_name','visible_in_game_list','subscribed_to','installed']);
  };attach();return()=>{stopped=true;stops.splice(0).forEach(stop=>stop());};
 }});
 return {library,route:routeSource(history),navigate:path=>Navigation.Navigate(path)};
}
