import {useLayoutEffect,useRef,useSyncExternalStore} from 'react';
import type {KeyboardSession} from '../keyboard/session';
import {graphemes} from '../keyboard/typing';

/** The draft split at the cursor, in letters; no cursor means the end. */
export function draftParts(text:string,cursor:number|null):[string,string]{
 const letters=graphemes(text),at=cursor===null?letters.length:Math.max(0,Math.min(letters.length,cursor));
 return [letters.slice(0,at).join(''),letters.slice(at).join('')];
}
/** The scroll position that keeps the caret 8 px inside the visible width (all in px). */
export function scrollFor(caret:number,scroll:number,width:number):number{
 if(caret>scroll+width-8)return caret-width+8;
 if(caret<scroll+8)return Math.max(0,caret-8);
 return scroll;
}

/** The text being typed: plain while the keyboard is closed; open, with a blinking caret at the cursor. */
export function DraftText({text,session}:{text:string;session:KeyboardSession}){
 const open=useSyncExternalStore(session.subscribe,()=>session.get().open);
 const cursor=useSyncExternalStore(session.subscribe,session.cursor);
 const box=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{
  const node=box.current,caret=node?.querySelector<HTMLElement>('.gg-caret');
  if(!node||!caret)return;
  const at=caret.getBoundingClientRect().left-node.getBoundingClientRect().left+node.scrollLeft;
  node.scrollLeft=scrollFor(at,node.scrollLeft,node.clientWidth);
  if(node.scrollLeft>0)node.dataset.scrolled='';else delete node.dataset.scrolled;
 },[open,text,cursor]);
 if(!open)return <>{text}</>;
 const [before,after]=draftParts(text,cursor);
 return <span className="gg-draft" ref={box}><span>{before}</span><i className="gg-caret" aria-hidden="true" key={cursor??'end'}/><span>{after}</span></span>;
}
