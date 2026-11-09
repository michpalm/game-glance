import type {SettingsMotionScene} from './motion';
import {markFieldParts,type NativeFieldClasses} from './nativeFields';
import {standardSettingRows,settingSurfaces} from './discovery';
import type {NativeSettingsShell,SettingsBackdrop} from './model';
import {visibleSettingsElement,withSettingsHeading,type SettingsLayout} from './geometry';
import {nativePickerOwns} from './nativePicker';
import {nativeSettingsStyles} from './styles';
import {installCalmFilter} from '../styles/tokens';
type Markers=Map<HTMLElement,Map<string,string>>;
interface Claim {before:string|null;value:string}
/** Own only decoration and scoped markers. Native content, events and focus are untouched. */
export function createSettingsPresentation(doc:Document,fields:NativeFieldClasses={}){
 const claims=new Map<HTMLElement,Map<string,Claim>>();
 let shell:NativeSettingsShell|null=null,layout:SettingsLayout|null=null,backdrop:SettingsBackdrop|null=null,style:HTMLStyleElement|null=null,art:HTMLDivElement|null=null,title:HTMLDivElement|null=null,releaseCalm:(()=>void)|null=null,artUrl:string|null=null,stopped=false;
 let routeMotion:HTMLElement|null=null;
 const ownedPopups=new Map<HTMLElement,HTMLElement>();
 let pending:{source:HTMLElement;existing:Set<Element>}|null=null,expiry:ReturnType<typeof setTimeout>|undefined;
 let retryFrame:number|undefined;
 const settling=new Map<HTMLElement,{until:number;remaining:number}>();
 const clearSettling=()=>{if(retryFrame!==undefined)doc.defaultView?.cancelAnimationFrame(retryFrame);retryFrame=undefined;settling.clear();};
 const overlaySelector='[role="listbox"],[role="dialog"],[role="alertdialog"]';
 const disarm=()=>{pending=null;if(expiry!==undefined)clearTimeout(expiry);expiry=undefined;};
 const release=(e:HTMLElement,name:string,c:Claim)=>{if(e.getAttribute(name)!==c.value)return;if(c.before===null)e.removeAttribute(name);else e.setAttribute(name,c.before);};
 function reconcile(next:Markers){
  for(const [e,map] of claims){for(const [name,c] of map)if(!next.get(e)?.has(name)){release(e,name,c);map.delete(name);}if(!map.size)claims.delete(e);}
  for(const [e,attrs] of next){let map=claims.get(e);if(!map){map=new Map();claims.set(e,map);}for(const [name,value] of attrs){let c=map.get(name);if(!c){c={before:e.getAttribute(name),value};map.set(name,c);}c.value=value;if(e.getAttribute(name)!==value)e.setAttribute(name,value);}}
 }
 function paint(){
  if(stopped)return;
  const next:Markers=new Map(),mark=(e:HTMLElement|null,name:string,value:string)=>{if(!e)return;let map=next.get(e);if(!map){map=new Map();next.set(e,map);}map.set(name,value);};
  if(shell&&layout&&shell.container.isConnected){
   if(!style){style=doc.createElement('style');style.dataset.ggSettingsStyle='true';doc.head.append(style);releaseCalm=installCalmFilter(doc);}
   // Steam's route host otherwise adds a delayed .95->1 scale/opacity
   // transition above our stationary panel. Discover only that ancestor below
   // #Main, retain the scoped claim while mounted, and restore it on release.
   if(routeMotion&&!routeMotion.contains(shell.container))routeMotion=null;
   if(!routeMotion&&shell.container.closest('#Main'))for(let host=shell.container.parentElement;host&&host!==doc.body&&host.id!=='Main';host=host.parentElement){const properties=doc.defaultView?.getComputedStyle?.(host)?.transitionProperty?.split(',').map(p=>p.trim());if(properties?.includes('transform')&&properties.includes('opacity')){routeMotion=host;break;}}
   mark(routeMotion,'data-gg-settings-route-motion','true');
   mark(shell.container,'data-gg-settings','container');mark(shell.layout,'data-gg-settings','layout');mark(shell.navigation,'data-gg-settings','nav');mark(shell.pane,'data-gg-settings','pane');
   if(!title){title=doc.createElement('div');title.dataset.ggSettingsTitle='true';title.textContent='Settings';title.setAttribute('role','heading');title.setAttribute('aria-level','1');}
   if(title.parentElement!==shell.container)shell.container.append(title);
   for(const page of shell.pages??(shell.page?[shell.page]:[])){
    mark(page,'data-gg-settings','page');
    for(let host=page.parentElement;host&&host!==shell.pane;host=host.parentElement)mark(host,'data-gg-settings','page-host');
    markFieldParts(page,fields,mark);
    for(const list of page.querySelectorAll<HTMLElement>('[role="tablist"]')){const overflow=doc.defaultView?.getComputedStyle?.(list).overflowX;if(overflow==='scroll'||overflow==='auto')mark(list,'data-gg-settings-scroll-row','true');}
    for(const row of settingSurfaces(page,fields))mark(row,'data-gg-settings-surface','true');
    for(const row of standardSettingRows(page,fields))mark(row,'data-gg-settings-row',row.querySelector('[role="slider"]')?'slider':row.querySelector('[role="checkbox"]')?'toggle':'field');
   }
   for(const [popup,source] of ownedPopups){if(!associated(source,popup)){ownedPopups.delete(popup);continue;}mark(popup,'data-gg-settings','popup');}
   const vars=`[data-gg-settings="container"]{--gg-settings-left:${layout.left}px;--gg-settings-top:${layout.top}px;--gg-settings-width:${layout.width}px;--gg-settings-height:${layout.height}px;--gg-settings-sidebar:${layout.sidebarWidth}px;--gg-settings-base:${backdrop?'transparent':'#0c1016'}}`;
   const css=nativeSettingsStyles+vars;if(style.textContent!==css)style.textContent=css;
   if(backdrop){if(!art){art=doc.createElement('div');art.setAttribute('aria-hidden','true');}if(art.parentElement!==shell.container)shell.container.prepend(art);art.dataset.ggSettingsBackdrop=backdrop.mode;const image=`url(${JSON.stringify(backdrop.url)})`;if(artUrl!==backdrop.url){art.style.backgroundImage=image;artUrl=backdrop.url;}}else{art?.remove();art=null;artUrl=null;}
  }else{routeMotion=null;style?.remove();style=null;art?.remove();art=null;artUrl=null;title?.remove();title=null;releaseCalm?.();releaseCalm=null;ownedPopups.clear();disarm();clearSettling();}
  reconcile(next);
 }
 function associated(source:HTMLElement,popup:HTMLElement):boolean {
  if(!shell?.page?.contains(source)||!visibleSettingsElement(source)||!visibleSettingsElement(popup)||source.getAttribute('aria-expanded')==='false')return false;
  const ids=[source.getAttribute('aria-controls'),source.getAttribute('aria-owns')].filter(Boolean).join(' ').split(/\s+/);
  const explicit=ids.some(id=>{const owner=doc.getElementById(id);return !!owner&&(owner===popup||owner.contains(popup));});
  if(explicit)return true;
  if(source.getAttribute('role')!=='combobox'||source.getAttribute('aria-expanded')!=='true'||popup.getAttribute('role')!=='listbox')return false;
  return nativePickerOwns(source,popup);
 }
 const intent=(event:Event)=>{
  if(!shell||!layout||!shell.container.isConnected)return;
  if(event.type==='vgp_onbuttondown'&&(event as CustomEvent<{button:number}>).detail?.button!==1)return;
  const target=event.target as Element|null,source=target?.closest<HTMLElement>('[role="combobox"],[aria-controls],[aria-owns]');
  if(!source||!shell.page?.contains(source))return;
  disarm();pending={source,existing:new Set(doc.querySelectorAll(overlaySelector))};expiry=setTimeout(disarm,500);
 };
 const updatePopups=()=>{
  if(stopped||!shell)return;
  if(pending&&shell.page?.contains(pending.source)&&pending.source.isConnected){
   const popup=[...doc.querySelectorAll<HTMLElement>(overlaySelector)].find(e=>!pending!.existing.has(e)&&!shell!.container.contains(e)&&associated(pending!.source,e));
   if(popup){ownedPopups.set(popup,pending.source);disarm();}
  }
  // Native refs can settle after the portal's DOM/focus events. Recheck only
  // briefly while a real picker is expanded, without weakening ownership.
  const sources=[...shell.page?.querySelectorAll<HTMLElement>('[aria-expanded="true"][aria-controls],[aria-expanded="true"][aria-owns]')??[]];
  for(const source of settling.keys())if(!sources.includes(source))settling.delete(source);
  let retry=false;
  for(const source of sources){
   let found=false;
   for(const popup of doc.querySelectorAll<HTMLElement>(overlaySelector))if(!shell.container.contains(popup)&&associated(source,popup)){ownedPopups.set(popup,source);found=true;}
   if(found){settling.delete(source);continue;}
   let window=settling.get(source);if(!window){window={until:Date.now()+500,remaining:30};settling.set(source,window);}
   if(window.remaining>0&&Date.now()<window.until)retry=true;
  }
  if(retry&&retryFrame===undefined&&doc.defaultView?.requestAnimationFrame){
   for(const window of settling.values())window.remaining--;
   retryFrame=doc.defaultView.requestAnimationFrame(()=>{retryFrame=undefined;updatePopups();});
  }else if(!retry&&retryFrame!==undefined){doc.defaultView?.cancelAnimationFrame(retryFrame);retryFrame=undefined;}

  if(ownedPopups.size)paint();
 };
 const observer=doc.defaultView?.MutationObserver?new doc.defaultView.MutationObserver(updatePopups):null;
 observer?.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-controls','aria-owns','aria-expanded','hidden','inert','aria-hidden','style','class','id']});
 doc.addEventListener('pointerdown',intent,true);doc.addEventListener('click',intent,true);doc.addEventListener('vgp_onbuttondown',intent,true);doc.addEventListener('focusin',updatePopups,true);
 return {scene():SettingsMotionScene|null{return !stopped&&shell&&layout&&style&&title?{container:shell.container,panel:shell.layout,heading:title,art,backdrop,layout}:null;},update(next:NativeSettingsShell|null,box:SettingsLayout|null,image:SettingsBackdrop|null){if(stopped)return;if(next?.container!==shell?.container||next?.page!==shell?.page){disarm();ownedPopups.clear();clearSettling();}shell=next;layout=withSettingsHeading(box);backdrop=image;paint();updatePopups();},dispose(){if(stopped)return;this.update(null,null,null);stopped=true;disarm();clearSettling();observer?.disconnect();doc.removeEventListener('pointerdown',intent,true);doc.removeEventListener('click',intent,true);doc.removeEventListener('vgp_onbuttondown',intent,true);doc.removeEventListener('focusin',updatePopups,true);}};
}
