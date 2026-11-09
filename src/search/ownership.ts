import type {Stop} from './model';
export function installSearchOwnership(doc:Document,p:{ownsInput():boolean;roots():readonly HTMLElement[];fallback():HTMLElement|null;focus(node:HTMLElement):void}):Stop {
 let stopped=false,repairing=false,last:HTMLElement|null=null;
 const active=()=>!stopped&&p.ownsInput();
 const inside=(target:Node|null)=>!!target&&p.roots().some(root=>root===target||root.contains(target));
 const repair=()=>{if(!active()||repairing)return;const node=last?.isConnected&&inside(last)?last:p.fallback();if(!node?.isConnected)return;repairing=true;try{p.focus(node);}finally{repairing=false;}};
 const focus=(e:FocusEvent)=>{if(!active())return;const target=e.target as HTMLElement|null;if(inside(target)){last=target;return;}e.stopImmediatePropagation();repair();};
 const key=(e:KeyboardEvent)=>{if(!active())return;if(!inside(e.target as Node)){e.preventDefault();e.stopImmediatePropagation();repair();return;}if(e.key!=='Tab')return;
  const nodes=p.roots().flatMap(root=>[...root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')]).filter(node=>{const style=doc.defaultView?.getComputedStyle?.(node);return node.isConnected&&!node.hidden&&style?.visibility!=='hidden'&&style?.display!=='none';});
  if(!nodes.length){e.preventDefault();repair();return;}const at=nodes.indexOf(doc.activeElement as HTMLElement),next=(at+(e.shiftKey?-1:1)+nodes.length)%nodes.length;e.preventDefault();p.focus(nodes[next]);
 };
 const wheel=(e:Event)=>{if(!active())return;const target=e.target as HTMLElement|null,list=target?.closest?.<HTMLElement>('.gg-search-list');if(list&&inside(list)&&list.scrollHeight>list.clientHeight){const delta=(e as WheelEvent).deltaY;if(!Number.isFinite(delta)||delta<0&&list.scrollTop>0||delta>0&&list.scrollTop<list.scrollHeight-list.clientHeight)return;}e.preventDefault();};
 const escapedPad=()=>[...doc.querySelectorAll<HTMLElement>('.gpfocus')].some(node=>!inside(node)&&node.matches('button,input,[tabindex]'));
 const pad=(e:Event)=>{if(!active())return;const target=e.target as Node|null;if((target!==doc&&target!==doc.body&&!inside(target))||escapedPad()){e.preventDefault();e.stopImmediatePropagation();repair();}};
 const observer=doc.defaultView?.MutationObserver?new doc.defaultView.MutationObserver(records=>{if(active()&&records.some(r=>{const target=r.target as HTMLElement;return !inside(target)&&target.matches?.('.gpfocus:is(button,input,[tabindex])');}))repair();}):null;
 doc.addEventListener('focusin',focus,true);doc.addEventListener('keydown',key,true);doc.addEventListener('wheel',wheel,{capture:true,passive:false});doc.addEventListener('touchmove',wheel,{capture:true,passive:false});
 const events=['vgp_onok','vgp_onbuttondown','vgp_onbuttonup'];events.forEach(type=>doc.addEventListener(type,pad,true));observer?.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['class']});repair();
 return()=>{stopped=true;observer?.disconnect();doc.removeEventListener('focusin',focus,true);doc.removeEventListener('keydown',key,true);doc.removeEventListener('wheel',wheel,true);doc.removeEventListener('touchmove',wheel,true);events.forEach(type=>doc.removeEventListener(type,pad,true));};
}
