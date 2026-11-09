export interface ChatScrollAnchor { id?: string; offset: number; height: number; top: number }

/** Anchor to a message, not total height: a bounded page can prepend and trim equal amounts. */
export function captureChatAnchor(container: HTMLElement): ChatScrollAnchor {
    const bounds = container.getBoundingClientRect();
    const message = Array.from(container.querySelectorAll<HTMLElement>('[data-gg-message]')).find(element => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > bounds.top && rect.top < bounds.bottom;
    });
    return { id: message?.dataset.ggMessage, offset: message ? message.getBoundingClientRect().top - bounds.top : 0, height: container.scrollHeight, top: container.scrollTop };
}

export function restoreChatAnchor(container: HTMLElement, anchor: ChatScrollAnchor): void {
    const message = anchor.id ? Array.from(container.querySelectorAll<HTMLElement>('[data-gg-message]')).find(element => element.dataset.ggMessage === anchor.id) : undefined;
    container.scrollTop = message ? container.scrollTop + message.getBoundingClientRect().top - container.getBoundingClientRect().top - anchor.offset : anchor.top + container.scrollHeight - anchor.height;
}

/** Space for the 12px edge fade plus the menu's 4px outside focus outline. Units are unscaled list CSS pixels. */
export const FRIEND_FOCUS_INSET=20;
export const revealFriendRow=(list:HTMLElement,row:HTMLElement):void=>revealWithin(list,row,FRIEND_FOCUS_INSET);
function revealWithin(list:HTMLElement,row:HTMLElement,unscaledInset:number):void {
    const bounds=list.getBoundingClientRect(),target=row.getBoundingClientRect();
    const scale=bounds.height/list.clientHeight;
    if(!Number.isFinite(scale)||scale<=0)return;
    const inset=unscaledInset*scale;
    const delta=target.top<bounds.top+inset?target.top-bounds.top-inset:target.bottom>bounds.bottom-inset?target.bottom-bounds.bottom+inset:0;
    if(delta)list.scrollTop=Math.max(0,Math.min(list.scrollHeight-list.clientHeight,list.scrollTop+delta/scale));
}

/** Keep fades in sync with actual overflow, and let Steam finish its focus scroll before reserving outline space. */
export function installFriendScroll(list:HTMLElement):()=>void {
    const view=list.ownerDocument.defaultView;
    let stopped=false,frame:number|undefined,focused:HTMLElement|null=null;
    const edges=()=>{
        if(stopped)return;
        const top=String(list.scrollTop>1),bottom=String(list.scrollTop+list.clientHeight<list.scrollHeight-1);
        if(list.dataset.scrollTop!==top)list.dataset.scrollTop=top;
        if(list.dataset.scrollBottom!==bottom)list.dataset.scrollBottom=bottom;
    };
    const focus=(event:Event)=>{
        const row=(event.target as Element|null)?.closest?.<HTMLElement>('.gg-social-friend');
        if(!row||!list.contains(row))return;
        focused=row;
        if(frame!==undefined||!view?.requestAnimationFrame)return;
        frame=view.requestAnimationFrame(()=>{
            if(stopped)return;
            frame=view.requestAnimationFrame(()=>{frame=undefined;if(!stopped&&focused?.isConnected){revealFriendRow(list,focused);edges();}});
        });
    };
    list.addEventListener('scroll',edges,{passive:true});list.addEventListener('focusin',focus);
    const Resize=(view as (Window&{ResizeObserver?:typeof ResizeObserver})|null)?.ResizeObserver;
    const resize=Resize?new Resize(edges):undefined;resize?.observe(list);
    for(const child of Array.from(list.children))resize?.observe(child);
    const Mutation=(view as (Window&{MutationObserver?:typeof MutationObserver})|null)?.MutationObserver;
    const mutation=Mutation?new Mutation(records=>{if(records.some(record=>record.type==='childList'||record.type==='characterData'))edges();}):undefined;mutation?.observe(list,{childList:true,subtree:true,characterData:true});
    edges();
    return ()=>{stopped=true;if(frame!==undefined)view?.cancelAnimationFrame(frame);resize?.disconnect();mutation?.disconnect();list.removeEventListener('scroll',edges);list.removeEventListener('focusin',focus);delete list.dataset.scrollTop;delete list.dataset.scrollBottom;};
}

/** The menu panel's 24px padding plus the 4px focus outline. */
export const NOTIFICATION_FOCUS_INSET=28;
/** Steam's focus scroll leaves the heading hidden (scrollTop 46 on the Ally); after it settles, the heading button and
 * first row take the panel to the very top and other rows keep clear of its edges. */
export function installNotificationScroll(panel:HTMLElement):()=>void {
    const view=panel.ownerDocument.defaultView;
    let stopped=false,frame:number|undefined,focused:HTMLElement|null=null;
    const correct=()=>{
        if(stopped||!focused?.isConnected)return;
        const first=panel.querySelector('.gg-notification');
        if(focused.closest('.gg-menu-heading')||focused===first)panel.scrollTop=0;
        else revealWithin(panel,focused,NOTIFICATION_FOCUS_INSET);
    };
    const focus=(event:Event)=>{
        const target=(event.target as Element|null)?.closest?.<HTMLElement>('button, .gg-notification');
        if(!target||!panel.contains(target))return;
        focused=target;
        if(frame!==undefined||!view?.requestAnimationFrame)return;
        frame=view.requestAnimationFrame(()=>{if(!stopped)frame=view.requestAnimationFrame(()=>{frame=undefined;correct();});});
    };
    panel.addEventListener('focusin',focus);
    return ()=>{stopped=true;if(frame!==undefined)view?.cancelAnimationFrame(frame);panel.removeEventListener('focusin',focus);};
}
