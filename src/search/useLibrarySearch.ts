import {useLayoutEffect,useMemo,useSyncExternalStore} from 'react';
import {capsuleUrls,browserStores} from '../home/artwork';
import {unifideckInstalled} from '../data/unifideckInstalled';
import {searchOverlayOpen,type HomeSearchSession} from '../home/homeSearch';
import type {LibraryEntry} from './model';
import type {SearchEnvironment} from './steam';
import {createResultMetadata} from './metadata';
import {openSearchResult} from './navigation';
interface RuntimePorts {search:HomeSearchSession;environment:SearchEnvironment;ownsInput():boolean;returnToPage():void}
export function createSearchRuntime(p:RuntimePorts){
 let alive=false,epoch=-1,stopLibrary=()=>{},stopRoute=()=>{},pending:AbortController|null=null,target:string|null=null;
 const current=()=>alive&&p.ownsInput()&&p.search.get().epoch===epoch&&searchOverlayOpen(p.search.get());
 const stop=()=>{alive=false;pending?.abort();pending=null;target=null;stopLibrary();stopRoute();stopLibrary=()=>{};stopRoute=()=>{};};
 const read=()=>{if(!current())return;const account=p.search.get().account;if(account)p.search.dispatch({type:'library',epoch,snapshot:p.environment.library.read(account)});};
 const dismiss=(restore:boolean)=>{const canReturn=current();p.search.dispatch({type:'dismiss'});stop();if(restore&&canReturn)p.returnToPage();};
 const start=()=>{if(alive)return;const s=p.search.get();if(!s.account||!searchOverlayOpen(s)||!p.ownsInput())return;alive=true;epoch=s.epoch;
  try{stopRoute=p.environment.route.subscribe(()=>{if(!current())return;if(target&&p.environment.route.get()===target)return;p.search.dispatch({type:'suspend'});stop();});}catch{p.search.dispatch({type:'library',epoch,snapshot:{status:'unavailable',account:s.account}});return;}
  try{stopLibrary=p.environment.library.subscribe(s.account,read);read();}catch{stopLibrary();stopLibrary=()=>{};p.search.dispatch({type:'library',epoch,snapshot:{status:'unavailable',account:s.account}});}
 };
 return {start,stop,retry:()=>{stop();start();},dismiss,async openResult(appId:number){
  if(!current()||pending)return;const s=p.search.get(),snapshot=s.account?p.environment.library.read(s.account):null;
  if(snapshot?.status!=='ready'||!snapshot.entries.some(a=>a.appId===appId)){if(snapshot)p.search.dispatch({type:'library',epoch,snapshot});return;}
  const request=new AbortController();pending=request;target=`/library/app/${appId}`;
  const result=await openSearchResult(appId,p.environment,request.signal);if(!current()||pending!==request)return;
  pending=null;target=null;if(result==='opened')dismiss(false);else p.search.dispatch({type:'open-error',epoch});
 }};
}
export function useLibrarySearch(p:RuntimePorts&{doc:Document|null;active:boolean;visibleEntries:readonly LibraryEntry[]}){
 const state=useSyncExternalStore(p.search.subscribe,p.search.get),open=searchOverlayOpen(state);
 const runtime=useMemo(()=>createSearchRuntime(p),[p.search,p.environment,p.ownsInput,p.returnToPage]);
 const metadata=useMemo(()=>createResultMetadata({capsules:id=>capsuleUrls(id,browserStores),installed:unifideckInstalled}),[]);
 const values=useSyncExternalStore(metadata.subscribe,metadata.get);
 useLayoutEffect(()=>{metadata.reset();},[metadata,state.account]);
 useLayoutEffect(()=>{if(!p.active||!open)metadata.suspend();},[metadata,p.active,open,state.epoch]);
 useLayoutEffect(()=>{if(p.active&&open)runtime.start();else runtime.stop();return runtime.stop;},[runtime,p.active,open,state.account,state.epoch]);
 useLayoutEffect(()=>{if(p.active&&open)metadata.visible(p.visibleEntries,state.epoch);},[metadata,p.active,open,p.visibleEntries,state.epoch]);
 useLayoutEffect(()=>()=>metadata.dispose(),[metadata]);
 return {metadata:values,retry:runtime.retry,openResult:runtime.openResult,dismiss:runtime.dismiss};
}
