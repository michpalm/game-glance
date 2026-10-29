import {isRadialControl} from './radialControls';
import {createRadialInput,type AxesSnapshot,type ButtonsSnapshot,type RadialCommand,type RadialViewState} from './radialInput';
import type {RadialLayout} from './radialLayout';
export function startRadialRuntime(deps:{view:Window;document:Document;read():{axes:AxesSnapshot;buttons:ButtonsSnapshot}|null;layout():RadialLayout;ownsInput():boolean;canChangeLayout?():boolean;changed(view:RadialViewState):void;command(value:RadialCommand):void;failed():void}):()=>void {
 const input=createRadialInput();let stopped=false,frame:number|undefined,last='',owned=false;
 const swallow=(event:Event)=>{
  if(stopped||!deps.ownsInput())return;
  if(event.type==='vgp_onbuttondown'||event.type==='vgp_onbuttonup'){
   const button=Number((event as CustomEvent<{button:number}>).detail?.button);
   if(!isRadialControl(button))return;
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
   if(!active){input.reset();owned=false;last='';}
   else {
    if(!owned){input.reset();owned=true;}
    const snapshot=deps.read();if(!snapshot){stop();deps.failed();return;}
    const result=input.sample(snapshot.axes,snapshot.buttons,deps.layout(),deps.canChangeLayout?.()??true);
    const view={selection:result.selection,extra:result.extra,uppercase:result.uppercase};
    const key=JSON.stringify(view);if(key!==last){last=key;deps.changed(view);}
    for(const command of result.commands){if(stopped||!deps.ownsInput())break;deps.command(command);}
   }
   if(!stopped)frame=deps.view.requestAnimationFrame(tick);
  }catch{stop();deps.failed();}
 };
 frame=deps.view.requestAnimationFrame(tick);return stop;
}
