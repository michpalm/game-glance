import {standardSettingRows} from './discovery';
import type {NativeSettingsShell,SettingsBackdrop} from './model';
import type {SettingsLayout} from './geometry';
import {nativeSettingsStyles} from './styles';
import {installCalmFilter} from '../styles/tokens';
type Markers=Map<HTMLElement,Map<string,string>>;
interface Claim {before:string|null;value:string}
/** Own only decoration and scoped markers. Native content, events and focus are untouched. */
export function createSettingsPresentation(doc:Document){
 const claims=new Map<HTMLElement,Map<string,Claim>>();
 let shell:NativeSettingsShell|null=null,layout:SettingsLayout|null=null,backdrop:SettingsBackdrop|null=null,style:HTMLStyleElement|null=null,art:HTMLDivElement|null=null,releaseCalm:(()=>void)|null=null,stopped=false;
 const ownedPopups=new Set<HTMLElement>();
 let pending:{source:HTMLElement;existing:Set<Element>}|null=null,expiry:ReturnType<typeof setTimeout>|undefined;
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
   mark(shell.container,'data-gg-settings','container');mark(shell.layout,'data-gg-settings','layout');mark(shell.navigation,'data-gg-settings','nav');mark(shell.pane,'data-gg-settings','pane');mark(shell.page,'data-gg-settings','page');
   for(const row of shell.page?standardSettingRows(shell.page):[])mark(row,'data-gg-settings-row',row.querySelector('[role="slider"]')?'slider':row.querySelector('[role="checkbox"]')?'toggle':'field');
   for(const popup of ownedPopups){if(!popup.isConnected){ownedPopups.delete(popup);continue;}mark(popup,'data-gg-settings','popup');}
   const vars=`[data-gg-settings="container"]{--gg-settings-left:${layout.left}px;--gg-settings-top:${layout.top}px;--gg-settings-width:${layout.width}px;--gg-settings-height:${layout.height}px;--gg-settings-sidebar:${layout.sidebarWidth}px;--gg-settings-base:${backdrop?'transparent':'#0c1016'}}`;
   const css=nativeSettingsStyles+vars;if(style.textContent!==css)style.textContent=css;
   if(backdrop){if(!art){art=doc.createElement('div');art.setAttribute('aria-hidden','true');}if(art.parentElement!==shell.container)shell.container.prepend(art);art.dataset.ggSettingsBackdrop=backdrop.mode;const image=`url(${JSON.stringify(backdrop.url)})`;if(art.style.backgroundImage!==image)art.style.backgroundImage=image;}else{art?.remove();art=null;}
  }else{style?.remove();style=null;art?.remove();art=null;releaseCalm?.();releaseCalm=null;ownedPopups.clear();disarm();}
  reconcile(next);
 }
 const intent=(event:Event)=>{
  if(!shell||!layout||!shell.container.isConnected)return;
  if(event.type==='vgp_onbuttondown'&&(event as CustomEvent<{button:number}>).detail?.button!==1)return;
  const target=event.target as Element|null,source=target?.closest<HTMLElement>('[role="combobox"],button.DialogButton');
  if(!source||!shell.page?.contains(source))return;
  disarm();pending={source,existing:new Set(doc.querySelectorAll(overlaySelector))};expiry=setTimeout(disarm,500);
 };
 const updatePopups=()=>{
  if(stopped||!shell)return;
  if(pending&&shell.page?.contains(pending.source)&&pending.source.isConnected){
   const popup=[...doc.querySelectorAll<HTMLElement>(overlaySelector)].find(e=>!pending!.existing.has(e)&&!shell!.container.contains(e)&&(e.contains(doc.activeElement)||!!e.querySelector('.gpfocus')));
   if(popup){ownedPopups.add(popup);disarm();}
  }
  if(ownedPopups.size)paint();
 };
 const observer=doc.defaultView?.MutationObserver?new doc.defaultView.MutationObserver(updatePopups):null;
 observer?.observe(doc.body,{subtree:true,childList:true});
 doc.addEventListener('pointerdown',intent,true);doc.addEventListener('vgp_onbuttondown',intent,true);doc.addEventListener('focusin',updatePopups,true);
 return {update(next:NativeSettingsShell|null,box:SettingsLayout|null,image:SettingsBackdrop|null){if(stopped)return;if(next?.container!==shell?.container||next?.page!==shell?.page){disarm();ownedPopups.clear();}shell=next;layout=box;backdrop=image;paint();},dispose(){if(stopped)return;this.update(null,null,null);stopped=true;disarm();observer?.disconnect();doc.removeEventListener('pointerdown',intent,true);doc.removeEventListener('vgp_onbuttondown',intent,true);doc.removeEventListener('focusin',updatePopups,true);}};
}
