import {Component,useLayoutEffect,type ReactNode} from 'react';
import type {AxesSnapshot,ButtonsSnapshot} from './radialInput';
export type ControllerFeeds={useAxes:(index:number)=>AxesSnapshot|undefined;useButtons:(index:number)=>ButtonsSnapshot|undefined};
export function discoverControllerFeeds(lookup:(predicate:(value:unknown)=>boolean)=>unknown):ControllerFeeds|null {
 try{
  const find=(token:string)=>lookup(value=>{try{return typeof value==='function'&&String(value).includes(token);}catch{return false;}});
  const useAxes=find('useControllerAxesFeed'),useButtons=find('useControllerButtonFeed');
  if(typeof useAxes!=='function'||typeof useButtons!=='function'||!String(useAxes).includes('useControllerAxesFeed')||!String(useButtons).includes('useControllerButtonFeed'))return null;
  return {useAxes:useAxes as ControllerFeeds['useAxes'],useButtons:useButtons as ControllerFeeds['useButtons']};
 }catch{return null;}
}
const buttonNames=['bLeftStickClick','bRightStickClick','bLeftTrigger','bRightTrigger','bLeftBumper','bRightBumper','bButtonNorth','bButtonEast','bButtonSouth','bButtonWest'] as const;
export function validControllerSnapshot(axes:unknown,buttons:unknown):boolean {
 if(!axes||!buttons||typeof axes!=='object'||typeof buttons!=='object')return false;
 const a=axes as AxesSnapshot,b=buttons as ButtonsSnapshot;
 return Number.isInteger(a.nControllerIndex)&&a.nControllerIndex>=0&&a.nControllerIndex<16&&a.nControllerIndex===b.nControllerIndex&&
  !!a.LeftJoystick&&!!a.RightJoystick&&[a.LeftJoystick.x,a.LeftJoystick.y,a.RightJoystick.x,a.RightJoystick.y].every(v=>typeof v==='number'&&Number.isFinite(v))&&buttonNames.every(k=>k in b&&(typeof b[k]==='boolean'||b[k]===undefined));
}
/** Steam may omit false protobuf values; its store still assigns every known button key as undefined.
 * Validate the schema before converting those released buttons to the booleans consumed by the edge detector. */
export function normalizeControllerSnapshot(axes:unknown,buttons:unknown,index:number):{axes:AxesSnapshot;buttons:ButtonsSnapshot}|null {
 if(!validControllerSnapshot(axes,buttons)||(axes as AxesSnapshot).nControllerIndex!==index)return null;
 const raw=buttons as ButtonsSnapshot,normalized={nControllerIndex:raw.nControllerIndex} as ButtonsSnapshot;
 for(const key of buttonNames)normalized[key]=raw[key]===true;
 return {axes:axes as AxesSnapshot,buttons:normalized};
}
/** The hooks own Steam's matching start/end effects. Never call them in a probe or outside React. */
export function ControllerFeed({feeds,index,snapshot}:{feeds:ControllerFeeds;index:number;snapshot(value:{axes:AxesSnapshot;buttons:ButtonsSnapshot}|null):void}){
 const axes=feeds.useAxes(index),buttons=feeds.useButtons(index);
 useLayoutEffect(()=>{snapshot(normalizeControllerSnapshot(axes,buttons,index));},[axes,buttons,index,snapshot]);
 useLayoutEffect(()=>()=>snapshot(null),[snapshot]);
 return null;
}
export class ControllerFeedGuard extends Component<{children:ReactNode;failed():void},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.failed();}
 render(){return this.state.failed?null:this.props.children;}
}
export function activeControllerIndex():number {
 const value=(globalThis as unknown as {SteamUIStore?:{ActiveControllerIndex?:number}}).SteamUIStore?.ActiveControllerIndex;
 return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<16?value:0;
}
