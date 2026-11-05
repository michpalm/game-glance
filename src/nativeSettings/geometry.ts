import {homeFooterGroups} from '../home/homeControlsDom';
import {findTopBar} from '../home/topBar';
export interface Rect {left:number;top:number;width:number;height:number}
export interface SettingsLayout extends Rect {sidebarWidth:number}
const valid=(r:Rect)=>[r.left,r.top,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
export function settingsLayout({width,height,headers,footers}:{width:number;height:number;headers:readonly Rect[];footers:readonly Rect[]}):SettingsLayout|null {
 if(![width,height].every(Number.isFinite)||width<340||height<180)return null;
 const w=Math.min(1140,width-16),left=(width-w)/2;
 const relevant=(r:Rect)=>valid(r)&&r.left<width&&r.left+r.width>0&&r.top<height&&r.top+r.height>0;
 const top=Math.max(8,...headers.filter(r=>relevant(r)&&r.top<height/2).map(r=>r.top+r.height+8));
 const bottom=Math.min(height-8,...footers.filter(relevant).map(r=>r.top-8));
 const sidebarWidth=Math.min(210,Math.max(128,Math.round(width*.2/4)*4));
 if(bottom-top<120||w-sidebarWidth<180)return null;
 return {left,top,width:w,height:bottom-top,sidebarWidth};
}
function visible(e:Element):boolean {
 if(!e.isConnected||e.closest('[hidden],[inert],[aria-hidden="true"]'))return false;
 const view=e.ownerDocument.defaultView;
 for(let node:Element|null=e;node;node=node.parentElement){const s=view?.getComputedStyle?.(node);if(s?.display==='none'||s?.visibility==='hidden'||s?.opacity==='0')return false;}
 return true;
}
/** Measured style availability is shared with other native-settings boundaries. */
export const visibleSettingsElement=visible;
export function observeSettingsLayout(doc:Document,changed:(layout:SettingsLayout|null)=>void):()=>void {
 const view=doc.defaultView;if(!view){changed(null);return()=>{};}
 let stopped=false,frame:number|undefined,last:string|undefined;
 const observed=new Set<Element>();
 const ro=view.ResizeObserver?new view.ResizeObserver(()=>schedule()):null;
 const measure=()=>{
  if(stopped)return;
  const status=[...doc.querySelectorAll('.gg-status-host:not(.gg-menu-status-host) .gh-status')].filter(visible),native=findTopBar(doc,view.innerWidth),groups=homeFooterGroups(doc).filter(visible);
  const headers=status.length?status:native&&visible(native)?[native]:[];
  const elements=[doc.documentElement,...headers,...groups];
  for(const e of observed)if(!elements.includes(e)){ro?.unobserve?.(e);observed.delete(e);}
  for(const e of elements)if(!observed.has(e)){observed.add(e);ro?.observe(e);}
  // An unfamiliar visible footer must not be overlapped by guessed geometry.
  const footer=doc.getElementById('Footer'),unknown=footer&&visible(footer)&&!groups.length;
  const value=unknown?null:settingsLayout({width:view.innerWidth,height:view.innerHeight,headers:headers.map(e=>e.getBoundingClientRect()),footers:groups.map(e=>e.getBoundingClientRect())});
  const signature=JSON.stringify(value);if(signature!==last){last=signature;changed(value);}
 };
 const schedule=()=>{if(stopped||frame!==undefined)return;frame=view.requestAnimationFrame(()=>{frame=undefined;measure();});};
 const mo=view.MutationObserver?new view.MutationObserver(schedule):null;
 mo?.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden','inert','data-gh-footer','data-gh-footer-wrapper','data-gh-footer-side','data-gh-footer-edge']});
 view.addEventListener('resize',schedule);doc.addEventListener('transitionend',schedule,true);doc.addEventListener('animationend',schedule,true);measure();
 return()=>{if(stopped)return;stopped=true;if(frame!==undefined)view.cancelAnimationFrame(frame);mo?.disconnect();ro?.disconnect();view.removeEventListener('resize',schedule);doc.removeEventListener('transitionend',schedule,true);doc.removeEventListener('animationend',schedule,true);};
}
