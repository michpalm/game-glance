import type {KeyboardRect} from '../menu/keyboard/context';
export interface SearchOverlayLayout {left:number;top:number;width:number;listHeight:number;keyboardBand:KeyboardRect;scale:number;rowHeight:number}
export function searchOverlayLayout(p:{viewport:{width:number;height:number};scale:number;statusBottom:number;keyboards:readonly KeyboardRect[];rowHeight:number;editing?:boolean}):SearchOverlayLayout|null {
 const {width:w,height:h}=p.viewport,s=p.scale;
 if(![w,h,s,p.statusBottom,p.rowHeight].every(Number.isFinite)||w<=0||h<=0||s<=0||p.rowHeight<=0)return null;
 const width=Math.min(750*s,w-48*s),left=(w-width)/2,top=Math.max(24*s,p.statusBottom+16*s),overhead=140*s;
 const bandTop=top+overhead+p.rowHeight+8*s;
 if(width<180||bandTop>h-24*s)return null;
 const keyboardTop=Math.max(bandTop,Math.min(top+overhead+3*p.rowHeight+8*s,h-246));
 const band={left:12,top:keyboardTop,width:w-24,height:h-36-keyboardTop};
 let bottom=h-24*s;
 for(const b of p.keyboards)if(b.left<left+width&&b.left+b.width>left&&b.top>=bandTop-8*s)bottom=Math.min(bottom,b.top-8*s);
 if(p.editing&&!p.keyboards.length)bottom=Math.min(bottom,Math.max(bandTop,h-252));
 return {left,top,width,listHeight:Math.max(p.rowHeight,bottom-top-overhead),keyboardBand:band,scale:s,rowHeight:p.rowHeight};
}
export function resultWindow(p:{count:number;scrollTop:number;rowHeight:number;viewportHeight:number;focusedIndex:number}):{start:number;end:number;before:number;after:number;indices:readonly number[]} {
 const {count,rowHeight}=p;if(count<=0||rowHeight<=0)return {start:0,end:0,before:0,after:0,indices:[]};
 const start=Math.max(0,Math.min(count-1,Math.floor(p.scrollTop/rowHeight)-2)),end=Math.min(count,Math.max(start+1,Math.ceil((p.scrollTop+p.viewportHeight)/rowHeight)+2));
 const indices=Array.from({length:end-start},(_,i)=>start+i);if(p.focusedIndex>=0&&p.focusedIndex<count&&!indices.includes(p.focusedIndex))indices.push(p.focusedIndex);
 return {start,end,before:start*rowHeight,after:(count-end)*rowHeight,indices};
}
export function nextSearchResult(index:number|null,direction:'up'|'down',count:number):number|null {if(!count||direction==='up'&&(index===null||index===0))return null;return direction==='up'?index!-1:Math.min(count-1,(index??-1)+1);}
