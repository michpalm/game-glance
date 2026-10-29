import {takeSteamFocus} from '../../home/steamFocus';
export interface KeyboardContext {host(field:HTMLElement):HTMLElement|null;ownsInput():boolean;restoreFocus(field:HTMLElement):void;completionLabel:string}
const SOCIAL:KeyboardContext={host:field=>field.closest<HTMLElement>('.gg-menu'),ownsInput:()=>true,completionLabel:'Send',restoreFocus:field=>{if(!field.isConnected)return;const target=field.matches('button')?field:field.querySelector<HTMLElement>('button')??field;target.focus({preventScroll:true});takeSteamFocus(target);}};
export const keyboardContext=(context?:KeyboardContext):KeyboardContext=>context??SOCIAL;
