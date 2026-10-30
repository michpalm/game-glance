import {type RefObject,useLayoutEffect,useRef,useState} from 'react';
import {acquireHomeFooter} from './homeControlsDom';
import {homeFooterSuspended} from './useHomeControls';
import {getSteamUiState,subscribeSteamUiState} from './steamUiState';

/**
 * The game page's share of Home's footer lease (homeControlsDom): the same owner-counted markers, measured against the
 * viewport (the page has no full-screen root of ours), so Home and the page can hold the footer at once through the open
 * transition and back. Footer only: no header, Search, status or focus. Suspended as Home's footer is (not foreground, a
 * side menu, Steam's launch screen, disconnected or hidden); there is no opening here. Before paint (layout effect), so
 * it is held in the same commit the page mounts in; `key` re-binds when the anchor may have come or gone (the game). Returns whether the footer is ours (render homeFooterCss then).
 */
export function usePageFooter(anchor:RefObject<HTMLElement|null>,enabled:boolean,launching:boolean,key:unknown=null):boolean {
    const live=useRef({enabled,launching});live.current={enabled,launching};
    const runtime=useRef<{sync():void}|null>(null);
    const [shown,setShown]=useState(false);
    useLayoutEffect(()=>{
        const node=anchor.current;if(!node)return undefined;
        const doc=node.ownerDocument,win=doc.defaultView;
        let lease:ReturnType<typeof acquireHomeFooter>|null=null,ready=false,disposed=false,queued=false;
        const queue=()=>{if(disposed||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;sync();});};
        const sync=()=>{
            if(disposed)return;
            const {enabled:wanted,launching:launch}=live.current,ui=getSteamUiState(doc);
            const suspended=homeFooterSuspended({foreground:doc.hasFocus(),menu:ui.menu,opening:false,launching:launch,connected:node.isConnected,hidden:doc.visibilityState==='hidden'||!!node.closest('[hidden],[inert],[aria-hidden="true"]')});
            if(!wanted){lease?.dispose();lease=null;ready=false;}
            if(wanted&&!suspended&&!lease)lease=acquireHomeFooter(doc.documentElement,value=>{ready=value;queue();});
            lease?.suspend(suspended);
            const value=wanted&&!suspended&&ready;setShown(previous=>previous===value?previous:value);
        };
        // Subscribed first: the shared store refreshes on its first listener, so the side-menu reading is current (no Steam call of our own).
        const stopUi=subscribeSteamUiState(doc,sync);
        runtime.current={sync};sync();
        doc.addEventListener('visibilitychange',sync);win?.addEventListener('focus',sync);win?.addEventListener('blur',sync);
        const observer=win?.MutationObserver?new win.MutationObserver(queue):null;
        for(let at:HTMLElement|null=node;at;at=at.parentElement)observer?.observe(at,{attributes:true,attributeFilter:['hidden','inert','aria-hidden']});
        return ()=>{disposed=true;runtime.current=null;stopUi();observer?.disconnect();doc.removeEventListener('visibilitychange',sync);win?.removeEventListener('focus',sync);win?.removeEventListener('blur',sync);lease?.dispose();lease=null;};
    },[anchor,key]);
    useLayoutEffect(()=>runtime.current?.sync());
    return shown;
}
