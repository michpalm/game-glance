import {isRadialControl} from './radialControls';
import {createRadialInput,type AxesSnapshot,type ButtonsSnapshot,type RadialCommand,type RadialViewState} from './radialInput';
import type {RadialLayout} from './radialLayout';
import type {CursorMove} from './typing';
import {normaliseAxis} from './placement';
// Decky's GamepadButton: DIR_UP=9, DIR_DOWN=10, DIR_LEFT=11, DIR_RIGHT=12.
const DPAD:Record<number,CursorMove>={9:'start',10:'end',11:'left',12:'right'};
// Steam sends the same D-pad presses for a pushed stick (every one with source 1, Ally 2026-11-04), and the controller readings can
// lag the event by a frame or two: a press waits WAIT ms and is dropped if a stick was past PUSHED within QUIET ms before it, or since.
const WAIT=60,QUIET=150,PUSHED=.2;
const pushed=(axes:AxesSnapshot)=>[axes.LeftJoystick,axes.RightJoystick].some(s=>Math.hypot(normaliseAxis(s.x),normaliseAxis(s.y))>PUSHED);
export function startRadialRuntime(deps:{view:Window;document:Document;read():{axes:AxesSnapshot;buttons:ButtonsSnapshot}|null;layout():RadialLayout;ownsInput():boolean;completeOnRelease?:boolean;canChangeLayout?():boolean;direction?(move:CursorMove):void;now?():number;changed(view:RadialViewState):void;command(value:RadialCommand):void;failed():void}):()=>void {
 const input=createRadialInput();let stopped=false,frame:number|undefined,last='',owned=false,pendingSend=false,stickAt=-Infinity;
 const now=deps.now??(()=>deps.view.performance?.now()??Date.now());
 let moves:{move:CursorMove;at:number}[]=[];
 const swallow=(event:Event)=>{
  if(stopped||!deps.ownsInput())return;
  if(event.type==='vgp_onbuttondown'||event.type==='vgp_onbuttonup'){
   const button=Number((event as CustomEvent<{button:number}>).detail?.button);
   if(!isRadialControl(button))return;
   if(event.type==='vgp_onbuttondown'&&DPAD[button]&&deps.direction)moves.push({move:DPAD[button],at:now()});
  }
  event.preventDefault();event.stopImmediatePropagation();
 };
 const events=['vgp_ondirection','vgp_oncancel','vgp_onok','vgp_onsecondary','vgp_onoptions','vgp_onbuttondown','vgp_onbuttonup'];
 events.forEach(type=>deps.document.addEventListener(type,swallow,true));
 const stop=()=>{if(stopped)return;stopped=true;if(frame!==undefined)deps.view.cancelAnimationFrame(frame);events.forEach(type=>deps.document.removeEventListener(type,swallow,true));input.reset();};
 const tick=()=>{
  if(stopped)return;
  try{
   const active=deps.ownsInput();
   if(!active){input.reset();owned=false;pendingSend=false;last='';moves=[];}
   else {
    if(!owned){input.reset();owned=true;}
    const snapshot=deps.read();if(!snapshot){stop();deps.failed();return;}
    const t=now();if(pushed(snapshot.axes))stickAt=t;
    // stickAt only moves forward: a press is kept only while no stick has been pushed since QUIET before it.
    moves=moves.filter(m=>stickAt<m.at-QUIET);
    for(const m of moves.filter(m=>t-m.at>=WAIT)){if(stopped||!deps.ownsInput())break;deps.direction?.(m.move);}
    moves=moves.filter(m=>t-m.at<WAIT);
    const result=input.sample(snapshot.axes,snapshot.buttons,deps.layout(),deps.canChangeLayout?.()??true);
    const view={selection:result.selection,extra:result.extra,uppercase:result.uppercase};
    const key=JSON.stringify(view);if(key!==last){last=key;deps.changed(view);}
    for(const command of result.commands){if(stopped||!deps.ownsInput())break;if(command.type==='send'&&deps.completeOnRelease)pendingSend=true;else deps.command(command);}
    if(pendingSend&&!snapshot.buttons.bButtonSouth&&deps.ownsInput()){pendingSend=false;deps.command({type:'send'});}
   }
   if(!stopped)frame=deps.view.requestAnimationFrame(tick);
  }catch{stop();deps.failed();}
 };
 frame=deps.view.requestAnimationFrame(tick);return stop;
}
