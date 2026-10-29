export type HomeSearchPhase='hidden'|'top'|'editing';
export interface HomeSearchState {phase:HomeSearchPhase;draft:string;account:string|null}
export type HomeSearchEvent={type:'enter'}|{type:'edit'}|{type:'draft';text:string}|{type:'complete'}|{type:'content'}|{type:'suspend'}|{type:'account';account:string|null};
export function reduceHomeSearch(state:HomeSearchState,event:HomeSearchEvent):HomeSearchState {
    if(event.type==='account')return event.account===state.account?state:{phase:'hidden',draft:'',account:event.account};
    if(event.type==='draft')return state.phase!=='editing'||state.draft===event.text?state:{...state,draft:event.text};
    const phase=event.type==='enter'?(state.phase==='hidden'?'top':state.phase):event.type==='edit'?(state.phase==='top'?'editing':state.phase):event.type==='complete'?(state.phase==='editing'?'top':state.phase):'hidden';
    return phase===state.phase?state:{...state,phase};
}
export function homeSearchBounds(viewport:{width:number;height:number},status:{left:number;top:number;width:number;height:number},editing:boolean):{left:number;top:number;width:number}|null {
    if(![viewport.width,viewport.height,status.left,status.top,status.width,status.height].every(Number.isFinite)||viewport.width<=0||viewport.height<40)return null;
    const end=Math.min(viewport.width-12,status.left-12),available=end-12,min=editing?180:110;
    if(available<min)return null;
    const width=Math.min(editing?360:140,available),left=Math.max(12,Math.min((viewport.width-width)/2,end-width));
    return {left,top:Math.max(4,Math.min(status.top,viewport.height-36)),width};
}
/** A Home-local draft store. It has no provider, persistence or Social side effects. */
export function createHomeSearch(){
    let state:HomeSearchState={phase:'hidden',draft:'',account:null};const listeners=new Set<()=>void>();
    return {get:()=>state,subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},dispatch(event:HomeSearchEvent){const next=reduceHomeSearch(state,event);if(next===state)return;state=next;for(const fn of [...listeners])fn();}};
}
export type HomeSearchSession=ReturnType<typeof createHomeSearch>;
