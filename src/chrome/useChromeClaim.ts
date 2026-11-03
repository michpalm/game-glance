import {useLayoutEffect,useRef} from 'react';
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
