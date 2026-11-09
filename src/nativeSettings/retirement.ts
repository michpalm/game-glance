/** Steam retires route DOM after notifying history subscribers. Hide only that
 * outgoing Settings subtree while its native exit runs; never delay navigation. */
export function createSettingsRetirement(doc:Document){
 const retired=new Map<HTMLElement,()=>void>();
 const restore=(element:HTMLElement)=>retired.get(element)?.();
 return{
  hide(element:HTMLElement){
   if(!element.isConnected||retired.has(element))return;
   const previous=element.getAttribute('data-gg-settings-retiring'),style=doc.createElement('style');
   style.dataset.ggSettingsRetirementStyle='true';style.textContent='[data-gg-settings-retiring="true"]{visibility:hidden!important;opacity:0!important;pointer-events:none!important}';
   let timer:ReturnType<typeof setTimeout>|undefined;
   const observer=doc.defaultView?.MutationObserver?new doc.defaultView.MutationObserver(()=>{if(!element.isConnected)restore(element);}):null;
   const release=()=>{
    retired.delete(element);if(timer!==undefined)clearTimeout(timer);observer?.disconnect();style.remove();
    if(element.getAttribute('data-gg-settings-retiring')==='true'){if(previous===null)element.removeAttribute('data-gg-settings-retiring');else element.setAttribute('data-gg-settings-retiring',previous);}
   };
   retired.set(element,release);
   try{doc.head.append(style);element.setAttribute('data-gg-settings-retiring','true');observer?.observe(doc.body,{subtree:true,childList:true});
    // Native exits observed at 200 ms; retain a bounded lease beyond Steam's
    // slower entry/exit transitions, even if a retired subtree is cached.
    timer=setTimeout(release,1200);
   }catch{release();}
  },restore,clear(){for(const release of [...retired.values()])release();}
 };
}
