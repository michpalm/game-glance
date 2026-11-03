import {type RefObject,useEffect,useState} from 'react';
import {useChromeClaim} from '../chrome/useChromeClaim';
import {useChromeOwnsBar} from '../chrome/useChrome';
import {LAUNCH_INTENT_MS} from '../data/launchIntent';
import {focusElement} from './homeNav';
import {homeReturnTarget} from './useHomeControls';

/**
 * Home's claim on the chrome host while mounted (chrome/useChromeClaim): its feed sheet hides the bar, Play's launch
 * steps the host aside, and Down/B's last resort is Home's own target (the last action, Play, then the recents row).
 * `launching` is read each render and again when a launch mark would have run out. `ownBar`: the host does not have the
 * bar (Expanded Home controls off, or stepped aside), so Home draws its own read-only one as before.
 */
export function useHomeClaim(o:{root:RefObject<HTMLElement|null>;lastAction:RefObject<HTMLElement|null>;recents:RefObject<HTMLElement|null>;statusHidden:boolean;launching():boolean}):{ownBar:boolean} {
    const launching=o.launching(),[,recheck]=useState(0);
    useEffect(()=>{if(!launching)return undefined;const timer=setTimeout(()=>recheck(n=>n+1),LAUNCH_INTENT_MS);return ()=>clearTimeout(timer);},[launching]);
    useChromeClaim({page:'home',statusHidden:o.statusHidden,launching,returnHome:()=>{const root=o.root.current;if(root)focusElement(homeReturnTarget(root,o.lastAction.current,o.recents.current),'the Home action');}});
    return {ownBar:!useChromeOwnsBar()};
}
