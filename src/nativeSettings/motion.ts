import {TOKENS,frostFilter,tokenCss,installCalmFilter} from '../styles/tokens';
import type {SettingsLayout} from './geometry';
import {visibleSettingsElement} from './geometry';
import type {SettingsBackdrop} from './model';
export interface SettingsMotionScene {container:HTMLElement;panel:HTMLElement;heading:HTMLElement;art:HTMLElement|null;backdrop:SettingsBackdrop|null;layout:SettingsLayout}
interface Entry {animations:Animation[];underlay:HTMLElement|null;timer:ReturnType<typeof setTimeout>}
interface Exit {releaseCalm:()=>void;root:HTMLElement;style:HTMLStyleElement;animation:Animation|null;frame:number|undefined;timer:ReturnType<typeof setTimeout>;account:string|null;path:string;scene:SettingsMotionScene}
const DURATION=TOKENS.motion.base,WAIT=250,EASE='cubic-bezier(.2,.8,.2,1)';
const opacity=(doc:Document,e:HTMLElement)=>{const value=Number(doc.defaultView?.getComputedStyle?.(e)?.opacity??1);return Number.isFinite(value)?value:1;};
/** Only our panel/art/heading animate. Exit carries decoration, never copied
 * native controls, so routing and input can proceed without a delayed action. */
