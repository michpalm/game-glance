import {classElements,markFieldParts,type NativeFieldClasses,type NativeColorClasses} from './nativeFields';
import type {SettingsLayout} from './geometry';
import {nativeSettingsStyles} from './styles';
interface ColorPage {page:HTMLElement;controls:HTMLElement;sections:readonly HTMLElement[]}
export function discoverColorSettings(doc:Document,path:string|null,classes:NativeColorClasses|undefined):ColorPage|null {
 if(path!=='/colorsettings'||!classes)return null;
 const pages=classElements(doc.documentElement,classes.page).filter(e=>!e.closest('[hidden],[inert],[aria-hidden="true"]'));
 if(pages.length!==1)return null;
 const page=pages[0],controls=classElements(page,classes.controls),preview=classElements(page,classes.preview);
 if(controls.length!==1||preview.length!==1||controls[0].contains(preview[0]))return null;
 const sections=classElements(controls[0],classes.section);
 if(sections.length!==2||sections.some(e=>!e.querySelector('[role="slider"]')))return null;
 return{page,controls:controls[0],sections};
}
/** Decorate only the native controls. The calibration image is never filtered,
 * replaced or included in the decorative backdrop. Native handlers own values. */
export function createColorSettingsPresentation(doc:Document,fields:NativeFieldClasses={}){
 const claims=new Map<HTMLElement,Map<string,{before:string|null;value:string}>>();
 let style:HTMLStyleElement|null=null,stopped=false;
 function update(page:ColorPage|null,layout:SettingsLayout|null){
  if(stopped)return;
  const next=new Map<HTMLElement,Map<string,string>>(),mark=(e:HTMLElement,k:string,v:string)=>{let attrs=next.get(e);if(!attrs){attrs=new Map();next.set(e,attrs);}attrs.set(k,v);};
  if(page&&layout&&page.controls.isConnected){
   mark(page.controls,'data-gg-settings','color-controls');for(const section of page.sections)mark(section,'data-gg-settings-color-section','true');
   markFieldParts(page.controls,fields,mark);
   if(!style){style=doc.createElement('style');style.dataset.ggSettingsColorStyle='true';doc.head.append(style);}
   const css=nativeSettingsStyles+`[data-gg-settings="color-controls"]{--gg-color-left:${layout.left}px;--gg-color-width:${layout.width}px;--gg-color-bottom:calc(100% - ${layout.top+layout.height}px);--gg-color-max-height:${layout.height}px}`;
   if(style.textContent!==css)style.textContent=css;
  }else{style?.remove();style=null;}
  for(const [e,attrs] of claims){for(const [k,c] of attrs)if(!next.get(e)?.has(k)){if(e.getAttribute(k)===c.value){if(c.before===null)e.removeAttribute(k);else e.setAttribute(k,c.before);}attrs.delete(k);}if(!attrs.size)claims.delete(e);}
  for(const [e,attrs] of next){let owned=claims.get(e);if(!owned){owned=new Map();claims.set(e,owned);}for(const [k,v] of attrs){if(!owned.has(k))owned.set(k,{before:e.getAttribute(k),value:v});if(e.getAttribute(k)!==v)e.setAttribute(k,v);}}
 }
 return{update,dispose(){if(stopped)return;update(null,null);stopped=true;}};
}
