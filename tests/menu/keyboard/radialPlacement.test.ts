import {expect,it} from 'vitest';
import {radialBounds} from '../../../src/menu/keyboard/radialPlacement';
it.each([[829,467],[1500,845]])('keeps circles in opposite corners clear of compose at %s x %s',(width,height)=>{
 const f={left:width*.455,top:height*.75,width:width*.14,height:height*.13};
 const [l,r]=radialBounds({width,height},f)!;
 expect(l.left).toBe(12);expect(r.left+r.diameter).toBe(width-12);
 expect(l.top+l.diameter).toBe(height-42);expect(r.diameter).toBe(l.diameter);
 expect(l.left+l.diameter).toBeLessThanOrEqual(f.left);expect(r.left).toBeGreaterThanOrEqual(f.left+f.width);
});
it('shrinks for a corner compose field and refuses an unusably small viewport',()=>{
 const b=radialBounds({width:829,height:467},{left:170,top:300,width:100,height:70})!;
 expect(b[0].left+b[0].diameter).toBeLessThanOrEqual(170);
 expect(radialBounds({width:200,height:130},{left:80,top:60,width:50,height:60})).toBeNull();
});
