import {type RefObject,useEffect,useState,useSyncExternalStore} from 'react';
import {useChromeClaim,usePageShown} from '../chrome/useChromeClaim';
import {useChromeOwnsBar} from '../chrome/useChrome';
import {LAUNCH_INTENT_MS,launchVersion,subscribeLaunch} from '../data/launchIntent';
import {focusElement} from './homeNav';
import {homeReturnTarget} from './useHomeControls';

/**
 * Home's claim on the chrome host while mounted (chrome/useChromeClaim): its feed sheet hides the bar, Play's launch
 * steps the host aside, and Down/B's last resort is Home's own target (the last action, Play, then the recents row).
 * `launching` is re-read on each launch mark or clear and when the latest mark runs out. `ownBar`: the host does not draw its
 * bar (Expanded Home controls off, or stepped aside), so Home draws its own read-only one as before.
 */
export function useHomeClaim(o:{root:RefObject<HTMLElement|null>;lastAction:RefObject<HTMLElement|null>;recents:RefObject<HTMLElement|null>;statusHidden:boolean;launching():boolean}):{ownBar:boolean} {
    // Re-read on every launch mark or clear (Play marks it and runs the game without a render of Home's own), and once
    // the latest mark would have run out: the timer re-arms on each mark and recheck.
    const marks=useSyncExternalStore(subscribeLaunch,launchVersion),[checks,recheck]=useState(0),launching=o.launching();
    useEffect(()=>{if(!launching)return undefined;const timer=setTimeout(()=>recheck(n=>n+1),LAUNCH_INTENT_MS);return ()=>clearTimeout(timer);},[launching,marks,checks]);
    // Claimed from mount, before Home's content is up: a cold start has our footer at once. Only while Home is rendered.
    const shown=usePageShown(o.root);
    useChromeClaim(!shown?null:{page:'home',statusHidden:o.statusHidden,launching,returnHome:()=>{const root=o.root.current;if(root)focusElement(homeReturnTarget(root,o.lastAction.current,o.recents.current),'the Home action');}});
    return {ownBar:!useChromeOwnsBar()};
}
