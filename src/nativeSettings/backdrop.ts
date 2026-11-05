import type {Art} from '../home/HeroBackground';
import type {SettingsBackdrop,Stop} from './model';
export interface SettingsArtContext {account:string|null;appId:number|null;revision?:string}
/** Resolve only a known current context; account/generation changes retire all older work. */
export function createSettingsBackdrop(deps:{readContext():SettingsArtContext;resolve(appId:number):Promise<Art>;subscribe(changed:()=>void):Stop}){
 let value:SettingsBackdrop|null=null,key:string|undefined,generation=0,alive=true;
 const listeners=new Set<Stop>();
 const set=(next:SettingsBackdrop|null)=>{if(value?.url===next?.url&&value?.mode===next?.mode)return;value=next;for(const fn of listeners)fn();};
 const refresh=()=>{
  if(!alive)return;
  let context:SettingsArtContext;try{context=deps.readContext();}catch{context={account:null,appId:null};}
  const next=JSON.stringify(context);if(next===key)return;key=next;const epoch=++generation;set(null);
  if(!context.account||!Number.isSafeInteger(context.appId)||context.appId!<=0)return;
  let request:Promise<Art>;try{request=deps.resolve(context.appId!);}catch{key=undefined;return;}
  request.then(art=>{
   if(!alive||epoch!==generation)return;
   set(art.mode==='none'?null:{url:art.url,mode:art.mode});
  },()=>{if(alive&&epoch===generation)key=undefined;});
 };
 const stop=deps.subscribe(refresh);refresh();
 return {get:()=>value,subscribe(fn:Stop):Stop{if(!alive)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},dispose(){if(!alive)return;alive=false;generation++;stop();listeners.clear();value=null;}};
}
