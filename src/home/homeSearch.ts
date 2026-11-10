import {indexLibrary,matchLibrary,type IndexedEntry} from '../search/match';
import type {LibraryEntry,LibrarySnapshot} from '../search/model';
export type HomeSearchPhase='hidden'|'top'|'editing'|'field'|'results';
export interface HomeSearchState {phase:HomeSearchPhase;draft:string;account:string|null;epoch:number;library:LibrarySnapshot;index:readonly IndexedEntry[];matches:readonly LibraryEntry[];focusedAppId:number|null;scrollTop:number;openError:boolean}
export type HomeSearchEvent={type:'enter'|'edit'|'complete'|'results'|'keyboard-close'|'back'|'dismiss'|'content'|'suspend'}|{type:'draft';text:string}|{type:'account';account:string|null}|{type:'library';epoch:number;snapshot:LibrarySnapshot}|{type:'focus-result';appId:number|null}|{type:'scroll';top:number}|{type:'open-error';epoch:number};
export const initialHomeSearch=(account:string|null=null,epoch=0):HomeSearchState=>({phase:'hidden',draft:'',account,epoch,library:{status:'unavailable',account},index:[],matches:[],focusedAppId:null,scrollTop:0,openError:false});
export const searchOverlayOpen=(s:HomeSearchState):boolean=>s.phase==='editing'||s.phase==='field'||s.phase==='results';
export function reduceHomeSearch(s:HomeSearchState,e:HomeSearchEvent):HomeSearchState {
 switch(e.type){
 case 'account':return e.account===s.account?s:initialHomeSearch(e.account,s.epoch+1);
 case 'enter':return s.phase==='hidden'?{...s,phase:'top'}:s;
 case 'edit':return s.phase==='hidden'||s.phase==='editing'?s:{...s,phase:'editing',openError:false};
 case 'draft':return s.phase!=='editing'||s.draft===e.text?s:{...s,draft:e.text,matches:matchLibrary(s.index,e.text),focusedAppId:null,scrollTop:0,openError:false};
 case 'library':{
  if(e.epoch!==s.epoch||e.snapshot.account!==s.account)return s;
  const index=e.snapshot.status==='ready'?indexLibrary(e.snapshot.entries):[],matches=matchLibrary(index,s.draft);
  const old=s.matches.findIndex(a=>a.appId===s.focusedAppId),exists=matches.some(a=>a.appId===s.focusedAppId);
  const id=exists?s.focusedAppId:old>=0?(matches[Math.min(old,matches.length-1)]?.appId??null):null;
  return {...s,library:e.snapshot,index,matches,focusedAppId:id,phase:s.phase==='results'&&!matches.length?'field':s.phase};
 }
 case 'results':case 'complete':return s.phase==='editing'||s.phase==='field'?{...s,phase:s.matches.length?'results':'field',focusedAppId:s.phase==='field'&&s.matches.some(a=>a.appId===s.focusedAppId)?s.focusedAppId:s.matches[0]?.appId??null,scrollTop:s.phase==='editing'?0:s.scrollTop}:s;
 case 'keyboard-close':return s.phase==='editing'?{...s,phase:'field'}:s;
 case 'focus-result':return e.appId===null?{...s,phase:'field'}:s.matches.some(a=>a.appId===e.appId)?{...s,phase:'results',focusedAppId:e.appId}:s;
 case 'scroll':return Number.isFinite(e.top)&&s.scrollTop!==e.top?{...s,scrollTop:Math.max(0,e.top)}:s;
 case 'open-error':return e.epoch===s.epoch&&searchOverlayOpen(s)?{...s,openError:true}:s;
 case 'back':case 'dismiss':case 'content':case 'suspend':
  if(e.type==='back'&&(s.phase==='results'||s.phase==='editing'))return {...s,phase:'field'};
  return s.phase==='hidden'?s:{...s,phase:'hidden',epoch:s.epoch+1,draft:'',matches:[],focusedAppId:null,scrollTop:0,openError:false};
 }
}
export function homeSearchBounds(viewport:{width:number;height:number},status:{left:number;top:number;width:number;height:number},editing:boolean):{left:number;top:number;width:number}|null {
    if(![viewport.width,viewport.height,status.left,status.top,status.width,status.height].every(Number.isFinite)||viewport.width<=0||viewport.height<40)return null;
    const end=Math.min(viewport.width-12,status.left-12),available=end-12,min=editing?180:110;
    if(available<min)return null;
    const width=Math.min(editing?360:140,available),left=Math.max(12,Math.min((viewport.width-width)/2,end-width));
    return {left,top:Math.max(4,Math.min(status.top,viewport.height-36)),width};
}
export function createHomeSearch(){
 let state=initialHomeSearch(),disposed=false;const listeners=new Set<()=>void>();
 return {get:()=>state,subscribe(fn:()=>void){if(!disposed)listeners.add(fn);return()=>{listeners.delete(fn);};},dispatch(e:HomeSearchEvent){if(disposed)return;const next=reduceHomeSearch(state,e);if(next===state)return;state=next;for(const fn of [...listeners])fn();},dispose(){disposed=true;state=initialHomeSearch(null,state.epoch+1);listeners.clear();}};
}
export type HomeSearchSession=ReturnType<typeof createHomeSearch>;
