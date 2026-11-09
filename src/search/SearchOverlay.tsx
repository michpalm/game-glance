import {DialogButton,Focusable,GamepadButton as B,type GamepadEvent} from '@decky/ui';
import {useEffect,useLayoutEffect,useRef,useState,type Ref,type CSSProperties} from 'react';
import type {HomeSearchState} from '../home/homeSearch';
import {normalizeSearch} from './match';
import {resultWindow,nextSearchResult,type SearchOverlayLayout} from './layout';
import type {LibraryEntry,ResultMetadata} from './model';
export interface SearchOverlayProps {state:HomeSearchState;layout:SearchOverlayLayout;metadata:ReadonlyMap<number,ResultMetadata>;listRef:Ref<HTMLDivElement>;onResult(appId:number):void;onFocus(appId:number|null):void;onBack():void;onRetry():void;onScroll(top:number):void}
function Capsule({urls}:{urls:readonly string[]}){const [index,setIndex]=useState(0);useEffect(()=>setIndex(0),[urls]);return urls[index]?<img className="gg-search-capsule" src={urls[index]} alt="" onError={()=>setIndex(i=>i+1)}/>:<span className="gg-search-capsule" aria-hidden="true"/>;}
function ResultRow({app:a,metadata:m,editing,top,height,onResult,onFocus,onDirection}:{app:LibraryEntry;metadata?:ResultMetadata;editing:boolean;top:number;height:number;onResult(appId:number):void;onFocus(appId:number):void;onDirection(e:GamepadEvent):void}){
 const armed=useRef(false),installed=m?.installed??a.installed;
 useLayoutEffect(()=>{armed.current=false;},[editing]);
 const consume=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
 return <DialogButton className="gg-search-row" data-search-result={a.appId} aria-label={a.title} style={{top,height}} onGamepadFocus={()=>{if(!editing)onFocus(a.appId);}} onGamepadBlur={()=>{armed.current=false;}} onButtonDown={(e:GamepadEvent)=>{if(e.detail.button!==B.OK){onDirection(e);return;}consume(e);if(!e.detail.is_repeat)armed.current=!editing;}} onButtonUp={(e:GamepadEvent)=>{if(e.detail.button!==B.OK)return;consume(e);const activate=armed.current&&!editing;armed.current=false;if(activate)onResult(a.appId);}} onClick={()=>{armed.current=false;onResult(a.appId);}}>
  <Capsule urls={m?.capsuleUrls??[]}/><span className="gg-search-caption"><span className="gg-search-title">{a.title}</span>{a.edition&&<span className="gg-search-edition">{a.edition}</span>}</span>{installed!==null&&<span className="gg-search-installed">{installed?'Installed':'Not installed'}</span>}
 </DialogButton>;
}
export function SearchOverlay(p:SearchOverlayProps){
 const {state:s,layout:l}=p,query=normalizeSearch(s.draft),count=s.matches.length,at=s.matches.findIndex(a=>a.appId===s.focusedAppId);
 const window=resultWindow({count,scrollTop:s.scrollTop,rowHeight:l.rowHeight,viewportHeight:l.listHeight,focusedIndex:s.phase==='results'?at:-1});
 const message=!query?'Search your library.':s.library.status==='loading'?'Loading library…':s.library.status==='unavailable'?'Library unavailable. Try again.':!count?'No games found':null;
 const key=(e:GamepadEvent,index:number)=>{if(s.phase==='editing')return;const b=e.detail.button;if(b!==B.DIR_UP&&b!==B.DIR_DOWN&&b!==B.CANCEL)return;e.preventDefault();e.stopPropagation();if(b===B.CANCEL)p.onBack();else {const i=nextSearchResult(index,b===B.DIR_UP?'up':'down',count);p.onFocus(i===null?null:s.matches[i].appId);}};
 return <section className="gg-search-overlay" onClickCapture={e=>{if(e.detail<=0)return;const row=(e.target as HTMLElement).closest('[data-search-result]');if(!row)return;e.preventDefault();e.stopPropagation();p.onResult(Number(row.getAttribute('data-search-result')));}} onKeyDown={e=>{const row=(e.target as HTMLElement).closest('[data-search-result]');if(s.phase==='editing'||!row||!['ArrowUp','ArrowDown','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='Escape')p.onBack();else {const index=s.matches.findIndex(a=>a.appId===Number(row.getAttribute('data-search-result'))),next=nextSearchResult(index,e.key==='ArrowUp'?'up':'down',count);p.onFocus(next===null?null:s.matches[next].appId);}}} role="region" aria-label="Library matches" style={{left:l.left,top:l.top,width:l.width,'--gg-d':`${l.scale}px`} as CSSProperties}>
  <div className="gg-search-heading"><span>Library matches</span>{query&&s.library.status==='ready'&&<span className="gg-search-count" aria-live="polite">{count===1?'1 game':`${count} games`}</span>}</div>
  <div className="gg-search-list" ref={p.listRef} style={{height:l.listHeight}} onScroll={e=>p.onScroll(e.currentTarget.scrollTop)}>
   {message?<div className="gg-search-message" role="status">{message}{query&&s.library.status==='unavailable'&&<DialogButton data-search-retry="true" onClick={p.onRetry} onButtonDown={(e:GamepadEvent)=>{if(e.detail.button===B.CANCEL||e.detail.button===B.DIR_UP){e.preventDefault();e.stopPropagation();if(e.detail.button===B.CANCEL)p.onBack();else p.onFocus(null);}}}>Retry</DialogButton>}</div>:<Focusable className="gg-search-list-inner" flow-children="column" style={{height:count*l.rowHeight}}>{window.indices.map(index=>{const a=s.matches[index];return <ResultRow key={a.appId} app={a} metadata={p.metadata.get(a.appId)} editing={s.phase==='editing'} top={index*l.rowHeight} height={l.rowHeight-8*l.scale} onResult={p.onResult} onFocus={id=>p.onFocus(id)} onDirection={e=>key(e,index)}/>;})}</Focusable>}
  </div>{s.openError&&<div className="gg-search-error" role="alert">Couldn't open this game. Try again.</div>}
 </section>;
}
