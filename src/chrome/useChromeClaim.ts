import {type RefObject,useLayoutEffect,useRef,useState} from 'react';
import {chromeClaims,type ChromeClaim} from './claims';

/**
 * A page's claim on the chrome host while it is mounted (null: none). Claimed before paint (layout effect), so the host
 * takes the bar and footer in the commit the page mounts in; updated only when a value changes. `returnHome` is called
 * through the latest render's, so a new function each render is no change.
 */
export function useChromeClaim(value:ChromeClaim|null):void {
    const live=useRef(value);live.current=value;
    const handle=useRef<{claim:ReturnType<typeof chromeClaims.claim>;sent:ChromeClaim}|null>(null);
    const on=value!==null,back=!!value?.returnHome;
    useLayoutEffect(()=>{
        const current=live.current;if(!current)return undefined;
        const sent:ChromeClaim={page:current.page,statusHidden:current.statusHidden,launching:current.launching,...(back?{returnHome:()=>live.current?.returnHome?.()}:{})};
        handle.current={claim:chromeClaims.claim(sent),sent};
        return ()=>{handle.current?.claim.release();handle.current=null;};
    },[on,back]);
    useLayoutEffect(()=>{
        const held=handle.current;if(!held||!value)return;
        const {page,statusHidden,launching}=value,sent=held.sent;
        if(page===sent.page&&statusHidden===sent.statusHidden&&launching===sent.launching)return;
        held.sent={...sent,page,statusHidden,launching};held.claim.update({page,statusHidden,launching});
    });
}

/**
 * Whether the page's node is rendered: connected, not under [hidden], [inert] or aria-hidden, and with a box (not
 * display:none under another screen). Watched before paint, through its size and those attributes up the ancestor
 * chain; `key` re-binds when the node may have come or gone.
 */
export function usePageShown(anchor:RefObject<HTMLElement|null>,key:unknown=null):boolean {
    const [shown,setShown]=useState(false);
    useLayoutEffect(()=>{
        const node=anchor.current;if(!node){setShown(false);return undefined;}
        const win=node.ownerDocument.defaultView;let disposed=false,queued=false;
        const sync=()=>{if(disposed)return;const value=node.isConnected&&!node.closest('[hidden],[inert],[aria-hidden="true"]')&&(typeof node.getClientRects!=='function'||node.getClientRects().length>0);setShown(previous=>previous===value?previous:value);};
        const queue=()=>{if(disposed||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;sync();});};
        sync();
        const sized=win?.ResizeObserver?new win.ResizeObserver(queue):null;sized?.observe(node);
        const observer=win?.MutationObserver?new win.MutationObserver(queue):null;
        for(let at:HTMLElement|null=node;at;at=at.parentElement)observer?.observe(at,{attributes:true,attributeFilter:['hidden','inert','aria-hidden']});
        return ()=>{disposed=true;sized?.disconnect();observer?.disconnect();};
    },[anchor,key]);
    return shown;
}
