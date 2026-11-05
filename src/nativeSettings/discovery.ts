import type {NativeSettingsShell} from './model';
/** The selectors in this boundary describe observed native structure, not a Valve API. */
export function discoverNativeSettings(doc:Document,path:string|null):NativeSettingsShell|null {
 if(!path||!/^\/settings(?:\/|$)/.test(path))return null;
 const candidates=[...doc.querySelectorAll<HTMLElement>('.PageListColumn')].filter(n=>!n.closest('[hidden],[inert],[aria-hidden="true"]'));
 if(candidates.length!==1||candidates[0].children.length!==1)return null;
 const navigation=candidates[0],container=navigation.closest<HTMLElement>('.DialogContent'),layout=navigation.parentElement,pane=navigation.nextElementSibling as HTMLElement|null;
 if(!container||!layout||!pane?.matches('.DialogContentTransition')||!navigation.querySelector('[role="tab"]')||!container.contains(pane))return null;
 const pages=[...pane.querySelectorAll<HTMLElement>('.DialogContent')].filter(n=>!n.closest('[hidden],[inert],[aria-hidden="true"]'));
 // Native category transitions briefly contain both pages, or an empty loading host.
 if(pages.length>2)return null;
 for(const page of pages){
  if(![...page.children].some(e=>e.matches('.DialogContent_InnerWidth')))return null;
  for(let host=page.parentElement;host&&host!==pane;host=host.parentElement)if(host.children.length!==1)return null;
 }
 if(!pages.length&&pane.querySelector('button,input,textarea,[tabindex],[role]'))return null;
 return {container,layout,navigation,pane,page:pages[pages.length-1]??null,pages};
}
/** Native labelled rows also occur outside DialogSettingsSection (Display, Downloads, etc.). */
export function settingSurfaces(page:HTMLElement):readonly HTMLElement[] {
 const labelled=[...page.querySelectorAll<HTMLElement>('[id$="_Label"]')].map(e=>e.closest<HTMLElement>('.Panel')).filter((e):e is HTMLElement=>!!e&&e!==page&&page.contains(e));
 return [...new Set([...page.querySelectorAll<HTMLElement>('.DialogSettingsSection>.Panel'),...labelled])];
}
export function standardSettingRows(page:HTMLElement):readonly HTMLElement[] {
 return settingSurfaces(page).filter(row=>{
  if(row.querySelector('[role="radiogroup"],[role="list"],[role="tablist"],input,textarea'))return false;
  const controls=row.querySelectorAll('[role="slider"],[role="checkbox"],[role="combobox"]');
  const extra=[...row.querySelectorAll('button,[role=button],a[href]')].filter(action=>![...controls].some(control=>control===action||control.contains(action)||action.contains(control)));
  return controls.length===1&&extra.length===0||controls.length===0&&extra.length===1&&extra[0].matches('button.DialogButton');
 });
}
