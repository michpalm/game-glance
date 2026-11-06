import type {RouteSource} from '../search/steam';
import type {createSettingsBackdrop} from './backdrop';
import {discoverColorSettings,createColorSettingsPresentation} from './colorSettings';
import type {NativeFieldClasses,NativeColorClasses} from './nativeFields';
import {discoverNativeSettings,settingsPresentationRoute} from './discovery';
import {observeSettingsLayout,type SettingsLayout} from './geometry';
import {createSettingsPresentation} from './presentation';
import type {Stop} from './model';
const safely=(fn:Stop|undefined)=>{try{fn?.();}catch{/* One retired native capability cannot prevent other cleanup. */}};
export function createSettingsActivation(start:()=>Stop){
 let stop:Stop|undefined,disposed=false;
 return {update(state:{master:boolean;menu:boolean;ready:boolean;suspended:boolean}){if(disposed)return;const enabled=state.master&&state.menu&&state.ready&&!state.suspended;if(!enabled){const previous=stop;stop=undefined;safely(previous);}else if(!stop){try{stop=start();}catch{/* Keep native presentation; a later state update can recover. */}}},dispose(){if(disposed)return;disposed=true;const previous=stop;stop=undefined;safely(previous);}};
}
/** Route owns the document observers. Disabled/outside Settings has no presentation lease. */
export function startSettingsPresentation(doc:Document,deps:{route:RouteSource;backdrop:ReturnType<typeof createSettingsBackdrop>;fields?:NativeFieldClasses;colorClasses?:()=>NativeColorClasses|undefined}):Stop {
 let observing=false,color:ReturnType<typeof createColorSettingsPresentation>|undefined;
 let alive=true,presentation:ReturnType<typeof createSettingsPresentation>|undefined,stopGeometry:Stop|undefined,observer:MutationObserver|undefined,layout:SettingsLayout|null=null,frame:number|undefined,offRoute:Stop|undefined,offArt:Stop|undefined;
 const view=doc.defaultView;
 const release=()=>{safely(stopGeometry);stopGeometry=undefined;observer?.disconnect();observer=undefined;const p=presentation;presentation=undefined;safely(()=>p?.dispose());const c=color;color=undefined;safely(()=>c?.dispose());observing=false;layout=null;};
 const render=()=>{
  if(!alive||!observing)return;
  try{
   const path=deps.route.get();
   if(path==='/colorsettings'){
    presentation?.dispose();presentation=undefined;
    if(!color)color=createColorSettingsPresentation(doc,deps.fields);
    color.update(discoverColorSettings(doc,path,deps.colorClasses?.()),layout);
   }else{
    color?.dispose();color=undefined;
    if(!presentation)presentation=createSettingsPresentation(doc,deps.fields);
    presentation.update(discoverNativeSettings(doc,path),layout,deps.backdrop.get());
   }
  }catch{release();}
 };
 const schedule=()=>{if(!alive||frame!==undefined||!view)return;frame=view.requestAnimationFrame(()=>{frame=undefined;render();});};
 const route=()=>{
  if(!alive)return;
  if(!settingsPresentationRoute(deps.route.get())){release();return;}
  if(!observing){observing=true;observer=view?.MutationObserver?new view.MutationObserver(render):undefined;observer?.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});stopGeometry=observeSettingsLayout(doc,next=>{layout=next;render();});}
  render();
 };
 const stop=()=>{if(!alive)return;alive=false;if(frame!==undefined)view?.cancelAnimationFrame(frame);safely(offRoute);safely(offArt);release();};
 try{offRoute=deps.route.subscribe(route);offArt=deps.backdrop.subscribe(schedule);route();}catch{stop();}
 return stop;
}
