import type {NativeSettingsShell} from './model';
/** The selectors in this boundary describe observed native structure, not a Valve API. */
export function discoverNativeSettings(doc:Document,path:string|null):NativeSettingsShell|null {
 if(!path||!/^\/settings(?:\/|$)/.test(path))return null;
 const candidates=[...doc.querySelectorAll<HTMLElement>('.PageListColumn')].filter(n=>!n.closest('[hidden],[inert],[aria-hidden="true"]'));
 if(candidates.length!==1)return null;
 const navigation=candidates[0],container=navigation.closest<HTMLElement>('.DialogContent'),layout=navigation.parentElement,pane=navigation.nextElementSibling as HTMLElement|null;
 if(!container||!layout||!pane?.matches('.DialogContentTransition')||!navigation.querySelector('[role="tab"]')||!container.contains(pane))return null;
 const pages=[...pane.querySelectorAll<HTMLElement>('.DialogContent')].filter(n=>!n.closest('[hidden],[inert],[aria-hidden="true"]'));
 if(pages.length>1)return null;
 return {container,layout,navigation,pane,page:pages[0]??null};
}
export function standardSettingRows(page:HTMLElement):readonly HTMLElement[] {
 return [...page.querySelectorAll<HTMLElement>('.DialogSettingsSection>.Panel')].filter(row=>{
  if(row.querySelector('[role="radiogroup"],[role="list"],[role="tablist"],input,textarea'))return false;
  const controls=row.querySelectorAll('[role="slider"],[role="checkbox"],[role="combobox"]');
  return controls.length===1||controls.length===0&&row.querySelectorAll('button.DialogButton').length===1;
 });
}
