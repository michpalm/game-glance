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
/** Where `list` should scroll so `row` keeps `unscaledInset` clear of its edges (the menu is drawn scaled); null: already clear. */
function revealTarget(list:HTMLElement,row:HTMLElement,unscaledInset:number):number|null {
    const bounds=list.getBoundingClientRect(),target=row.getBoundingClientRect();
    const scale=bounds.height/list.clientHeight;
    if(!Number.isFinite(scale)||scale<=0)return null;
    const inset=unscaledInset*scale;
    const delta=target.top<bounds.top+inset?target.top-bounds.top-inset:target.bottom>bounds.bottom-inset?target.bottom-bounds.bottom+inset:0;
    return delta?Math.max(0,Math.min(list.scrollHeight-list.clientHeight,list.scrollTop+delta/scale)):null;
}
function revealWithin(list:HTMLElement,row:HTMLElement,unscaledInset:number):void {
    const top=revealTarget(list,row,unscaledInset);
    if(top!==null)list.scrollTop=top;
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

/** A menu row: a setting's whole line (Look's Full and Clean sit on one) or a button group, else the button itself. */
const ROWS='.gg-menu-setting, .gg-plugin-buttons, .gg-menu-device';
const rowOf=(element:Element):Element=>element.closest(ROWS)??element;
/** Quick settings' focus targets: Steam Focusables (its sliders and pickers are no buttons). */
export const QUICK_FOCUSABLES='button, .Focusable';
/**
 * A settings page in the menu panel. Steam's focus scroll only brings the focused button into view, so the heading above
 * the first row stays hidden and notes below the last row can never be reached. After it settles, the first row takes the
 * panel to the very top, the last row to the very bottom, and other rows keep clear of its edges.
 */
/** How long after a focus change the panel's scroll is still Steam's focus animation (~200 ms on the Ally). */
export const FOCUS_SCROLL_SETTLE_MS=600;
/** How long the panel must be still before the correction glides: Steam's focus scroll has finished by then. */
export const QUIET_MS=80;
export function installPageScroll(panel:HTMLElement,focusables='button',{now=()=>Date.now()}:{now?:()=>number}={}):()=>void {
    let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,focused:HTMLElement|null=null,focusedAt=-Infinity,corrected=true;
    const target=():number|null=>{
        if(!focused?.isConnected)return null;
        // The first and last rows of the targets themselves: a grid's own Focusable holds others and is not one.
        const rows=[...panel.querySelectorAll(focusables)].filter(el=>!el.querySelector(focusables)).map(rowOf);
        const row=rowOf(focused);
        if(rows.length&&row===rows[0])return 0;
        if(rows.length&&row===rows[rows.length-1])return panel.scrollHeight-panel.clientHeight;
        return revealTarget(panel,focused,NOTIFICATION_FOCUS_INSET);
    };
    // One smooth glide, after Steam's own focus scroll has gone still: correcting during it fought it frame by frame
    // (choppy on the Ally). Then this focus's later scroll events (our glide's too) are left alone.
    const correct=()=>{
        timer=undefined;
        if(stopped)return;
        corrected=true;
        const top=target();
        if(top===null||Math.abs(top-panel.scrollTop)<0.5)return;
        if(typeof panel.scrollTo==='function')panel.scrollTo({top,behavior:'smooth'});else panel.scrollTop=top;
    };
    const settle=()=>{if(timer!==undefined)clearTimeout(timer);timer=setTimeout(correct,QUIET_MS);};
    const focus=(event:Event)=>{
        const element=(event.target as Element|null)?.closest?.<HTMLElement>(focusables);
        if(!element||!panel.contains(element))return;
        focused=element;focusedAt=now();corrected=false;
        settle();
    };
    const scrolled=()=>{if(!corrected&&now()-focusedAt<=FOCUS_SCROLL_SETTLE_MS)settle();};
    panel.addEventListener('focusin',focus);
    panel.addEventListener('scroll',scrolled);
    return ()=>{stopped=true;if(timer!==undefined)clearTimeout(timer);panel.removeEventListener('focusin',focus);panel.removeEventListener('scroll',scrolled);};
}
