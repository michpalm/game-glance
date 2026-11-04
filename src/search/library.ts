import type {LibraryEntry,LibrarySnapshot,Stop} from './model';
export interface LibrarySource {read(account:string):LibrarySnapshot;subscribe(account:string,changed:()=>void):Stop}
export interface LibraryPorts {account():string|null;ready():boolean;apps():readonly unknown[];hidden?(id:number):boolean;subscribe(changed:()=>void):Stop}
export const once=(stop:Stop):Stop=>{let active=true;return()=>{if(active){active=false;stop();}};};
export function createLibrarySource(ports:LibraryPorts):LibrarySource {
 return {read(account){try{
  if(ports.account()!==account||!ports.hidden)return {status:'unavailable',account};
  if(!ports.ready())return {status:'loading',account};
  const entries:LibraryEntry[]=[],seen=new Set<number>();
  for(const raw of ports.apps()){
   if(!raw||typeof raw!=='object')continue;
   const a=raw as {appid?:number;display_name?:string;app_type?:number;installed?:boolean;BIsOwned?():boolean};
   if(!Number.isInteger(a.appid)||a.appid!<=0||typeof a.display_name!=='string'||!a.display_name.trim())continue;
   const kind=a.app_type===1?'game':a.app_type===8?'demo':a.app_type===1073741824?'shortcut':null;
   if(!kind)continue;
   if(typeof a.BIsOwned!=='function')return {status:'unavailable',account};
   if(a.BIsOwned()!==true)continue;const hidden=ports.hidden(a.appid!);if(typeof hidden!=='boolean')return {status:'unavailable',account};if(hidden||seen.has(a.appid!))continue;
   seen.add(a.appid!);entries.push({appId:a.appid!,title:a.display_name,kind,installed:kind==='shortcut'?null:typeof a.installed==='boolean'?a.installed:null});
  }
  return {status:'ready',account,entries};
 }catch{return {status:'unavailable',account};}},subscribe(account,changed){if(ports.account()!==account)return()=>{};const stop=ports.subscribe(changed);if(typeof stop!=='function')throw Error('Library subscription unavailable');return once(stop);}};
}
