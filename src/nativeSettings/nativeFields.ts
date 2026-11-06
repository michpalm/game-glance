/** Names come from Decky's runtime-discovered Steam class modules, never a saved hash. */
export interface NativeFieldClasses {field?:string;label?:string;description?:string;left?:string;track?:string;handle?:string}
export interface NativeColorClasses {page:string;controls:string;preview:string;section:string}
export const classElements=(root:Element,name:string|undefined):HTMLElement[]=>name?[...root.getElementsByClassName(name)] as HTMLElement[]:[];
export function markFieldParts(root:HTMLElement,classes:NativeFieldClasses,mark:(element:HTMLElement,name:string,value:string)=>void){
 for(const part of ['label','description','left','track','handle'] as const)for(const element of classElements(root,classes[part]))mark(element,'data-gg-settings-part',part);
 for(const field of classElements(root,classes.field)){
  const left=classElements(field,classes.left)[0];
  if(left&&field.children.length===2&&field.firstElementChild?.contains(left))mark(field.lastElementChild as HTMLElement,'data-gg-settings-part','value');
  if(field.closest('[role="radiogroup"]'))mark(field,'data-gg-settings-choice','true');
 }
}
