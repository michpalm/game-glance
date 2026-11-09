import {parseHTML} from 'linkedom';
/** Synthetic nodes matching the verified Footer shape. No production adapter imports or real device data. */
export function nativeFooterFixture(svg=false,labels=['Menu','Select','Back']) {
    const glyph=svg?'<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3"/></svg>':'<img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">';
    const group=(label:string)=>`<div class="native-prompt"><div class="native-glyph">${glyph}</div><div class="native-label">${label}</div></div>`;
    const {document,window}=parseHTML(`<html><body><main id="home"></main><div id="Footer" style="position:absolute;display:flex"><div class="native-wrapper" style="display:flex">${group(labels[0])}<div class="native-spacer" style="flex-grow:1"></div>${labels.slice(1).map(group).join('')}</div></div></body></html>`);
    const root=document.getElementById('home')! as unknown as HTMLElement,footer=document.getElementById('Footer')! as unknown as HTMLElement,wrapper=footer.firstElementChild as HTMLElement;
    root.getBoundingClientRect=()=>({x:0,y:0,top:0,bottom:600,left:0,right:1000,width:1000,height:600} as DOMRect);
    footer.getBoundingClientRect=()=>({x:0,y:560,top:560,bottom:600,left:0,right:1000,width:1000,height:40} as DOMRect);
    return {document,window,root,footer,wrapper,spacer:wrapper.querySelector<HTMLElement>('.native-spacer')!,groups:[...wrapper.querySelectorAll<HTMLElement>('.native-prompt')]};
}
