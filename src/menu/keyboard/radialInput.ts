import type {KeyDef} from './layouts';
import type {RadialLayout} from './radialLayout';
import {selectRadial} from './radialSelection';
import {normaliseAxis} from './placement';
import {press,type TypingState} from './typing';
export type AxesSnapshot={nControllerIndex:number;LeftJoystick:{x:number;y:number};RightJoystick:{x:number;y:number};flLeftTrigger?:number;flRightTrigger?:number};
export type ButtonsSnapshot={nControllerIndex:number;bLeftStickClick:boolean;bRightStickClick:boolean;bLeftTrigger:boolean;bRightTrigger:boolean;bLeftBumper:boolean;bRightBumper:boolean;bButtonNorth:boolean;bButtonEast:boolean;bButtonSouth:boolean;bButtonWest:boolean};
export type RadialCommand={type:'key';key:KeyDef;uppercase:boolean}|{type:'space'|'delete'|'send'|'close'|'layout'};
export type RadialViewState={selection:[number|null,number|null];extra:[boolean,boolean];uppercase:boolean};
export function createRadialInput(){
 let previous:ButtonsSnapshot|null=null,selection:[number|null,number|null]=[null,null],blocked=[false,false],layers=[false,false];
 const reset=()=>{previous=null;selection=[null,null];blocked=[false,false];layers=[false,false];};
 return {reset,sample(axes:AxesSnapshot,buttons:ButtonsSnapshot,layout:RadialLayout,canChangeLayout=true):RadialViewState&{commands:RadialCommand[]}{
  if(previous?.nControllerIndex!==buttons.nControllerIndex)reset();
  const edge=(key:keyof ButtonsSnapshot)=>!!previous&&!previous[key]&&!!buttons[key];
  const extra:[boolean,boolean]=[buttons.bLeftTrigger,buttons.bRightTrigger],uppercase=buttons.bLeftBumper;
  const commands:RadialCommand[]=[];
  for(const side of [0,1] as const){
   const raw=side===0?axes.LeftJoystick:axes.RightJoystick,axis={x:normaliseAxis(raw.x),y:normaliseAxis(raw.y)};
   if(Math.hypot(axis.x,axis.y)<=.35)blocked[side]=false;
   const keys=(extra[side]?layout.symbols:layout.letters)[side];
   selection[side]=blocked[side]?null:selectRadial(layers[side]===extra[side]?selection[side]:null,axis,keys.length);
  }
  if(edge('bButtonWest'))commands.push({type:'close'});
  else if(edge('bRightBumper')&&canChangeLayout){commands.push({type:'layout'});blocked=[true,true];selection=[null,null];}
  else {
   for(const side of [0,1] as const){const key=selection[side];if(key!==null&&edge(side===0?'bLeftStickClick':'bRightStickClick'))commands.push({type:'key',key:(extra[side]?layout.symbols:layout.letters)[side][key],uppercase});}
   if(edge('bButtonNorth'))commands.push({type:'space'});
   if(edge('bButtonEast'))commands.push({type:'delete'});
   if(edge('bButtonSouth'))commands.push({type:'send'});
  }
  previous={...buttons};layers=[...extra];return {selection:[...selection],extra,uppercase,commands};
 }};
}
export function applyRadialCommand(state:TypingState,command:RadialCommand):TypingState {
 if(command.type==='key'){
  const shift=command.uppercase&&/^\p{L}+$/u.test(command.key.char)?'lock':'off';
  return {...press({...state,shift},command.key),shift:'off'};
 }
 if(command.type==='space'||command.type==='delete')return press({...state,shift:'off'},{char:command.type==='space'?' ':'⌫',kind:command.type==='space'?'space':'backspace'});
 return state;
}

/** External draft replacement (including a successful send) starts a fresh composition. */
export function syncRadialDraft(state:TypingState,draft:string):TypingState {
 return state.text===draft?state:{text:draft,shift:'off',held:null};
}
