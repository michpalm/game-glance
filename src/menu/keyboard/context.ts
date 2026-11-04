import {takeSteamFocus} from '../../home/steamFocus';
export interface KeyboardRect {left:number;top:number;width:number;height:number}
export interface KeyboardContext {placementBounds?():KeyboardRect|null;onBoundsChange?(rects:readonly KeyboardRect[]):void;host(field:HTMLElement):HTMLElement|null;ownsInput():boolean;restoreFocus(field:HTMLElement):void;completionLabel:string}
const SOCIAL:KeyboardContext={host:field=>field.closest<HTMLElement>('.gg-menu'),ownsInput:()=>true,completionLabel:'Send',restoreFocus:field=>{if(!field.isConnected)return;const target=field.matches('button')?field:field.querySelector<HTMLElement>('button')??field;target.focus({preventScroll:true});takeSteamFocus(target);}};
export const keyboardContext=(context?:KeyboardContext):KeyboardContext=>context??SOCIAL;

const reporters=new WeakMap<KeyboardContext,object>();
export function createKeyboardBoundsReporter(context:KeyboardContext){
 const token={},callback=context.onBoundsChange;let last='',disposed=false;reporters.set(context,token);
 const report=(rects:readonly KeyboardRect[])=>{if(disposed||reporters.get(context)!==token)return;const key=JSON.stringify(rects);if(key===last)return;last=key;callback?.(rects);};
 return {report,dispose(){if(disposed)return;report([]);disposed=true;if(reporters.get(context)===token)reporters.delete(context);}};
}
export function keyboardViewport(context:KeyboardContext|undefined,view:KeyboardRect):KeyboardRect {
 const band=context?.placementBounds?.();if(!band||![band.left,band.top,band.width,band.height].every(Number.isFinite)||band.width<=0||band.height<=0)return view;
 const left=Math.max(view.left,band.left),top=Math.max(view.top,band.top);
 return {left,top,width:Math.max(1,Math.min(view.left+view.width,band.left+band.width)-left),height:Math.max(1,Math.min(view.top+view.height,band.top+band.height)-top)};
}
