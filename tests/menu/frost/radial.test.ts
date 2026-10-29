import {parseHTML} from 'linkedom';
import {expect,it} from 'vitest';
import {frostRegionElements} from '../../../src/menu/frost/host';
import {frostAllocation} from '../../../src/menu/frost/controller';
import {measureFrostFrame} from '../../../src/menu/frost/geometry';
import {EMPTY_REGION,REGION_IDS,type FrostFrame} from '../../../src/menu/frost/types';
it('finds body-portalled circles independently from the compact keyboard',()=>{
 const {document}=parseHTML('<html><body><div class="gg-menu"></div><div class="gg-radial-keyboard-host"><i data-gg-frost-region="keyboard-left"></i><i data-gg-frost-region="keyboard-right"></i></div></body></html>');
 const found=frostRegionElements(document as unknown as Document);
 expect(found.slice(-2).map(e=>e?.getAttribute('data-gg-frost-region'))).toEqual(['keyboard-left','keyboard-right']);
});
it('reserves the same two tile allocations when closed or open',()=>{
 const regions=Object.fromEntries(REGION_IDS.map(id=>[id,{...EMPTY_REGION}])) as FrostFrame['regions'];
 const f:FrostFrame={generation:1,context:{viewportId:'v',background:'game',outputWidth:1000,outputHeight:500,dpr:1,fit:'fit',colorMode:'sdr'},regions};
 const allocation=frostAllocation(f);
 f.regions['keyboard-left']={x:.012,y:.6,width:.15,height:.3,radiusX:.075,radiusY:.15};
 f.regions['keyboard-right']={x:.838,y:.6,width:.15,height:.3,radiusX:.075,radiusY:.15};
 expect(frostAllocation(f)).toBe(allocation);
 expect(JSON.parse(allocation)).toHaveLength(8);
});
it('measures actual circles without a rectangle across the chat',()=>{
 const {document}=parseHTML('<html><body><i id="v"></i>'+REGION_IDS.map(id=>`<i id="${id}"></i>`).join('')+'</body></html>');
 const elements=Object.fromEntries(REGION_IDS.map((id,i)=>{const e=document.getElementById(id)!;Object.defineProperties(e,{offsetWidth:{value:150},offsetHeight:{value:150}});e.getBoundingClientRect=()=>({left:id==='keyboard-right'?838:12,top:300,width:150,height:150} as DOMRect);return [id,e];}));
 const placeholder=document.getElementById('v')!;placeholder.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:500} as DOMRect);
 const view={innerWidth:1000,innerHeight:500,devicePixelRatio:1,getComputedStyle:()=>({borderTopLeftRadius:'50%',visibility:'visible'})} as unknown as Window;
 const f=measureFrostFrame({generation:1,source:view,owner:view,placeholder:placeholder as any,elements,context:{viewportId:'v',background:'game',outputWidth:1000,outputHeight:500,dpr:1,fit:'fit',colorMode:'sdr'}})!;
 expect(f.regions['keyboard-left']).toMatchObject({x:.012,width:.15,radiusX:.075,radiusY:.15});
 expect(f.regions['keyboard-right'].x).toBe(.838);
});