export function createSettingsMotion(doc:Document,deps:{account?:()=>string|null;ready?:(path:string,scene:SettingsMotionScene)=>boolean}={}){
 const view=doc.defaultView,media=view?.matchMedia?.('(prefers-reduced-motion: reduce)');
 let current:SettingsMotionScene|null=null,owner:string|null=null,entry:Entry|null=null,exit:Exit|null=null,disposed=false;
 const account=()=>{try{return deps.account?.()??null;}catch{return null;}};
 const supported=()=>!disposed&&!media?.matches&&typeof doc.documentElement.animate==='function'&&typeof view?.getComputedStyle==='function'&&typeof view?.requestAnimationFrame==='function';
 const cancel=(animation:Animation)=>{try{animation.cancel();}catch{/* A retired native window cannot block cleanup. */}};
 function clearEntry(){const old=entry;entry=null;if(!old)return;clearTimeout(old.timer);old.underlay?.remove();for(const animation of old.animations)cancel(animation);}
 function clearExit(){const old=exit;exit=null;if(!old)return;clearTimeout(old.timer);if(old.frame!==undefined)view?.cancelAnimationFrame(old.frame);old.root.remove();old.style.remove();old.releaseCalm();if(old.animation)cancel(old.animation);}
 function reset(){clearEntry();clearExit();current=null;owner=null;}
 function checkAccount(){const next=account();if((current||exit)&&next!==(exit?.account??owner))reset();}
 function ready(path:string,scene:SettingsMotionScene):boolean {
  if(deps.ready)return deps.ready(path,scene);
  const selector=path==='/library/home'?'.gh-root':/^\/library\/app\/\d+(?:\/|$)/.test(path)?'.gg-hero':null;
  if(selector&&[...doc.querySelectorAll<HTMLElement>(selector)].some(visibleSettingsElement))return true;
  return !visibleSettingsElement(scene.container);
 }
 function fadeExit(state:Exit){
  if(exit!==state||state.animation)return;
  if(state.account!==account()||!supported()){clearExit();return;}
  if(state.frame!==undefined)view?.cancelAnimationFrame(state.frame);state.frame=undefined;
  clearTimeout(state.timer);state.root.dataset.ggSettingsTransitionPhase='fading';
  try{state.animation=state.root.animate([{opacity:1},{opacity:0}],{duration:DURATION,easing:EASE,fill:'both'});
   state.animation.finished.then(()=>{if(exit===state)clearExit();},()=>{if(exit===state)clearExit();});
   state.timer=setTimeout(()=>{if(exit===state)clearExit();},DURATION+50);
  }catch{clearExit();}
 }
 function pollExit(state:Exit){
  if(exit!==state)return;state.frame=undefined;
  if(state.account!==account()||!state.root.isConnected||!supported()){clearExit();return;}
  let destination=false;try{destination=ready(state.path,state.scene);}catch{/* bounded fallback below */}
  if(destination){fadeExit(state);return;}
  state.frame=view?.requestAnimationFrame(()=>pollExit(state));
 }
 function update(scene:SettingsMotionScene|null,animate=true){
  if(disposed)return;checkAccount();
  if(!scene){clearEntry();current=null;return;}
  if(current?.panel===scene.panel){if(current.backdrop?.url!==scene.backdrop?.url)clearEntry();current=scene;return;}
  const returning=!!exit,from=exit?opacity(doc,exit.root):0;
  clearEntry();clearExit();current=scene;owner=account();
  if(!animate||!supported())return;
  const animations:Animation[]=[],start=returning?from:0;let underlay:HTMLElement|null=null;
  try{
   animations.push(scene.panel.animate([{opacity:start},{opacity:1}],{duration:DURATION,easing:EASE,fill:'both'}));
   animations.push(scene.heading.animate([{opacity:start},{opacity:1}],{duration:DURATION,easing:EASE,fill:'both'}));
   if(!returning&&scene.art&&scene.backdrop?.mode==='full'){
    underlay=doc.createElement('div');underlay.dataset.ggSettingsMotionUnderlay='true';underlay.setAttribute('aria-hidden','true');underlay.setAttribute('inert','');underlay.style.cssText='position:fixed;inset:-48px;z-index:-1;pointer-events:none;background-position:center;background-size:cover';underlay.style.backgroundImage=`url(${JSON.stringify(scene.backdrop.url)})`;scene.art.before(underlay);
    animations.push(scene.art.animate([{opacity:0},{opacity:1}],{duration:DURATION,easing:EASE,fill:'both'}));
   }
   const state:Entry={animations,underlay,timer:setTimeout(()=>{if(entry===state)clearEntry();},DURATION+50)};entry=state;
   Promise.all(animations.map(a=>a.finished)).then(()=>{if(entry===state)clearEntry();},()=>{if(entry===state)clearEntry();});
  }catch{underlay?.remove();for(const animation of animations){animation.finished.catch(()=>{});cancel(animation);}}
 }
 function leave(path:string){
  if(disposed)return;checkAccount();
  if(!current){if(exit?.path!==path)clearExit();return;}
  const scene=current,stamp=owner,panelOpacity=opacity(doc,scene.panel),headingOpacity=opacity(doc,scene.heading),artOpacity=scene.art?opacity(doc,scene.art):1,hadUnderlay=!!entry?.underlay;
  // Use the durable page/footer ancestor, below Steam's footer (7000) and
  // outside its retiring route. Unknown chrome structure gets an instant exit.
  const footer=doc.getElementById('Footer');let parent=scene.container.parentElement;
  while(parent&&footer&&!parent.contains(footer))parent=parent.parentElement;
  clearExit();current=null;
  if(!supported()||!footer||!parent||parent===doc.body||parent===doc.documentElement){clearEntry();return;}
  const root=doc.createElement('div'),style=doc.createElement('style'),panel=doc.createElement('div'),heading=doc.createElement('div');
  root.dataset.ggSettingsTransition='exit';root.dataset.ggSettingsTransitionPhase='waiting';root.setAttribute('aria-hidden','true');root.setAttribute('inert','');root.style.cssText='position:fixed;inset:0;z-index:1000;pointer-events:none;isolation:isolate';
  const computed=view?.getComputedStyle(scene.container),accent=computed?.getPropertyValue('--gg-accent');if(accent)root.style.setProperty('--gg-accent',accent);
  style.dataset.ggSettingsMotionStyle='true';style.textContent=tokenCss('[data-gg-settings-transition]')+`[data-gg-settings-transition] [data-gg-settings-transition-art]{position:fixed;inset:-48px;z-index:-1;background-position:center;background-size:cover;pointer-events:none;filter:${frostFilter(scene.backdrop?.mode==='fallback'?'42px':'16px')} saturate(${scene.backdrop?.mode==='fallback'?'.7':'.8'}) brightness(${scene.backdrop?.mode==='fallback'?'.7':'.8'})}`;
  if(scene.backdrop){
   if(hadUnderlay){const raw=doc.createElement('div');raw.style.cssText='position:fixed;inset:-48px;z-index:-1;background-position:center;background-size:cover;pointer-events:none';raw.style.backgroundImage=`url(${JSON.stringify(scene.backdrop.url)})`;root.append(raw);}
   const art=doc.createElement('div');art.dataset.ggSettingsTransitionArt='true';art.style.backgroundImage=`url(${JSON.stringify(scene.backdrop.url)})`;art.style.opacity=String(artOpacity);root.append(art);
  }else root.style.background='#0c1016';
  const l=scene.layout;panel.style.cssText=`position:fixed;left:${l.left}px;top:${l.top}px;width:${l.width}px;height:${l.height}px;box-sizing:border-box;background:${TOKENS.glass};border:1px solid var(--gg-edge);border-radius:16px;backdrop-filter:blur(16px);opacity:${panelOpacity}`;
  const hs=view?.getComputedStyle(scene.heading);heading.textContent=scene.heading.textContent;heading.style.cssText=`position:fixed;left:${l.left}px;top:${l.top-36}px;width:${l.sidebarWidth}px;height:28px;box-sizing:border-box;padding:0 8px;font-size:21px;line-height:28px;font-weight:700;color:var(--gg-text);text-shadow:var(--gg-text-shadow);opacity:${headingOpacity}`;if(hs?.fontFamily)heading.style.fontFamily=hs.fontFamily;
  root.append(panel,heading);clearEntry();doc.head.append(style);parent.append(root);
  const state:Exit={releaseCalm:installCalmFilter(doc),root,style,animation:null,frame:undefined,account:stamp,path,scene,timer:setTimeout(()=>fadeExit(state),WAIT)};exit=state;state.frame=view?.requestAnimationFrame(()=>pollExit(state));
 }
 const reduced=()=>{if(media?.matches){clearEntry();clearExit();}};media?.addEventListener?.('change',reduced);
 return{update,exit:leave,checkAccount,reset,dispose(){if(disposed)return;reset();disposed=true;media?.removeEventListener?.('change',reduced);}};
}
