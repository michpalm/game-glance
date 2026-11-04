import type {LibraryEntry,ResultMetadata} from './model';
export function createResultMetadata(ports:{capsules(id:number):readonly string[];installed(id:number):Promise<boolean|null>}) {
 let map:ReadonlyMap<number,ResultMetadata>=new Map(),epoch=-1,disposed=false;const listeners=new Set<()=>void>(),requested=new Set<number>();
 const notify=()=>{for(const f of [...listeners])f();};
 const set=(id:number,value:ResultMetadata)=>{map=new Map(map).set(id,value);notify();};
 return {get:()=>map,subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},visible(entries:readonly LibraryEntry[],nextEpoch:number){
  if(disposed)return;if(epoch!==nextEpoch){epoch=nextEpoch;requested.clear();}
  for(const a of entries){let old=map.get(a.appId);if(!old){let urls:readonly string[]=[];try{urls=ports.capsules(a.appId);}catch{/* artwork is optional */}old={capsuleUrls:urls,installed:a.kind==='shortcut'?null:a.installed};set(a.appId,old);}else if(a.kind!=='shortcut'&&old.installed!==a.installed)set(a.appId,{...old,installed:a.installed});
   if(a.kind!=='shortcut'||requested.has(a.appId))continue;requested.add(a.appId);const requestEpoch=epoch;
   void (async()=>{try{const installed=await ports.installed(a.appId);if(disposed||epoch!==requestEpoch)return;const current=map.get(a.appId);if(current&&current.installed!==installed)set(a.appId,{...current,installed});}catch{/* optional provider state stays unknown */}})();
  }
 },reset(){epoch++;requested.clear();map=new Map();notify();},dispose(){disposed=true;epoch++;requested.clear();map=new Map();listeners.clear();}};
}
