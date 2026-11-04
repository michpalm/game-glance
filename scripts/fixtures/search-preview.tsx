import {createElement,useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {HomeSearch} from '../../src/home/HomeSearchControl';
import {createHomeSearch} from '../../src/home/homeSearch';
import {createMenuPreferences} from '../../src/menu/preferences';
import {memoryKv} from '../../src/data/kv';
import {calmFilterMarkup} from '../../src/styles/tokens';
import {indexLibrary,matchLibrary} from '../../src/search/match';
const params=new URLSearchParams(location.search),mode=params.get('keyboard')==='compact'?'compact':'radial',kind=params.get('case')||'normal';
const games=[{appId:1057090,title:'Ori and the Will of the Wisps',kind:'game' as const,installed:true},{appId:387290,title:'Ori and the Blind Forest',edition:'Definitive Edition',kind:'game' as const,installed:false},{appId:261570,title:'Ori and the Blind Forest',kind:'game' as const,installed:false}];
const entries=kind==='long'?games.map(a=>({...a,title:a.title+' — A very long edition name for checking the two-line title layout'})):kind==='large'?Array.from({length:5000},(_,i)=>({appId:i+1,title:'Game '+i,kind:'game' as const,installed:false})):games;
(globalThis as any).appStore={GetAppOverviewByAppID:(id:number)=>({appid:id}),GetCustomVerticalCapsuleURLs:(overview:{appid:number})=>kind==='missing'?[]:[location.origin+'/assets/'+overview.appid+'.jpg']};
let route='/library/home';const listeners=new Set<()=>void>();
const environment={library:{read:(account:string)=>kind==='loading'?{status:'loading' as const,account}:kind==='unavailable'?{status:'unavailable' as const,account}:{status:'ready' as const,account,entries},subscribe:()=>()=>{}},route:{get:()=>route,subscribe:(f:()=>void)=>{listeners.add(f);return()=>listeners.delete(f);}},navigate:(path:string)=>{route=path;listeners.forEach(f=>f());(window as any).fixtureRoute=path;}};
function Preview(){
 const search=useMemo(createHomeSearch,[]),preferences=useMemo(()=>createMenuPreferences(memoryKv()),[]);
 useEffect(()=>{let active=true;void(async()=>{await preferences.load();await preferences.setSocialKeyboard(mode);if(!active)return;search.dispatch({type:'enter'});search.dispatch({type:'edit'});search.dispatch({type:'draft',text:kind==='empty'?'':kind==='none'?'no matching title':kind==='large'?'game':'ori'});if(params.get('state')==='browse')search.dispatch({type:'results'});})();(window as any).search=search;(window as any).benchmark=()=>{const index=indexLibrary(Array.from({length:5000},(_,i)=>({appId:i+1,title:'Synthetic Game '+i,kind:'game',installed:false} as const)));const times=[];for(let i=0;i<35;i++){const start=performance.now();matchLibrary(index,'game 2');if(i>=5)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {entries:5000,runs:30,median:times[15],p95:times[28]};};return()=>{active=false;};},[]);
 return <><div dangerouslySetInnerHTML={{__html:calmFilterMarkup()}}/><div className="gg-status-host"><div className="gh-status fixture-status" style={{color:'transparent',background:'transparent',border:'none'}}>Wi-Fi · 100% · 22:49</div></div><HomeSearch search={search} active account="fixture-account" ownsInput={()=>true} preferences={preferences} environment={environment} statusBounds={()=>({left:innerWidth-310,top:6,width:292,height:34})}/></>;
}
createRoot(document.getElementById('app')!).render(createElement(Preview));
