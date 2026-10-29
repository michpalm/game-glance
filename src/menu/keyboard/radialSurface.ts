import {installKeyboardOutsideTap} from '../navigation';
/** A body portal is part of the keyboard even though it is outside the menu's transformed root. */
export function installRadialSurface(field:HTMLElement,panels:()=>HTMLElement[],close:()=>void,resize:()=>void,view:Window|null=field.ownerDocument.defaultView):()=>void {
 if(!view)return ()=>{};
 const stop=installKeyboardOutsideTap(view,()=>[field,...panels()],close);
 view.addEventListener('resize',resize);view.visualViewport?.addEventListener('resize',resize);
 resize();
 return ()=>{stop();view.removeEventListener('resize',resize);view.visualViewport?.removeEventListener('resize',resize);};
}
